<?php
require __DIR__ . '/wp-shim.php';
$checks = 0;
function check($condition, $label) {
    global $checks; $checks++;
    if (!$condition) { throw new RuntimeException('FAIL: ' . $label); }
}
function rejects($fn, $label) {
    try { $fn(); } catch (Throwable $e) { check(true, $label); return; }
    check(false, $label);
}
check(kkg_reference(strtotime('2026-12-31T16:59:59Z'), 1) === 'KK-GA260001', 'year WIB before rollover');
check(kkg_reference(strtotime('2026-12-31T17:00:00Z'), 1) === 'KK-GA270001', 'year WIB after rollover');
check(kkg_reference(time(), 9999) !== '', 'capacity last number');
rejects(function () { kkg_reference(time(), 10000); }, 'capacity guard');
rejects(function () { kkg_reference(time(), 0); }, 'zero sequence');
foreach (array('KK-GA2601', 'KK-GA260000', 'KK-GA2610000', 'kk-ga260001', "KK-GA260001\n") as $bad) check(!kkg_valid_reference($bad), 'reference format rejected');
check(kkg_valid_reference('KK-GA260001'), 'valid ref');
rejects(function () { kkg_parse_utc('2026-02-30T00:00:00Z'); }, 'invalid calendar date');
rejects(function () { kkg_parse_utc('2026-11-11T00:00:00'); }, 'timezone mandatory');
$s = kkg_settings(); $s['privacy_reviewed'] = 1;
$body = array('request_id' => str_repeat('a',48), 'token' => str_repeat('b',64), 'cta_context' => 'hero',
    'landing_path' => '/grosir/', 'consent' => array('version'=>'draft-1','storage'=>true,'advertising'=>true),
    'click' => array('gclid'=>'test-click-1'));
