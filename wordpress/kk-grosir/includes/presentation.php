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
function kkg_assets() {
    if (!kkg_is_page()) { return; }
    $s = kkg_settings();
    if ($s['mode'] === 'staging' && !current_user_can('manage_options')) { return; }
    if ($s['mode'] === 'active' && kkg_release_blockers($s)) { return; }
    wp_enqueue_style('kk-grosir', KKG_URL . 'assets/landing.css', array(), KKG_VERSION);
    wp_enqueue_script('kk-grosir', KKG_URL . 'assets/landing.js', array(), KKG_VERSION, true);
    wp_add_inline_script('kk-grosir', 'window.KKG=' . wp_json_encode(array(
        'endpoint' => rest_url('kk-offline/v1/handoff'),
        'fallback' => kkg_wa_url(), 'consentMode' => $s['privacy_reviewed'] ? $s['consent_mode'] : 'disabled',
        'policyVersion' => $s['policy_version'], 'nonce' => current_user_can('manage_options') ? wp_create_nonce('wp_rest') : '',
    ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';', 'before');
}
function kkg_image($key, $label, $priority = false) {
    $s = kkg_settings();
    if (wp_attachment_is_image($s[$key] ?? 0)) {
        echo wp_get_attachment_image($s[$key], 'large', false, array('alt' => $label,
            'loading' => $priority ? 'eager' : 'lazy', 'fetchpriority' => $priority ? 'high' : 'auto',
            'class' => 'kkg-photo', 'sizes' => $key === 'hero' || $key === 'about' ? '(max-width: 760px) 100vw, 50vw' : '(max-width: 600px) 50vw, 20vw'));
    } else {
        echo '<div class="kkg-placeholder" role="img" aria-label="' . esc_attr('Placeholder ' . $label) . '"><span class="kkg-placeholder-mark" aria-hidden="true">KK</span><span>' . esc_html($label) . '</span><small>Foto asli akan ditambahkan</small></div>';
    }
}
function kkg_cta($context, $secondary = false) {
    $url = kkg_wa_url();
    $class = 'kkg-button' . ($secondary ? ' kkg-button-light' : '');
    if (!$url) {
        echo '<button type="button" class="' . esc_attr($class) . '" disabled aria-describedby="kkg-setup">Minta Katalog Grosir <span aria-hidden="true">↗</span></button>';
    } else {
        echo '<a class="' . esc_attr($class) . '" href="' . esc_url($url) . '" data-kkg-cta="' . esc_attr($context) . '">Minta Katalog Grosir <span aria-hidden="true">↗</span></a>';
    }
}
function kkg_brand() {
    $s = kkg_settings();
    if (wp_attachment_is_image($s['logo'])) {
        echo wp_get_attachment_image($s['logo'], 'medium', false, array('class' => 'kkg-logo', 'alt' => 'CV. Kasih Karunia / KK Underwear'));
    } elseif (defined('KKG_URL') && file_exists(KKG_DIR . 'assets/logo-kk.webp')) {
        echo '<img class="kkg-logo" src="' . esc_url(KKG_URL . 'assets/logo-kk.webp') . '" alt="CV. Kasih Karunia / KK Underwear" width="640" height="480" decoding="async">';
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
