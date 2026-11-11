<?php
defined('ABSPATH') || exit;

function kkg_reference($timestamp, $sequence) {
    if ($sequence < 1 || $sequence > 9999) {
        throw new RuntimeException('capacity');
    }
    $date = (new DateTimeImmutable('@' . $timestamp))->setTimezone(new DateTimeZone('Asia/Jakarta'));
    return 'KK-GA' . $date->format('y') . sprintf('%04d', $sequence);
}

function kkg_valid_reference($value) {
    return is_string($value) && preg_match('/^KK-GA\d{2}(?!0000)\d{4}$/D', $value);
}

function kkg_utc($timestamp) { return gmdate('Y-m-d H:i:s', $timestamp); }
function kkg_iso($value) { return str_replace(' ', 'T', $value) . 'Z'; }

function kkg_parse_utc($value) {
    if (!is_string($value)) { throw new InvalidArgumentException('invalid_time'); }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z', $value, new DateTimeZone('UTC'));
    if (!$date || $date->format('Y-m-d\TH:i:s\Z') !== $value) {
        throw new InvalidArgumentException('invalid_time');
    }
    return $date->getTimestamp();
}

function kkg_validate_handoff($body, $settings) {
    if (!is_array($body) || strlen(json_encode($body)) > 8192) {
        throw new InvalidArgumentException('invalid_body');
    }
    $allowed = array('request_id', 'token', 'cta_context', 'landing_path', 'consent', 'click');
    if (array_diff(array_keys($body), $allowed)) { throw new InvalidArgumentException('unknown_fields'); }
    $context = $body['cta_context'] ?? '';
    if (!in_array($context, array('header', 'hero', 'category', 'sticky', 'final_cta', 'footer'), true) ||
        ($body['landing_path'] ?? '') !== '/grosir/' ||
        !is_string($body['request_id'] ?? null) ||
        !preg_match('/^[a-f0-9-]{36,64}$/D', $body['request_id'])) {
        throw new InvalidArgumentException('invalid_context');
    }
    $consent = $body['consent'] ?? array();
    if (!is_array($consent) || ($consent['version'] ?? '') !== $settings['policy_version']) {
        throw new InvalidArgumentException('invalid_consent');
    }
    $storage = !empty($settings['privacy_reviewed']) && ($consent['storage'] ?? false) === true;
    $ads = !empty($settings['privacy_reviewed']) && ($consent['advertising'] ?? false) === true;
    $token = $body['token'] ?? '';
    if (!is_string($token) || ($token !== '' && !preg_match('/^[a-f0-9]{64}$/D', $token))) {
        throw new InvalidArgumentException('invalid_token');
    }
    $click = array('gclid' => '', 'gbraid' => '', 'wbraid' => '');
    if ($ads) {
        $input = $body['click'] ?? array();
        if (!is_array($input) || array_diff(array_keys($input), array_keys($click))) {
            throw new InvalidArgumentException('invalid_click');
        }
        foreach ($click as $key => $unused) {
            $value = $input[$key] ?? '';
            if (!is_string($value) || strlen($value) > 512 ||
                ($value !== '' && !preg_match('/^[A-Za-z0-9_-]+$/D', $value))) {
                throw new InvalidArgumentException('invalid_click');
            }
            $click[$key] = $value;
        }
    }
    return array('request_id' => $body['request_id'], 'token' => $storage ? $token : '',
        'cta_context' => $context, 'click' => $click,
        'consent' => array('storage' => $storage, 'advertising' => $ads, 'version' => $settings['policy_version']));
}

function kkg_wa_url($code = '') {
    $settings = kkg_settings();
    if (!preg_match('/^62\d{8,13}$/D', $settings['phone'])) { return ''; }
    $message = $settings['message'];
    if ($code) {
        $message = str_replace('{reference}', 'Kode Referensi: ' . $code, $message);
    } else {
        $message = preg_replace("/\r?\n[ \t]*\{reference\}[ \t]*(?=\r?\n|$)/", '', $message);
        $message = str_replace('{reference}', '', $message);
    }
    return 'https://wa.me/' . $settings['phone'] . '?text=' . rawurlencode(trim($message));
}
