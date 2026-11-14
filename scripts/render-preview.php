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
$testimonialFixture = $argv[3] ?? '';
if ($testimonialFixture === 'empty') {
    add_filter('kkg_testimonials_items', static function () { return array(); });
} elseif ($testimonialFixture === 'unapproved') {
    add_filter('kkg_testimonials_items', static function ($items) {
        foreach ($items as &$item) {
            $item['is_approved_for_publication'] = false;
        }
        return $items;
    });
} elseif ($testimonialFixture === 'simulated') {
    add_filter('kkg_testimonials_items', static function ($items) {
        foreach ($items as $idx => &$item) {
            $item['is_approved_for_publication'] = true;
            if ($idx === 1) {
                $item['order_highlight'] = '[Simulasi QA Multi-Foto] Produk LaParis';
                $item['chat_proof_images'][] = array(
                    'rel' => 'assets/testimonials/chat-algo-jaya.webp',
                    'alt' => 'Simulasi halaman kedua bukti chat WhatsApp untuk pengujian multi-gambar',
                    'width' => 460,
                    'height' => 920,
                );
            }
        }
        return $items;
    });
}
$invoiceFixture = $argv[4] ?? '';
if ($invoiceFixture === 'empty') {
    add_filter('kkg_invoices_items', static function () { return array(); });
} elseif ($invoiceFixture === 'unapproved') {
    add_filter('kkg_invoices_items', static function ($items) {
        foreach ($items as &$item) {
            $item['is_approved_for_publication'] = false;
        }
        return $items;
    });
} elseif ($invoiceFixture === 'missing_image') {
    add_filter('kkg_invoices_items', static function ($items) {
        foreach ($items as &$item) {
            $item['image'] = 'assets/invoices/does-not-exist.webp';
            $item['is_approved_for_publication'] = true;
        }
        return $items;
    });
} elseif (in_array($invoiceFixture, array('1', '2', '3', '4'), true)) {
    add_filter('kkg_invoices_items', static function ($items) use ($invoiceFixture) {
        foreach ($items as &$item) {
            $item['is_approved_for_publication'] = true;
        }
        unset($item);
        if ($invoiceFixture === '1') {
            return array_slice($items, 0, 1);
        }
        if ($invoiceFixture === '2') {
            return array_slice($items, 0, 2);
        }
        if ($invoiceFixture === '4' && !empty($items)) {
            $extra = $items[0];
            $extra['id'] = 'invoice-04';
            $extra['date'] = '2026-09-25';
            $extra['date_label'] = '25 September 2026';
            $items[] = $extra;
        }
        return $items;
    });
}
?><!doctype html><html <?php echo kkg_seo_language_attributes('lang="en-US"'); ?>><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<?php kkg_seo_render_head(); ?><link rel="stylesheet" href="/assets/landing.css?v=<?php echo esc_attr(KKG_VERSION); ?>"></head><body class="kkg-page">
<?php echo kkg_render(); ?>
<script>window.KKG=<?php echo json_encode(array('endpoint'=>'/api/handoff','fallback'=>kkg_wa_url(),'consentMode'=>$consentArg,'policyVersion'=>'draft-1','nonce'=>'')); ?>;</script>
<script src="/assets/landing.js?v=<?php echo esc_attr(KKG_VERSION); ?>"></script><?php if ($consentArg === 'external'): ?><script src="/assets/cookiebot-bridge.js?v=<?php echo esc_attr(KKG_VERSION); ?>"></script><?php endif; ?></body></html>
