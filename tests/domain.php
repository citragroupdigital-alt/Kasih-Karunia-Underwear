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
echo "PHP domain: $checks checks passed\n";