$input = kkg_validate_handoff($body, $s);
check($input['click']['gclid'] === 'test-click-1' && strlen($input['token']) === 64, 'authorized capture');
$s['privacy_reviewed'] = 0; $input = kkg_validate_handoff($body, $s);
check($input['click']['gclid'] === '' && $input['token'] === '', 'audit gate');
$s['privacy_reviewed'] = 1; $body['consent']['advertising'] = false;
check(kkg_validate_handoff($body, $s)['click']['gclid'] === '', 'denied ads discarded');
$body['reference_code'] = 'KK-GA260001';
rejects(function () use ($body, $s) { kkg_validate_handoff($body, $s); }, 'browser reference forbidden');
unset($body['reference_code']); $body['landing_path'] = '/grosir/?phone=private';
rejects(function () use ($body, $s) { kkg_validate_handoff($body, $s); }, 'no URL personal data');
$body['landing_path'] = '/grosir/';
foreach (array('header', 'hero', 'category', 'sticky', 'final_cta', 'footer') as $ctx) {
    $body['cta_context'] = $ctx;
    check(kkg_validate_handoff($body, $s)['cta_context'] === $ctx, 'allowed context ' . $ctx);
}
$body['cta_context'] = 'unknown';
rejects(function () use ($body, $s) { kkg_validate_handoff($body, $s); }, 'unknown context rejected');
$body['cta_context'] = 'hero'; $body['consent']['advertising'] = true; $body['click'] = array('gclid' => 'bad<script>');
rejects(function () use ($body, $s) { kkg_validate_handoff($body, $s); }, 'invalid click chars rejected');
check(kkg_settings()['phone'] === '62895339293140', 'official WA CS default');
$waDefault = kkg_wa_url('KK-GA260001');
check(strpos($waDefault, 'https://wa.me/62895339293140?text=') === 0 && strpos($waDefault, 'KK-GA260001') !== false, 'WA URL uses official CS number and ref code');
$GLOBALS['kkg_test_options']['kkg_settings']['phone'] = '';
check(kkg_wa_url() === '', 'missing number no fabricated URL');
$GLOBALS['kkg_test_options']['kkg_settings']['phone'] = '6281234567890';
$waWithCode = kkg_wa_url('KK-GA260001');
check(strpos($waWithCode, 'https://wa.me/6281234567890?text=') === 0 && strpos($waWithCode, 'KK-GA260001') !== false, 'WA URL contains ref code');
$waFallback = urldecode(kkg_wa_url(''));
check(strpos($waFallback, "\n\n") === false && strpos($waFallback, '{reference}') === false, 'fallback WA URL has clean newlines');
$blockers = kkg_release_blockers(kkg_settings());
check(count($blockers) >= 7 && in_array('assets_reviewed', $blockers, true), 'release blocked cleanly by review and setup gates');
$seoStaging = kkg_settings(); $seoStaging['mode'] = 'staging';
check(strpos(kkg_seo_robots($seoStaging), 'noindex') !== false, 'staging robots noindex');
check(strpos(kkg_seo_title_text(), 'Pakaian Dalam Surabaya') !== false && strlen(kkg_seo_title_text()) <= 65, 'SEO title contains core keyword');
check(strlen(kkg_seo_description()) >= 120 && strlen(kkg_seo_description()) <= 165, 'SEO meta description length');
$ld = kkg_seo_json_ld($seoStaging);
check(count($ld['@graph']) === 5, 'JSON-LD graph has 5 nodes');
check($ld['@graph'][0]['address']['addressLocality'] === 'Surabaya', 'Verified Surabaya locality in Schema');
check(!isset($ld['@graph'][0]['address']['streetAddress']), 'No fabricated streetAddress when address empty');
$seoWithAddr = $seoStaging; $seoWithAddr['address'] = 'Jl. Contoh Terverifikasi No. 1';
$ldAddr = kkg_seo_json_ld($seoWithAddr);
check(($ldAddr['@graph'][0]['address']['streetAddress'] ?? '') === 'Jl. Contoh Terverifikasi No. 1', 'Verified streetAddress propagated cleanly');
check(count($ld['@graph'][3]['itemListElement']) === count(kkg_catalog_items()) && count(kkg_catalog_items()) === 5, 'Catalog schema matches 5 categories');
check(count($ld['@graph'][4]['mainEntity']) === count(kkg_faq_items()) && count(kkg_faq_items()) === 8, 'FAQPage schema matches 8 FAQ items');
$ldJson = json_encode($ld);
check(strpos($ldJson, 'Review') === false && strpos($ldJson, 'AggregateRating') === false, 'No Review or AggregateRating schema emitted');
check(KKG_VERSION === '0.2.7', 'Plugin/asset version bumped to 0.2.7');
check(strpos((string) file_get_contents(KKG_DIR . 'kk-grosir.php'), 'Version: 0.2.7') !== false, 'Main plugin header version 0.2.7');
check(kkg_visible_testimonials(array('mode' => 'active')) === array(), 'Placeholders hidden on public active mode');
check(kkg_visible_testimonials(array('mode' => 'off')) === array(), 'Placeholders hidden when mode off');
$GLOBALS['kkg_test_can_manage'] = false;
check(kkg_visible_testimonials(array('mode' => 'staging')) === array(), 'Placeholders hidden from non-admins in staging');
$GLOBALS['kkg_test_can_manage'] = true;
$stagingTestimonials = kkg_visible_testimonials(array('mode' => 'staging'));
check(count($stagingTestimonials) === 3, 'Three staging placeholders visible to admin');
foreach ($stagingTestimonials as $item) {
    check(!empty($item['is_placeholder']), 'All staging items marked as placeholder');
}
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging', 'phone' => '62895339293140');
$stagingHtml = kkg_render();
$posOrder = strpos($stagingHtml, 'data-section="order"');
$posTesti = strpos($stagingHtml, 'data-section="testimonials"');
$posFaq = strpos($stagingHtml, 'data-section="faq"');
check($posOrder !== false && $posTesti !== false && $posFaq !== false && $posOrder < $posTesti && $posTesti < $posFaq, 'Testimonials placed between Order and FAQ');
check(strpos($stagingHtml, 'Pak Agus') !== false && strpos($stagingHtml, 'Pak Budi') !== false && strpos($stagingHtml, 'Ibu Lala') !== false, 'Updated testimonial placeholder names rendered in staging');
check(strpos($stagingHtml, 'CONTOH TESTIMONI') === false && strpos($stagingHtml, 'Pengalaman berbelanja grosir') === false && strpos($stagingHtml, 'mempersiapkan pesanan grosir') === false, 'Removed subheadlines and CONTOH TESTIMONI badge absent in staging HTML');
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'active', 'phone' => '62895339293140');
$activeHtml = kkg_render();
check(strpos($activeHtml, 'data-section="testimonials"') === false && strpos($activeHtml, 'Pak Agus') === false && strpos($activeHtml, 'Pak Budi') === false && strpos($activeHtml, 'Ibu Lala') === false, 'No testimonial placeholder leaked in active mode HTML');
check(kkg_consent_mode(array('privacy_reviewed' => 0, 'consent_mode' => 'standalone')) === 'disabled', 'Unreviewed privacy forces disabled consent mode');
check(kkg_consent_mode(array('privacy_reviewed' => 1, 'consent_mode' => 'disabled')) === 'disabled', 'Disabled consent mode preserved');
check(kkg_consent_mode(array('privacy_reviewed' => 1, 'consent_mode' => 'standalone')) === 'standalone', 'Reviewed standalone consent mode allowed');
check(kkg_consent_mode(array('privacy_reviewed' => 1, 'consent_mode' => 'external')) === 'external', 'Reviewed external consent mode allowed');
check(strpos($activeHtml, 'data-kkg-settings') === false, 'Disabled/unreviewed HTML omits active privacy settings trigger');
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging', 'phone' => '62895339293140', 'privacy_reviewed' => 1, 'consent_mode' => 'standalone');
$standaloneHtml = kkg_render();
$posSupport = strrpos($standaloneHtml, 'Melayani Pengiriman Seluruh Indonesia');
$posPrivacyBtn = strpos($standaloneHtml, 'data-kkg-settings');
check($posSupport !== false && $posPrivacyBtn !== false && $posPrivacyBtn > $posSupport && strpos($standaloneHtml, '<footer') === false, 'Privacy reopen button placed after Final CTA support text with no footer');
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging', 'phone' => '62895339293140', 'privacy_reviewed' => 1, 'consent_mode' => 'external');
check(strpos(kkg_render(), 'data-kkg-settings') !== false, 'External audited mode renders privacy settings trigger');
// T04: shared fixture host, permalink/attachment resolution & fallback, and page-isolated SEO hooks
check(kkg_seo_canonical(array()) === 'https://example.test/grosir/', 'Canonical fallback uses shared fixture host');
$GLOBALS['kkg_test_permalinks'] = array(42 => 'https://example.test/custom-grosir/');
check(kkg_seo_canonical(array('page_id' => 42)) === 'https://example.test/custom-grosir/', 'Canonical uses permalink when page exists');
check(kkg_seo_canonical(array('page_id' => 999)) === 'https://example.test/grosir/', 'Canonical falls back cleanly when permalink empty');
$GLOBALS['kkg_test_attachments'] = array(77 => 'https://example.test/wp-content/uploads/custom-logo.webp');
check(kkg_seo_asset_image(77, 'assets/logo-kk.webp') === 'https://example.test/wp-content/uploads/custom-logo.webp', 'SEO asset image resolves valid WordPress attachment');
check(kkg_seo_asset_image(88, 'assets/logo-kk.webp') === 'https://example.test/assets/logo-kk.webp', 'SEO asset image falls back to bundled asset on missing attachment');
$ldT04 = json_encode(kkg_seo_json_ld($seoStaging), JSON_UNESCAPED_SLASHES);
check(strpos($ldT04, 'https://example.test/grosir/') !== false && strpos($ldT04, 'https://example.test/assets/logo-kk.webp') !== false && strpos($ldT04, 'kk-underwear.id') === false, 'JSON-LD uses fixture origin and bundled logo rather than hardcoded production domain');
$GLOBALS['kkg_test_removed_actions'] = array();
$GLOBALS['kkg_test_added_filters'] = array();
$GLOBALS['kkg_test_is_page'] = false;
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging', 'page_id' => 42);
check(kkg_seo_filter_title('Tema Lain') === 'Tema Lain', 'Title filter ignores pages outside /grosir/');
ob_start();
kkg_seo_wp_head();
check(ob_get_clean() === '', 'wp_head renders nothing outside /grosir/');
kkg_seo_page_isolation();
check(empty($GLOBALS['kkg_test_removed_actions']) && empty($GLOBALS['kkg_test_added_filters']), 'Isolation hook leaves other pages untouched');
$GLOBALS['kkg_test_is_page'] = true;
check(kkg_seo_filter_title('Tema Lain') === kkg_seo_title_text(), 'Title filter overrides title on /grosir/');
ob_start();
kkg_seo_wp_head();
$headHtml = ob_get_clean();
check(strpos($headHtml, 'https://example.test/custom-grosir/') !== false, 'wp_head renders canonical on /grosir/');
foreach (array('og:locale" content="id_ID"', 'og:type" content="website"', 'og:site_name" content="KK Underwear') as $ogTag) {
    check(substr_count($headHtml, $ogTag) === 1, 'wp_head renders single ' . $ogTag);
}
kkg_seo_page_isolation();
check(!empty($GLOBALS['kkg_test_removed_actions']) && !empty($GLOBALS['kkg_test_added_filters']), 'Isolation hook isolates SEO plugins on /grosir/');
$registeredFilters = array();
foreach ($GLOBALS['kkg_test_added_filters'] as $entry) { $registeredFilters[$entry[0]] = $entry[1]; }
foreach (array('wpseo_frontend_presenter_classes', 'wpseo_frontend_presenters', 'wpseo_json_ld_output', 'wpseo_schema_graph') as $emptyHook) {
    check(($registeredFilters[$emptyHook] ?? '') === '__return_empty_array' && call_user_func($registeredFilters[$emptyHook], array('Mock_Presenter')) === array(), 'Yoast array hook cleared on /grosir/: ' . $emptyHook);
}
foreach (array('wpseo_locale', 'wpseo_opengraph_type', 'wpseo_opengraph_site_name', 'wpseo_opengraph_title') as $falseHook) {
    check(($registeredFilters[$falseHook] ?? '') === '__return_false' && call_user_func($registeredFilters[$falseHook], 'en_US') === false, 'Yoast scalar OG hook suppressed on /grosir/: ' . $falseHook);
}
unset($GLOBALS['kkg_test_permalinks'], $GLOBALS['kkg_test_attachments'], $GLOBALS['kkg_test_is_page'], $GLOBALS['kkg_test_removed_actions'], $GLOBALS['kkg_test_added_filters']);
// PRIV-01 & PRIV-05: Privacy Policy status/identity guards and premature approval warning.
$baseActive = array_merge(kkg_settings(), array('mode' => 'active', 'page_id' => 5008, 'phone' => '62895339293140', 'consent_mode' => 'standalone',
    'privacy_reviewed' => 1, 'claims_reviewed' => 1, 'assets_reviewed' => 1, 'release_reviewed' => 1));
