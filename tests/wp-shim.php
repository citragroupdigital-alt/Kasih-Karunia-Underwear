<?php
// Local test/preview only. Never include this file in the distributable plugin.
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
define('KKG_DIR', dirname(__DIR__) . '/wordpress/kk-grosir/');
if (!defined('KKG_URL')) { define('KKG_URL', '/'); }
if (!defined('KKG_VERSION')) { define('KKG_VERSION', '0.2.11'); }
define('KKG_LOCAL_PREVIEW', true);
$GLOBALS['kkg_test_options'] = array('kkg_settings' => array('mode' => 'staging'));
function get_option($k, $fallback = false) { return $GLOBALS['kkg_test_options'][$k] ?? $fallback; }
function update_option($k, $v, $autoload = false) { $GLOBALS['kkg_test_options'][$k] = $v; $GLOBALS['kkg_test_autoloads'][$k] = $autoload; return true; }
function delete_option($k) { unset($GLOBALS['kkg_test_options'][$k], $GLOBALS['kkg_test_autoloads'][$k]); return true; }
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
function get_privacy_policy_url() { return $GLOBALS['kkg_test_privacy_url'] ?? ''; }
function get_post_status($id = 0) { return $GLOBALS['kkg_test_post_statuses'][(int) $id] ?? 'publish'; }
function wp_date($format) { return date($format); }
function current_user_can($cap) { return $GLOBALS['kkg_test_can_manage'] ?? true; }
function is_page($id) { return $GLOBALS['kkg_test_is_page'] ?? true; }
function get_post_field($key, $id) { return $key === 'post_name' ? 'grosir' : '[kk_grosir]'; }
function has_shortcode($content, $tag) { return strpos($content, '['.$tag.']') !== false; }
function remove_action($hook, $cb, $prio = 10) { $GLOBALS['kkg_test_removed_actions'][] = array($hook, $cb, $prio); return true; }
function add_filter($hook, $cb, $prio = 10) {
    $GLOBALS['kkg_test_added_filters'][] = array($hook, $cb, $prio);
    $GLOBALS['kkg_test_filter_callbacks'][$hook][] = $cb;
    return true;
}
function apply_filters($hook, $value, ...$args) {
    foreach ($GLOBALS['kkg_test_filter_callbacks'][$hook] ?? array() as $cb) {
        if (is_callable($cb)) { $value = $cb($value, ...$args); }
    }
    return $value;
}
function wp_enqueue_style($h, $src = '', $deps = array(), $ver = false) { $GLOBALS['kkg_test_styles'][$h] = array($src, $deps, $ver); }
function wp_enqueue_script($h, $src = '', $deps = array(), $ver = false, $in_footer = false) { $GLOBALS['kkg_test_scripts'][$h] = array($src, $deps, $ver, $in_footer); }
function wp_add_inline_script($h, $data, $pos = 'after') { $GLOBALS['kkg_test_inline_scripts'][] = array($h, $data, $pos); }
function rest_url($path = '') { return 'https://example.test/wp-json/' . ltrim((string) $path, '/'); }
function wp_create_nonce($action = -1) { return 'nonce-' . $action; }
function __return_false() { return false; }
function __return_empty_array() { return array(); }
foreach (array('domain', 'settings', 'presentation', 'seo', 'testimonials') as $file) require_once KKG_DIR . 'includes/' . $file . '.php';
