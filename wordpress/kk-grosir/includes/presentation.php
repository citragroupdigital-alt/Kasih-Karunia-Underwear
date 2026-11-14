<?php
defined('ABSPATH') || exit;

function kkg_is_page() {
    $s = kkg_settings();
    return $s['mode'] !== 'off' && $s['page_id'] > 0 && is_page($s['page_id']) &&
        get_post_field('post_name', $s['page_id']) === 'grosir' &&
        has_shortcode(get_post_field('post_content', $s['page_id']), 'kk_grosir');
}
function kkg_template($template) {
    if (!kkg_is_page()) { return $template; }
    $s = kkg_settings();
    if ($s['mode'] === 'staging' && !current_user_can('manage_options')) {
        wp_die('Halaman sedang dipersiapkan.', 'KK Underwear', array('response' => 503));
    }
    if ($s['mode'] === 'active' && kkg_release_blockers($s)) {
        wp_die('Halaman sedang dipersiapkan.', 'KK Underwear', array('response' => 503));
    }
    if ($s['mode'] === 'staging') { nocache_headers(); }
    return KKG_DIR . 'templates/page.php';
}
function kkg_consent_mode($s = null) {
    $s = is_array($s) ? $s : kkg_settings();
    $mode = $s['consent_mode'] ?? 'disabled';
    return !empty($s['privacy_reviewed']) && in_array($mode, array('standalone', 'external'), true) ? $mode : 'disabled';
}
function kkg_assets() {
    if (!kkg_is_page()) { return; }
    $s = kkg_settings();
    if ($s['mode'] === 'staging' && !current_user_can('manage_options')) { return; }
    if ($s['mode'] === 'active' && kkg_release_blockers($s)) { return; }
    $consent_mode = kkg_consent_mode($s);
    wp_enqueue_style('kk-grosir', KKG_URL . 'assets/landing.css', array(), KKG_VERSION);
    wp_enqueue_script('kk-grosir', KKG_URL . 'assets/landing.js', array(), KKG_VERSION, true);
    wp_add_inline_script('kk-grosir', 'window.KKG=' . wp_json_encode(array(
        'endpoint' => rest_url('kk-offline/v1/handoff'),
        'fallback' => kkg_wa_url(), 'consentMode' => $consent_mode,
        'policyVersion' => $s['policy_version'], 'nonce' => current_user_can('manage_options') ? wp_create_nonce('wp_rest') : '',
    ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';', 'before');
    if ($consent_mode === 'external') {
        wp_enqueue_script('kk-grosir-cookiebot', KKG_URL . 'assets/cookiebot-bridge.js', array('kk-grosir'), KKG_VERSION, true);
    }
}
function kkg_script_loader_tag($tag, $handle) {
    if (!in_array($handle, array('kk-grosir', 'kk-grosir-cookiebot'), true) ||
        !kkg_is_page() || kkg_consent_mode() !== 'external' ||
        strpos($tag, 'data-cookieconsent=') !== false) {
        return $tag;
    }
    return preg_replace('/<script(?=\s)/', '<script data-cookieconsent="ignore"', $tag, 1) ?? $tag;
}
function kkg_inline_script_attributes($attributes) {
    if (($attributes['id'] ?? '') === 'kk-grosir-js-before' &&
        kkg_is_page() && kkg_consent_mode() === 'external' &&
        !isset($attributes['data-cookieconsent'])) {
        $attributes['data-cookieconsent'] = 'ignore';
    }
    return $attributes;
}
function kkg_image($key, $label, $priority = false, $alt = '') {
    $s = kkg_settings();
    $sizes = $key === 'hero' || $key === 'about' ? '(max-width: 760px) 100vw, 50vw' : '(max-width: 600px) 50vw, 20vw';
    $alt_text = $alt ?: $label;
    $cls = 'kkg-photo' . ($key === 'hero' ? ' kkg-hero-photo' : ($key === 'about' ? ' kkg-about-photo' : ''));
    if (wp_attachment_is_image($s[$key] ?? 0)) {
        echo wp_get_attachment_image($s[$key], 'large', false, array('alt' => $alt_text,
            'loading' => $priority ? 'eager' : 'lazy', 'fetchpriority' => $priority ? 'high' : 'auto',
            'class' => $cls, 'sizes' => $sizes));
    } elseif (($bundled = kkg_bundled_asset($key)) && defined('KKG_URL')) {
        echo '<img class="' . esc_attr($cls) . '" src="' . esc_url(KKG_URL . $bundled['rel']) . '" alt="' . esc_attr($alt_text) . '" width="' . (int) $bundled['width'] . '" height="' . (int) $bundled['height'] . '" loading="' . ($priority ? 'eager' : 'lazy') . '" fetchpriority="' . ($priority ? 'high' : 'auto') . '" decoding="async" sizes="' . esc_attr($sizes) . '">';
    } else {
        echo '<div class="kkg-placeholder" role="img" aria-label="' . esc_attr('Placeholder ' . $label) . '"><span class="kkg-placeholder-mark" aria-hidden="true">KK</span><span>' . esc_html($label) . '</span><small>Foto asli akan ditambahkan</small></div>';
    }
}
function kkg_icon($name, $size = 20) {
    $paths = array(
        'shield-check' => '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
        'tag' => '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
        'truck' => '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
        'headset' => '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
        'arrow-up-right' => '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
        'chevron-down' => '<path d="m6 9 6 6 6-6"/>',
        'chevron-left' => '<path d="m15 18-6-6 6-6"/>',
        'chevron-right' => '<path d="m9 18 6-6-6-6"/>',
        'x' => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        'cookie' => '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
        'map-pin' => '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
        'message-circle' => '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
        'shopping-bag' => '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        'circle-check' => '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
        'phone' => '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
        'user' => '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    );
    if (!isset($paths[$name])) { return ''; }
    $s = (int) $size;
    return '<svg class="kkg-svg" width="' . $s . '" height="' . $s . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $paths[$name] . '</svg>';
}
function kkg_cta($context, $secondary = false) {
    $url = kkg_wa_url();
    $class = 'kkg-button' . ($secondary ? ' kkg-button-light' : '');
    $icon = kkg_icon('arrow-up-right', 18);
    if (!$url) {
        echo '<button type="button" class="' . esc_attr($class) . '" disabled aria-label="Minta Katalog Grosir, nomor WhatsApp CS belum tersedia">Minta Katalog Grosir <span class="kkg-btn-icon" aria-hidden="true">' . $icon . '</span></button>';
    } else {
        echo '<a class="' . esc_attr($class) . '" href="' . esc_url($url) . '" data-kkg-cta="' . esc_attr($context) . '">Minta Katalog Grosir <span class="kkg-btn-icon" aria-hidden="true">' . $icon . '</span></a>';
    }
}
function kkg_brand() {
    $s = kkg_settings();
    if (wp_attachment_is_image($s['logo'])) {
        echo wp_get_attachment_image($s['logo'], 'medium', false, array('class' => 'kkg-logo', 'alt' => 'CV. Kasih Karunia / KK Underwear'));
    } elseif (($logo = kkg_bundled_asset('logo')) && defined('KKG_URL')) {
        echo '<img class="kkg-logo" src="' . esc_url(KKG_URL . $logo['rel']) . '" alt="CV. Kasih Karunia / KK Underwear" width="' . (int) $logo['width'] . '" height="' . (int) $logo['height'] . '" decoding="async">';
    } else {
        echo '<span class="kkg-wordmark">KK<span>UNDERWEAR<small>CV. Kasih Karunia</small></span></span>';
    }
}
function kkg_render() {
    $s = kkg_settings();
    if ($s['mode'] === 'off' || (!kkg_is_page() && !defined('KKG_LOCAL_PREVIEW'))) { return ''; }
    if ($s['mode'] === 'staging' && !current_user_can('manage_options')) { return ''; }
    ob_start();
    require KKG_DIR . 'templates/landing.php';
    return ob_get_clean();
}