$GLOBALS['kkg_test_privacy_url'] = '';
$GLOBALS['kkg_test_options']['wp_page_for_privacy_policy'] = 0;
check(strpos(implode('|', kkg_release_blockers($baseActive)), 'Privacy Policy belum ditetapkan') !== false, 'Missing privacy policy blocks active mode');
$GLOBALS['kkg_test_options']['wp_page_for_privacy_policy'] = 5008;
$GLOBALS['kkg_test_privacy_url'] = 'https://example.test/grosir/';
check(strpos(implode('|', kkg_release_blockers($baseActive)), 'menunjuk ke halaman /grosir/') !== false, 'Landing page cannot double as Privacy Policy');
$GLOBALS['kkg_test_options']['wp_page_for_privacy_policy'] = 5010;
$GLOBALS['kkg_test_post_statuses'][5010] = 'draft';
check(strpos(implode('|', kkg_release_blockers($baseActive)), 'masih berstatus draft') !== false, 'Draft Privacy Policy blocks active mode');
$GLOBALS['kkg_test_post_statuses'][5010] = 'publish';
$GLOBALS['kkg_test_privacy_url'] = 'https://example.test/kebijakan-privasi/';
check(kkg_release_blockers($baseActive) === array(), 'Published separate Privacy Policy with all approvals clears blockers');
function wp_nonce_field($a = '') {}
function admin_url($p = '') { return 'https://example.test/wp-admin/' . $p; }
function selected($a, $b, $e = true) { return ''; }
function checked($a, $b, $e = true) { return $a == $b ? 'checked' : ''; }
function esc_textarea($t) { return esc_html($t); }
function submit_button($t = 'Save') {}
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging', 'page_id' => 5008, 'privacy_reviewed' => 1, 'release_reviewed' => 1, 'cleanup_enabled' => 1);
$GLOBALS['kkg_test_post_statuses'][5010] = 'draft';
ob_start();
kkg_admin_page();
$admWarn = ob_get_clean();
check(strpos($admWarn, 'Peringatan Status Approval (PRIV-01 / PRIV-05)') !== false && strpos($admWarn, 'masih berstatus draft') !== false, 'Admin page shows specific PRIV-01/PRIV-05 warning for premature approval');
unset($GLOBALS['kkg_test_privacy_url'], $GLOBALS['kkg_test_post_statuses'], $GLOBALS['kkg_test_options']['wp_page_for_privacy_policy']);
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging');
// Task A: Server-side cleanup guard & execution checks against isolated mock DB.
if (!defined('DB_NAME')) { define('DB_NAME', 'kkg_tests'); }
require_once KKG_DIR . 'includes/store.php';
class KkgMockCleanupWpdb {
    public $prefix = 'wp_';
    public $queries = array();
    public function prepare($sql, ...$args) {
        $i = 0;
        return preg_replace_callback('/%[ds]/', function ($m) use (&$i, $args) {
            $v = $args[$i++];
            return $m[0] === '%d' ? (string) (int) $v : "'" . addslashes((string) $v) . "'";
        }, $sql);
    }
    public function query($sql) { $this->queries[] = $sql; return 1; }
    public function get_var($sql) {
        $this->queries[] = $sql;
        if (strpos($sql, 'GET_LOCK(') !== false || strpos($sql, 'RELEASE_LOCK(') !== false) { return 1; }
        if (strpos($sql, 'MAX(id)') !== false) { return 42; }
        return 0;
    }
}
$GLOBALS['wpdb'] = new KkgMockCleanupWpdb();
$cleanupCases = array(
    array('privacy_reviewed=0', array('mode' => 'staging', 'page_id' => 5008, 'privacy_reviewed' => 0, 'cleanup_enabled' => 1), 5010, 'publish', 'https://example.test/kebijakan-privasi/', false),
    array('cleanup_enabled=0', array('mode' => 'staging', 'page_id' => 5008, 'privacy_reviewed' => 1, 'cleanup_enabled' => 0), 5010, 'publish', 'https://example.test/kebijakan-privasi/', false),
    array('privacy_unset', array('mode' => 'staging', 'page_id' => 5008, 'privacy_reviewed' => 1, 'cleanup_enabled' => 1), 0, 'publish', '', false),
    array('privacy_draft', array('mode' => 'staging', 'page_id' => 5008, 'privacy_reviewed' => 1, 'cleanup_enabled' => 1), 5010, 'draft', 'https://example.test/kebijakan-privasi/', false),
    array('privacy_points_to_grosir_id', array('mode' => 'staging', 'page_id' => 5008, 'privacy_reviewed' => 1, 'cleanup_enabled' => 1), 5008, 'publish', 'https://example.test/grosir/', false),
    array('privacy_points_to_grosir_slug_with_page_id_0', array('mode' => 'staging', 'page_id' => 0, 'privacy_reviewed' => 1, 'cleanup_enabled' => 1), 5008, 'publish', 'https://example.test/pmnov/grosir/', false),
    array('all_prerequisites_met', array('mode' => 'active', 'page_id' => 5008, 'privacy_reviewed' => 1, 'cleanup_enabled' => 1, 'retention_days' => 180), 5010, 'publish', 'https://example.test/kebijakan-privasi/', true),
);
foreach ($cleanupCases as $case) {
    list($label, $cfg, $ppId, $ppStatus, $ppUrl, $shouldDelete) = $case;
    $GLOBALS['wpdb']->queries = array();
    $GLOBALS['kkg_test_options']['kkg_settings'] = $cfg;
    $GLOBALS['kkg_test_options']['wp_page_for_privacy_policy'] = $ppId;
    $GLOBALS['kkg_test_post_statuses'][$ppId] = $ppStatus;
    $GLOBALS['kkg_test_privacy_url'] = $ppUrl;
    unset($GLOBALS['kkg_test_options']['kkg_health']);
    kkg_cleanup();
    check(empty($GLOBALS['kkg_test_options']['kkg_health']), 'kkg_cleanup ' . $label . ' runs without error');
    $log = implode("\n", $GLOBALS['wpdb']->queries);
    $deletedAttribution = strpos($log, 'DELETE FROM wp_kkg_events') !== false || strpos($log, 'DELETE FROM wp_kkg_references') !== false;
    check($deletedAttribution === $shouldDelete, 'kkg_cleanup ' . $label . ($shouldDelete ? ' runs retention delete' : ' blocks attribution delete'));
}
check((int) ($GLOBALS['kkg_test_options']['kkg_retention_cursor'] ?? 0) === 42, 'kkg_cleanup updates retention cursor when prerequisites pass');
unset($GLOBALS['kkg_test_privacy_url'], $GLOBALS['kkg_test_post_statuses'], $GLOBALS['kkg_test_options']['wp_page_for_privacy_policy'], $GLOBALS['kkg_test_options']['kkg_retention_cursor'], $GLOBALS['wpdb']);

