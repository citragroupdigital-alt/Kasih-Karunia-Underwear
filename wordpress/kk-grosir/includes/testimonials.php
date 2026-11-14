<?php
defined('ABSPATH') || exit;

/**
 * Resolve a safe relative WebP testimonial asset inside KKG_DIR to its URL.
 */
function kkg_testimonial_asset_url($rel) {
    $rel = ltrim(str_replace('\\', '/', (string) $rel), '/');
    if ($rel === '' || strpos($rel, '..') !== false || !preg_match('/^assets\/testimonials\/[a-z0-9][a-z0-9\-]*\.webp$/', $rel)) {
        return '';
    }
    $path = rtrim(KKG_DIR, '/\\') . '/' . $rel;
    if (!is_file($path)) {
        return '';
    }
    return rtrim(KKG_URL, '/') . '/' . $rel;
}

/**
 * Sanitize and normalize a single testimonial item into the carousel/lightbox contract.
 */
function kkg_normalize_testimonial($raw) {
    if (!is_array($raw)) {
        return null;
    }

    $id = preg_replace('/[^a-z0-9\-]/', '', strtolower((string) ($raw['id'] ?? '')));
    $name = trim((string) ($raw['name'] ?? ''));
    $category = trim((string) ($raw['category'] ?? ''));
    $quote = trim((string) ($raw['quote'] ?? ''));
    $initials = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', (string) ($raw['initials'] ?? $name)), 0, 2));
    $order_highlight = trim((string) ($raw['order_highlight'] ?? ''));
    $preview_pos = trim((string) ($raw['preview_position'] ?? '50% top'));
    if (!preg_match('/^[0-9]{1,3}%\s+(?:top|center|bottom|[0-9]{1,3}%)$/', $preview_pos)) {
        $preview_pos = '50% top';
    }

    $images = array();
    foreach ((array) ($raw['chat_proof_images'] ?? array()) as $idx => $img) {
        if (!is_array($img)) {
            continue;
        }
        $url = !empty($img['url']) ? esc_url_raw((string) $img['url']) : kkg_testimonial_asset_url($img['rel'] ?? '');
        if ($url === '') {
            continue;
        }
        $w = isset($img['width']) ? (int) $img['width'] : 460;
        $h = isset($img['height']) ? (int) $img['height'] : 920;
        $images[] = array(
            'url' => $url,
            'alt' => trim((string) ($img['alt'] ?? '')) ?: sprintf('Bukti chat WhatsApp testimoni %s (%d)', $name ?: 'mitra', $idx + 1),
            'width' => $w > 0 ? $w : 460,
            'height' => $h > 0 ? $h : 920,
        );
    }

    if ($id === '' || $name === '' || $quote === '' || empty($images)) {
        return null;
    }

    return array(
        'id' => $id,
        'name' => $name,
        'category' => $category ?: 'Mitra Grosir',
        'quote' => $quote,
        'initials' => $initials ?: 'KK',
        'order_highlight' => $order_highlight,
        'preview_position' => $preview_pos,
        'chat_proof_images' => $images,
        'is_verified' => !empty($raw['is_verified']),
        'is_approved_for_publication' => !empty($raw['is_approved_for_publication']),
        'is_placeholder' => !empty($raw['is_placeholder']),
    );
}

/**
 * Verified and publication-approved WhatsApp testimonial records.
 */
