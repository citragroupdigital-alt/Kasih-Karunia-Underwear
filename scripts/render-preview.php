<?php
require dirname(__DIR__) . '/tests/wp-shim.php';
?><!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title><?php echo esc_html(kkg_seo_title_text()); ?></title>
<?php kkg_seo_render_head(); ?><link rel="stylesheet" href="/assets/landing.css"></head><body class="kkg-page">
<?php echo kkg_render(); ?>
<script>window.KKG=<?php echo json_encode(array('endpoint'=>'/api/handoff','fallback'=>kkg_wa_url(),'consentMode'=>'disabled','policyVersion'=>'draft-1','nonce'=>'')); ?>;</script>
<script src="/assets/landing.js"></script></body></html>