// Cookiebot Consent Bridge enqueue & script attribute filter tests (non-/grosir/, disabled, standalone, external).
$runAssetCase = function (bool $isPage, string $consentMode, int $privacyReviewed = 1): array {
    $GLOBALS['kkg_test_is_page'] = $isPage;
    $GLOBALS['kkg_test_can_manage'] = true;
    $GLOBALS['kkg_test_options']['kkg_settings'] = array(
        'mode' => 'staging',
        'page_id' => 5009,
        'privacy_reviewed' => $privacyReviewed,
        'consent_mode' => $consentMode,
    );
    $GLOBALS['kkg_test_styles'] = array();
    $GLOBALS['kkg_test_scripts'] = array();
    $GLOBALS['kkg_test_inline_scripts'] = array();
    kkg_assets();
    return array($GLOBALS['kkg_test_styles'], $GLOBALS['kkg_test_scripts'], $GLOBALS['kkg_test_inline_scripts']);
};
list($wcStyles, $wcScripts) = $runAssetCase(false, 'external');
check($wcStyles === array() && $wcScripts === array(), 'non-/grosir/ page (WooCommerce/shop) enqueues no KK Grosir assets');
$otherTag = '<script src="https://example.test/pys.js"></script>';
check(kkg_script_loader_tag($otherTag, 'kk-grosir-cookiebot') === $otherTag, 'script_loader_tag skips non-/grosir/ pages');
check(kkg_inline_script_attributes(array('id' => 'kk-grosir-js-before')) === array('id' => 'kk-grosir-js-before'), 'inline_script_attributes skips non-/grosir/ pages');

