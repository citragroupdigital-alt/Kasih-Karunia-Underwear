<?php
defined('ABSPATH') || exit;

function kkg_api_permission($request, $private = false) {
    $s = kkg_settings();
    if ($s['mode'] === 'off') { return new WP_Error('kk_off', 'Integrasi belum aktif.', array('status' => 503)); }
    if (!is_ssl() && wp_get_environment_type() !== 'local') {
        return new WP_Error('kk_https', 'HTTPS wajib.', array('status' => 403));
    }
    if ($private) {
        $secret = kkg_get_sync_secret();
        $header = $request->get_header('authorization');
        if (strlen($secret) < 32 || !hash_equals('Bearer ' . $secret, (string) $header)) {
            return new WP_Error('kk_unauthorized', 'Tidak diizinkan.', array('status' => 401));
        }
    } else {
        if ($s['mode'] === 'staging' && !current_user_can('manage_options')) {
            return new WP_Error('kk_staging', 'Staging terbatas.', array('status' => 403));
        }
        $origin = $request->get_header('origin');
        $home = wp_parse_url(home_url());
        $expected = ($home['scheme'] ?? '') . '://' . ($home['host'] ?? '') . (isset($home['port']) ? ':' . $home['port'] : '');
        if ($origin !== $expected || stripos((string) $request->get_header('content-type'), 'application/json') !== 0 ||
            strlen((string) $request->get_body()) > 8192) {
            return new WP_Error('kk_request', 'Request tidak valid.', array('status' => 403));
        }
    }
    try {
        if (!kkg_rate_limit($private ? 'private' : 'public', $private ? 120 : 30)) {
            return new WP_Error('kk_rate', 'Coba lagi nanti.', array('status' => 429));
        }
    } catch (Throwable $e) {
        return new WP_Error('kk_unavailable', 'Layanan sementara tidak tersedia.', array('status' => 503));
    }
    return true;
}

function kkg_register_api() {
    register_rest_route('kk-offline/v1', '/handoff', array(
        'methods' => 'POST', 'permission_callback' => 'kkg_api_permission',
        'callback' => function ($request) {
            try {
                if (!kkg_wa_url()) { return new WP_Error('kk_phone', 'Nomor CS belum tersedia.', array('status' => 503)); }
                $input = kkg_validate_handoff($request->get_json_params(), kkg_settings());
                $reference = kkg_handoff_store($input);
                return new WP_REST_Response(array('reference_code' => $reference['reference_code'],
                    'expires_at' => kkg_iso($reference['expires_at']), 'wa_url' => kkg_wa_url($reference['reference_code'])));
            } catch (InvalidArgumentException $e) {
                return new WP_Error('kk_invalid', 'Data handoff tidak valid.', array('status' => 400));
            } catch (Throwable $e) {
                update_option('kkg_health', $e->getMessage() === 'capacity' ? 'Kapasitas 9.999 kode habis.' : 'Handoff gagal; periksa database.', false);
                return new WP_Error('kk_unavailable', 'Gunakan WhatsApp tanpa kode.', array('status' => 503));
            }
        },
    ));
    register_rest_route('kk-offline/v1', '/handoffs', array(
        'methods' => 'GET', 'permission_callback' => function ($r) { return kkg_api_permission($r, true); },
        'callback' => function ($request) {
            $cursor = (string) ($request->get_param('after_change_id') ?? '0');
            $limit = (string) ($request->get_param('limit') ?? '100');
            if (!ctype_digit($cursor) || strlen($cursor) > 15 || !ctype_digit($limit) || (int) $limit < 1 || (int) $limit > 100) {
                return new WP_Error('kk_invalid', 'Cursor/limit tidak valid.', array('status' => 400));
            }
            try { return new WP_REST_Response(kkg_sync_store((int) $cursor, (int) $limit)); }
            catch (Throwable $e) {
                return new WP_Error($e->getMessage() === 'cursor_expired' ? 'kk_cursor_expired' : 'kk_unavailable',
                    'Sinkronisasi perlu diperiksa admin.', array('status' => $e->getMessage() === 'cursor_expired' ? 410 : 503));
            }
        },
    ));
    register_rest_route('kk-offline/v1', '/reconcile', array(
        'methods' => 'POST', 'permission_callback' => function ($r) { return kkg_api_permission($r, true); },
        'callback' => function ($request) {
            $body = $request->get_json_params();
            if (!is_array($body) || !isset($body['purchases']) || !is_array($body['purchases']) ||
                count($body['purchases']) > 100 || strlen($request->get_body()) > 32768) {
                return new WP_Error('kk_invalid', 'Batch tidak valid.', array('status' => 400));
            }
            try {
                $validated = array();
                foreach ($body['purchases'] as $purchase) {
                    if (!is_array($purchase) || !kkg_valid_reference($purchase['reference_code'] ?? '') ||
                        !isset($purchase['key']) || !is_int($purchase['key']) || $purchase['key'] < 2) {
                        throw new InvalidArgumentException('invalid_purchase');
                    }
                    $paid = kkg_parse_utc($purchase['paid_at'] ?? '');
                    if ($paid > time()) { throw new InvalidArgumentException('future'); }
                    $validated[] = array($purchase['key'], $purchase['reference_code'], kkg_utc($paid));
                }
                $data = array();
                foreach ($validated as $p) {
                    $data[] = array_merge(array('key' => $p[0]), kkg_lookup_store($p[1], $p[2]));
                }
                return new WP_REST_Response(array('success' => true, 'data' => $data));
            } catch (InvalidArgumentException $e) {
                return new WP_Error('kk_invalid', 'Data pembayaran tidak valid.', array('status' => 400));
            } catch (Throwable $e) {
                return new WP_Error('kk_unavailable', 'Rekonsiliasi belum berhasil.', array('status' => 503));
            }
        },
    ));
}