function kkg_testimonials_data() {
    return array(
        array(
            'id' => 'cv-anindiya',
            'name' => 'Bunda Lusi — CV. Anindiya',
            'category' => 'Mitra Usaha',
            'quote' => 'Alhamdulillah mas. Saya senang dengan pelayanannya yang cepat dan ramah.',
            'initials' => 'CA',
            'order_highlight' => 'Produk LaParis & Pelayanan CS',
            'preview_position' => '50% 20%',
            'chat_proof_images' => array(
                array(
                    'rel' => 'assets/testimonials/chat-cv-anindiya.webp',
                    'alt' => 'Bukti chat WhatsApp testimoni Bunda Lusi CV. Anindiya mengenai pelayanan yang cepat dan ramah',
                    'width' => 460,
                    'height' => 920,
                ),
            ),
            'is_verified' => true,
            'is_approved_for_publication' => true,
            'is_placeholder' => false,
        ),
        array(
            'id' => 'bunda-hidayati',
            'name' => 'Bunda Hidayati',
            'category' => 'Mitra Grosir',
            'quote' => 'La Paris keren banget, pokoknya nggak ada yang jelek produknya.',
            'initials' => 'BH',
            'order_highlight' => 'Pesanan Kaos Kaki LaParis',
            'preview_position' => '50% 56%',
            'chat_proof_images' => array(
                array(
                    'rel' => 'assets/testimonials/chat-bunda-hidayati.webp',
                    'alt' => 'Bukti chat WhatsApp testimoni Bunda Hidayati untuk produk kaos kaki LaParis dengan resi dan kata sensitif disensor',
                    'width' => 460,
                    'height' => 920,
                ),
            ),
            'is_verified' => true,
            'is_approved_for_publication' => true,
            'is_placeholder' => false,
        ),
        array(
            'id' => 'algo-jaya',
            'name' => 'Pak Irfan — Algo Jaya',
            'category' => 'Pelanggan Langganan',
            'quote' => 'Bahan bagus, jahitan rapih, ukuran dewasa pas. Sudah jadi langganan juga.',
            'initials' => 'IJ',
            'order_highlight' => 'Pelanggan Repeat Order · Algo Jaya',
            'preview_position' => '50% 66%',
            'chat_proof_images' => array(
                array(
                    'rel' => 'assets/testimonials/chat-algo-jaya.webp',
                    'alt' => 'Bukti chat WhatsApp testimoni Pak Irfan Algo Jaya tentang bahan bagus, jahitan rapih, dan langganan',
                    'width' => 460,
                    'height' => 920,
                ),
            ),
            'is_verified' => true,
            'is_approved_for_publication' => true,
            'is_placeholder' => false,
        ),
    );
}

/**
 * Return only verified and publication-approved testimonials for public display,
 * or verified redacted items to manage_options admins while in staging mode.
 */
function kkg_visible_testimonials($s = null, $override_items = null) {
    $s = is_array($s) ? $s : kkg_settings();
    $raw_items = is_array($override_items) ? $override_items : kkg_testimonials_data();
    if ($override_items === null && function_exists('apply_filters')) {
        $raw_items = (array) apply_filters('kkg_testimonials_items', $raw_items, $s);
    }

    $normalized = array();
    foreach ($raw_items as $raw) {
        $item = kkg_normalize_testimonial($raw);
        if ($item !== null) {
            $normalized[] = $item;
        }
    }

    $public = array_values(array_filter($normalized, static function ($item) {
        return empty($item['is_placeholder']) && !empty($item['is_verified']) && !empty($item['is_approved_for_publication']);
    }));

    if ($public) {
        return $public;
    }

    $is_staging_admin = ($s['mode'] ?? 'off') === 'staging' && current_user_can('manage_options');
    if (!$is_staging_admin) {
        return array();
    }

    // In admin-only staging mode, expose verified redacted candidates so owners can review them before approval.
    return array_values(array_filter($normalized, static function ($item) {
        return empty($item['is_placeholder']) && !empty($item['is_verified']);
    }));
}

/**
 * Small inline SVG icons dedicated to the testimonial carousel and lightbox UI.
 */
function kkg_testimonial_icon($name, $size = 16) {
    $icons = array(
        'zoom-in' => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>',
    );
    if (!isset($icons[$name])) {
        return '';
    }
    $s = max(12, (int) $size);
    return '<svg class="kkg-svg" width="' . $s . '" height="' . $s . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $icons[$name] . '</svg>';
}
