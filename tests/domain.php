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
check(KKG_VERSION === '0.2.5', 'Plugin/asset version bumped to 0.2.5');
check(strpos((string) file_get_contents(KKG_DIR . 'kk-grosir.php'), 'Version: 0.2.5') !== false, 'Main plugin header version 0.2.5');
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
kkg_seo_page_isolation();
check(!empty($GLOBALS['kkg_test_removed_actions']) && !empty($GLOBALS['kkg_test_added_filters']), 'Isolation hook isolates SEO plugins on /grosir/');
unset($GLOBALS['kkg_test_permalinks'], $GLOBALS['kkg_test_attachments'], $GLOBALS['kkg_test_is_page'], $GLOBALS['kkg_test_removed_actions'], $GLOBALS['kkg_test_added_filters']);
$GLOBALS['kkg_test_options']['kkg_settings'] = array('mode' => 'staging');
echo "PHP domain: $checks checks passed\n";
