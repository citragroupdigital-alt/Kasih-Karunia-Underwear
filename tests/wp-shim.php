<?php
// Local test/preview only. Never include this file in the distributable plugin.
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
define('KKG_DIR', dirname(__DIR__) . '/wordpress/kk-grosir/');
if (!defined('KKG_URL')) { define('KKG_URL', '/'); }
define('KKG_LOCAL_PREVIEW', true);
$GLOBALS['kkg_test_options'] = array('kkg_settings' => array('mode' => 'staging'));
function get_option($k, $fallback = false) { return $GLOBALS['kkg_test_options'][$k] ?? $fallback; }
function update_option($k, $v, $autoload = false) { $GLOBALS['kkg_test_options'][$k] = $v; return true; }
function wp_salt($scheme) { return 'local-test-salt-only-not-for-production'; }
function wp_json_encode($v, $flags = 0) { return json_encode($v, $flags); }
function esc_html($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
function esc_attr($v) { return esc_html($v); }
function esc_url($v) { return esc_html($v); }
function wp_attachment_is_image($id) { return false; }
function wp_get_attachment_image() { return ''; }
function get_privacy_policy_url() { return ''; }
function wp_date($format) { return date($format); }
function current_user_can($cap) { return true; }
function is_page($id) { return true; }
function get_post_field($key, $id) { return $key === 'post_name' ? 'grosir' : '[kk_grosir]'; }
function has_shortcode($content, $tag) { return strpos($content, '['.$tag.']') !== false; }
foreach (array('domain', 'settings', 'presentation') as $file) require_once KKG_DIR . 'includes/' . $file . '.php';
