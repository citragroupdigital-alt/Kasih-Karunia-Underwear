<?php
/**
 * Plugin Name: KK Grosir Landing & Offline Attribution
 * Description: Landing grosir terisolasi, handoff WhatsApp dan dataset Purchase offline.
 * Version: 0.2.10
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 */
defined('ABSPATH') || exit;
define('KKG_VERSION', '0.2.10');
define('KKG_DIR', plugin_dir_path(__FILE__));
define('KKG_URL', plugin_dir_url(__FILE__));
foreach (array('domain', 'settings', 'store', 'api', 'presentation', 'seo', 'testimonials') as $module) {
    require_once KKG_DIR . 'includes/' . $module . '.php';
}
register_activation_hook(__FILE__, 'kkg_install');
register_deactivation_hook(__FILE__, function () { wp_clear_scheduled_hook('kkg_cleanup'); });
add_action('kkg_cleanup', 'kkg_cleanup');
add_action('admin_menu', 'kkg_admin_menu');
add_action('admin_enqueue_scripts', 'kkg_admin_assets');
add_action('admin_post_kkg_settings', 'kkg_save_settings');
add_action('admin_post_kkg_erase', 'kkg_handle_erase');
add_action('rest_api_init', 'kkg_register_api');
add_shortcode('kk_grosir', 'kkg_render');
add_filter('template_include', 'kkg_template', 99);
add_action('wp_enqueue_scripts', 'kkg_assets');
add_filter('script_loader_tag', 'kkg_script_loader_tag', 10, 2);
add_filter('wp_inline_script_attributes', 'kkg_inline_script_attributes');
add_action('wp', 'kkg_seo_page_isolation', 99);
add_filter('language_attributes', 'kkg_seo_language_attributes', 99);
add_filter('pre_get_document_title', 'kkg_seo_filter_title', 999);
add_action('wp_head', 'kkg_seo_wp_head', 1);
add_filter('rest_post_dispatch', function ($response, $server, $request) {
    if (strpos($request->get_route(), '/kk-offline/v1/') === 0) {
        $response->header('Cache-Control', 'private, no-store, max-age=0');
        $response->header('Pragma', 'no-cache');
    }
    return $response;
}, 10, 3);