list(, $unreviewedScripts, $unreviewedInline) = $runAssetCase(true, 'external', 0);
check(isset($unreviewedScripts['kk-grosir']) && !isset($unreviewedScripts['kk-grosir-cookiebot']), 'external without privacy_reviewed falls back to disabled and omits bridge');
check(strpos($unreviewedInline[0][1] ?? '', '"consentMode":"disabled"') !== false, 'unreviewed external exposes consentMode=disabled');

foreach (array('disabled', 'standalone') as $nonExtMode) {
    list(, $modeScripts, $modeInline) = $runAssetCase(true, $nonExtMode);
    check(isset($modeScripts['kk-grosir']) && !isset($modeScripts['kk-grosir-cookiebot']), "$nonExtMode mode omits cookiebot-bridge.js");
    check(strpos($modeInline[0][1] ?? '', '"consentMode":"' . $nonExtMode . '"') !== false, "$nonExtMode inline config matches mode");
    $kkgTag = '<script src="/assets/landing.js"></script>';
    check(kkg_script_loader_tag($kkgTag, 'kk-grosir') === $kkgTag, "$nonExtMode leaves kk-grosir script tag untouched");
    check(kkg_inline_script_attributes(array('id' => 'kk-grosir-js-before')) === array('id' => 'kk-grosir-js-before'), "$nonExtMode leaves inline attributes untouched");
}

