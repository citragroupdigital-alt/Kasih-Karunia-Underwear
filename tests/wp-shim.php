<?php
// Local test/preview only. Never include this file in the distributable plugin.
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
define('KKG_DIR', dirname(__DIR__) . '/wordpress/kk-grosir/');
if (!defined('KKG_URL')) { define('KKG_URL', '/'); }
if (!defined('KKG_VERSION')) { define('KKG_VERSION', '0.2.5'); }
define('KKG_LOCAL_PREVIEW', true);
$GLOBALS['kkg_test_options'] = array('kkg_settings' => array('mode' => 'staging'));
function get_option($k, $fallback = false) { return $GLOBALS['kkg_test_options'][$k] ?? $fallback; }
function update_option($k, $v, $autoload = false) { $GLOBALS['kkg_test_options'][$k] = $v; return true; }
function wp_salt($scheme) { return 'local-test-salt-only-not-for-production'; }
function wp_json_encode($v, $flags = 0) { return json_encode($v, $flags); }
function esc_html($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
function esc_attr($v) { return esc_html($v); }
function esc_url($v) { return esc_html($v); }
function home_url($path = '') {
    $base = $GLOBALS['kkg_test_home_url'] ?? 'https://example.test';
    if ($path === '') { return $base; }
    return rtrim($base, '/') . '/' . ltrim((string) $path, '/');
}
function get_permalink($post = 0) {
    $id = is_object($post) ? ($post->ID ?? 0) : (int) $post;
    return $GLOBALS['kkg_test_permalinks'][$id] ?? '';
}
function wp_attachment_is_image($id) { return !empty($GLOBALS['kkg_test_attachments'][(int) $id]); }
function wp_get_attachment_image() { return ''; }
function wp_get_attachment_image_url($id, $size = 'thumbnail') { return $GLOBALS['kkg_test_attachments'][(int) $id] ?? false; }
function get_privacy_policy_url() { return ''; }
function wp_date($format) { return date($format); }
function current_user_can($cap) { return $GLOBALS['kkg_test_can_manage'] ?? true; }
function is_page($id) { return $GLOBALS['kkg_test_is_page'] ?? true; }
function get_post_field($key, $id) { return $key === 'post_name' ? 'grosir' : '[kk_grosir]'; }
function has_shortcode($content, $tag) { return strpos($content, '['.$tag.']') !== false; }
function remove_action($hook, $cb, $prio = 10) { $GLOBALS['kkg_test_removed_actions'][] = array($hook, $cb, $prio); return true; }
function add_filter($hook, $cb, $prio = 10) { $GLOBALS['kkg_test_added_filters'][] = array($hook, $cb, $prio); return true; }
foreach (array('domain', 'settings', 'presentation', 'seo', 'testimonials') as $file) require_once KKG_DIR . 'includes/' . $file . '.php';
