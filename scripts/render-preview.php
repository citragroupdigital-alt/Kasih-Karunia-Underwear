<?php
require dirname(__DIR__) . '/tests/wp-shim.php';
$GLOBALS['kkg_test_options']['kkg_settings']['page_id'] = 5009;
if (($argv[1] ?? '') === 'active') {
    $GLOBALS['kkg_test_options']['kkg_settings']['mode'] = 'active';
}
$consentArg = in_array($argv[2] ?? '', array('standalone', 'external'), true) ? $argv[2] : 'disabled';
if ($consentArg !== 'disabled') {
    $GLOBALS['kkg_test_options']['kkg_settings']['privacy_reviewed'] = 1;
    $GLOBALS['kkg_test_options']['kkg_settings']['consent_mode'] = $consentArg;
}
?><!doctype html><html <?php echo kkg_seo_language_attributes('lang="en-US"'); ?>><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<?php kkg_seo_render_head(); ?><link rel="stylesheet" href="/assets/landing.css?v=<?php echo esc_attr(KKG_VERSION); ?>"></head><body class="kkg-page">
<?php echo kkg_render(); ?>
<script>window.KKG=<?php echo json_encode(array('endpoint'=>'/api/handoff','fallback'=>kkg_wa_url(),'consentMode'=>$consentArg,'policyVersion'=>'draft-1','nonce'=>'')); ?>;</script>
<script src="/assets/landing.js?v=<?php echo esc_attr(KKG_VERSION); ?>"></script><?php if ($consentArg === 'external'): ?><script src="/assets/cookiebot-bridge.js?v=<?php echo esc_attr(KKG_VERSION); ?>"></script><?php endif; ?></body></html>