list($extStyles, $extScripts, $extInline) = $runAssetCase(true, 'external');
check(isset($extStyles['kk-grosir']) && isset($extScripts['kk-grosir']), 'external mode enqueues core landing assets');
check(isset($extScripts['kk-grosir-cookiebot']) && $extScripts['kk-grosir-cookiebot'][1] === array('kk-grosir') && $extScripts['kk-grosir-cookiebot'][3] === true, 'external mode enqueues kk-grosir-cookiebot in footer after kk-grosir');
check(strpos($extInline[0][1] ?? '', '"consentMode":"external"') !== false, 'external mode exposes consentMode=external inline');
$landingTag = '<script src="/assets/landing.js" id="kk-grosir-js"></script>';
$bridgeTag = '<script src="/assets/cookiebot-bridge.js" id="kk-grosir-cookiebot-js"></script>';
$thirdPartyTag = '<script src="https://www.googletagmanager.com/gtag/js" id="google_gtagjs-js"></script>';
check(kkg_script_loader_tag($landingTag, 'kk-grosir') === '<script data-cookieconsent="ignore" src="/assets/landing.js" id="kk-grosir-js"></script>', 'external adds data-cookieconsent=ignore to kk-grosir');
check(kkg_script_loader_tag($bridgeTag, 'kk-grosir-cookiebot') === '<script data-cookieconsent="ignore" src="/assets/cookiebot-bridge.js" id="kk-grosir-cookiebot-js"></script>', 'external adds data-cookieconsent=ignore to kk-grosir-cookiebot');
check(kkg_script_loader_tag('<script data-cookieconsent="necessary" src="/assets/cookiebot-bridge.js"></script>', 'kk-grosir-cookiebot') === '<script data-cookieconsent="necessary" src="/assets/cookiebot-bridge.js"></script>', 'script_loader_tag preserves explicit data-cookieconsent attribute');
check(kkg_script_loader_tag($thirdPartyTag, 'google_gtagjs') === $thirdPartyTag, 'external never alters third-party Site Kit / PYS / WooCommerce scripts');
check(kkg_inline_script_attributes(array('id' => 'kk-grosir-js-before')) === array('id' => 'kk-grosir-js-before', 'data-cookieconsent' => 'ignore'), 'external adds data-cookieconsent=ignore to kk-grosir-js-before');
check(kkg_inline_script_attributes(array('id' => 'woocommerce-inline-js')) === array('id' => 'woocommerce-inline-js'), 'external never alters non-KKG inline scripts');
unset($GLOBALS['kkg_test_is_page'], $GLOBALS['kkg_test_can_manage'], $GLOBALS['kkg_test_styles'], $GLOBALS['kkg_test_scripts'], $GLOBALS['kkg_test_inline_scripts']);

$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging');
echo "PHP domain: $checks checks passed\n";
