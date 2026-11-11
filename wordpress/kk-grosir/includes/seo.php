<?php
defined('ABSPATH') || exit;

/** Single source of truth for the five approved product categories (used in HTML + JSON-LD). */
function kkg_catalog_items() {
    return array(
        array(
            'key' => 'category_0',
            'name' => 'Bra Wanita',
            'alt' => 'Grosir bra dan BH wanita KK Underwear Surabaya',
            'description' => 'Grosir bra dan BH wanita harian dari supplier bra tepercaya untuk stok agen, reseller, dan toko.',
        ),
        array(
            'key' => 'category_1',
            'name' => 'Celana Dalam Pria',
            'alt' => 'Grosir celana dalam pria KK Underwear Surabaya',
            'description' => 'Supplier celana dalam pria untuk kulakan pakaian dalam harian berbahan nyaman di toko Anda.',
        ),
        array(
            'key' => 'category_2',
            'name' => 'Celana Dalam Wanita',
            'alt' => 'Grosir celana dalam wanita KK Underwear Surabaya',
            'description' => 'Grosir celana dalam wanita dan supplier pakaian dalam wanita dengan pilihan model beragam.',
        ),
        array(
            'key' => 'category_3',
            'name' => 'Kaos Kaki',
            'alt' => 'Grosir kaos kaki KK Underwear Surabaya',
            'description' => 'Stok kaos kaki grosir harian langsung dari supplier untuk kebutuhan toko dan reseller.',
        ),
        array(
            'key' => 'category_4',
            'name' => 'Handuk',
            'alt' => 'Grosir handuk harian KK Underwear Surabaya',
            'description' => 'Pilihan handuk grosir siap kulakan mulai 1 lusin sebagai pelengkap usaha harian.',
        ),
    );
}

/** Single source of truth for AEO/GEO FAQ items (40-55 word self-contained answers synced 1:1 with FAQPage JSON-LD). */
function kkg_faq_items() {
    return array(
        'Berapa minimum pembelian grosir pakaian dalam di KK Underwear?' =>
            'Minimum pembelian grosir pakaian dalam di KK Underwear mulai dari 1 lusin (12 pcs). Ketentuan ini berlaku untuk kebutuhan kulakan pakaian dalam seperti bra atau BH wanita, celana dalam pria, celana dalam wanita, kaos kaki, maupun handuk bagi agen, reseller, dan pemilik toko.',
        'Produk apa saja yang tersedia di supplier pakaian dalam KK Underwear?' =>
            'KK Underwear merupakan supplier bra (BH) wanita, supplier celana dalam pria dan wanita, kaos kaki, serta handuk untuk kebutuhan harian. Seluruh produk tersedia dalam skema grosir pakaian dalam dan perlengkapan harian untuk mendukung perputaran stok toko, agen, maupun reseller.',
        'Apakah KK Underwear melayani agen pakaian dalam, reseller baru, dan pemilik toko?' =>
            'Ya, CV. Kasih Karunia berperan sebagai distributor dan supplier pakaian dalam untuk toko, agen pakaian dalam, maupun reseller baru di seluruh Indonesia. Mitra baru dapat memulai pembelian grosir dari 1 lusin tanpa batas belanja besar di awal.',
        'Di mana lokasi toko dan gudang grosir pakaian dalam KK Underwear?' =>
            'Toko dan gudang CV. Kasih Karunia (KK Underwear) berlokasi di Surabaya, Jawa Timur. Sebagai grosir pakaian dalam Surabaya serta distributor dan supplier pakaian dalam Surabaya, kami melayani pengambilan pesanan dan pengiriman ke berbagai wilayah Indonesia.',
        'Bagaimana cara mendapatkan katalog grosir bra dan celana dalam?' =>
            'Klik tombol Minta Katalog Grosir pada halaman ini untuk terhubung langsung dengan WhatsApp Customer Service resmi KK Underwear. Tim CS akan mengirimkan katalog produk terbaru dan rincian minimum pembelian sesuai kebutuhan stok toko atau usaha Anda.',
        'Apakah daftar harga grosir tersedia di website?' =>
            'Daftar harga grosir tidak dicantumkan secara terbuka di website. Informasi harga kulakan pakaian dalam untuk bra (BH) wanita, celana dalam, kaos kaki, dan handuk dapat diperoleh langsung melalui WhatsApp Customer Service resmi CV. Kasih Karunia.',
        'Apakah melayani pengiriman grosir pakaian dalam dari Surabaya ke seluruh Indonesia?' =>
            'Ya, KK Underwear melayani pengiriman grosir pakaian dalam dari toko dan gudang di Surabaya ke seluruh Indonesia. Ongkos kirim dan pilihan ekspedisi atau kargo volume besar dikonfirmasi langsung bersama Customer Service sebelum pesanan diproses.',
        'Bagaimana cara melakukan pemesanan kulakan di KK Underwear?' =>
            'Alur pemesanan terdiri dari empat langkah: hubungi WhatsApp CS untuk meminta katalog grosir, pilih produk mulai 1 lusin, pastikan rincian pesanan dan pembayaran bersama CS, lalu pesanan diproses untuk pengiriman sesuai kesepakatan ekspedisi.',
    );
}

function kkg_seo_title_text() {
    return 'Grosir & Supplier Pakaian Dalam Surabaya | KK Underwear';
}

function kkg_seo_description() {
    return 'Supplier & distributor pakaian dalam wanita di Surabaya: grosir bra (BH), celana dalam, kaos kaki untuk agen, reseller & toko mulai 1 lusin. Minta katalog.';
}

function kkg_seo_robots($s = null) {
    $s = is_array($s) ? $s : kkg_settings();
    if (($s['mode'] ?? 'off') !== 'active' || kkg_release_blockers($s)) {
        return 'noindex, nofollow';
    }
    return 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
}

function kkg_seo_home_url() {
    return function_exists('home_url') ? home_url('/') : 'https://kk-underwear.id/';
}

function kkg_seo_canonical($s = null) {
    $s = is_array($s) ? $s : kkg_settings();
    if (!empty($s['page_id']) && function_exists('get_permalink')) {
        $url = get_permalink((int) $s['page_id']);
        if ($url) { return $url; }
    }
    return function_exists('home_url') ? home_url('/grosir/') : 'https://kk-underwear.id/grosir/';
}

function kkg_seo_asset_image($id, $fallback_rel = '') {
    if ($id && function_exists('wp_attachment_is_image') && wp_attachment_is_image($id) && function_exists('wp_get_attachment_image_url')) {
        $url = wp_get_attachment_image_url((int) $id, 'full');
        if ($url) { return $url; }
    }
    if ($fallback_rel && defined('KKG_DIR') && defined('KKG_URL') && file_exists(KKG_DIR . $fallback_rel)) {
        $url = KKG_URL . $fallback_rel;
        if (strpos($url, 'http://') === 0 || strpos($url, 'https://') === 0) {
            return $url;
        }
        return rtrim(kkg_seo_home_url(), '/') . '/' . ltrim($url, '/');
    }
    return '';
}

function kkg_seo_json_ld($s = null) {
    $s = is_array($s) ? $s : kkg_settings();
    $home = kkg_seo_home_url();
    $canonical = kkg_seo_canonical($s);
    $logo = kkg_seo_asset_image((int) ($s['logo'] ?? 0), 'assets/logo-kk.webp');
    $address = array(
        '@type' => 'PostalAddress',
        'addressLocality' => 'Surabaya',
        'addressRegion' => 'Jawa Timur',
        'addressCountry' => 'ID',
    );
    $street = trim((string) ($s['address'] ?? ''));
    if ($street !== '') {
        $address['streetAddress'] = $street;
    }
    $org = array(
        '@type' => array('Organization', 'WholesaleStore'),
        '@id' => $canonical . '#organization',
        'name' => 'CV. Kasih Karunia (KK Underwear)',
        'alternateName' => 'KK Underwear',
        'url' => $home,
        'description' => 'Distributor, agen, dan supplier pakaian dalam wanita & pria (bra/BH, celana dalam, kaos kaki, handuk) dengan toko dan gudang di Surabaya, melayani kulakan grosir mulai 1 lusin ke seluruh Indonesia.',
        'address' => $address,
        'areaServed' => array('@type' => 'Country', 'name' => 'Indonesia'),
    );
    if ($logo) { $org['logo'] = $logo; }
    if (preg_match('/^62\d{8,13}$/D', (string) ($s['phone'] ?? ''))) {
        $org['contactPoint'] = array(
            '@type' => 'ContactPoint',
            'telephone' => '+' . $s['phone'],
            'contactType' => 'sales',
            'availableLanguage' => 'Indonesian',
        );
    }

    $catalog_elements = array();
    foreach (kkg_catalog_items() as $idx => $item) {
        $catalog_elements[] = array(
            '@type' => 'ListItem',
            'position' => $idx + 1,
            'name' => $item['name'],
            'description' => $item['description'],
        );
    }
    $faq_entities = array();
    foreach (kkg_faq_items() as $question => $answer) {
        $faq_entities[] = array(
            '@type' => 'Question',
            'name' => $question,
            'acceptedAnswer' => array('@type' => 'Answer', 'text' => $answer),
        );
    }

    return array(
        '@context' => 'https://schema.org',
        '@graph' => array(
            $org,
            array(
                '@type' => 'WebPage',
                '@id' => $canonical . '#webpage',
                'url' => $canonical,
                'name' => kkg_seo_title_text(),
                'description' => kkg_seo_description(),
                'inLanguage' => 'id-ID',
                'isPartOf' => array('url' => $home, 'name' => 'KK Underwear'),
                'about' => array('@id' => $canonical . '#organization'),
                'breadcrumb' => array('@id' => $canonical . '#breadcrumb'),
                'mainEntity' => array('@id' => $canonical . '#catalog'),
            ),
            array(
                '@type' => 'BreadcrumbList',
                '@id' => $canonical . '#breadcrumb',
                'itemListElement' => array(
                    array('@type' => 'ListItem', 'position' => 1, 'name' => 'Beranda', 'item' => $home),
                    array('@type' => 'ListItem', 'position' => 2, 'name' => 'Grosir Pakaian Dalam Surabaya', 'item' => $canonical),
                ),
            ),
            array(
                '@type' => 'OfferCatalog',
                '@id' => $canonical . '#catalog',
                'name' => 'Kategori Produk Grosir Pakaian Dalam KK Underwear',
                'itemListElement' => $catalog_elements,
            ),
            array(
                '@type' => 'FAQPage',
                '@id' => $canonical . '#faq',
                'mainEntity' => $faq_entities,
            ),
        ),
    );
}

function kkg_seo_render_head($s = null) {
    $s = is_array($s) ? $s : kkg_settings();
    $title = kkg_seo_title_text();
    $desc = kkg_seo_description();
    $robots = kkg_seo_robots($s);
    $canonical = kkg_seo_canonical($s);
    $og_image = kkg_seo_asset_image((int) ($s['hero'] ?? 0), 'assets/hero-kk.webp');
    if (!$og_image) {
        $og_image = kkg_seo_asset_image((int) ($s['logo'] ?? 0), 'assets/logo-kk.webp');
    }
    echo '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta name="robots" content="' . esc_attr($robots) . '">' . "\n";
    echo '<link rel="canonical" href="' . esc_url($canonical) . '">' . "\n";
    echo '<meta property="og:locale" content="id_ID">' . "\n";
    echo '<meta property="og:type" content="website">' . "\n";
    echo '<meta property="og:site_name" content="KK Underwear — CV. Kasih Karunia">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta property="og:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:url" content="' . esc_url($canonical) . '">' . "\n";
    if ($og_image) {
        echo '<meta property="og:image" content="' . esc_url($og_image) . '">' . "\n";
        echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
        echo '<meta name="twitter:image" content="' . esc_url($og_image) . '">' . "\n";
    } else {
        echo '<meta name="twitter:card" content="summary">' . "\n";
    }
    echo '<meta name="twitter:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta name="twitter:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<script type="application/ld+json">' .
        wp_json_encode(kkg_seo_json_ld($s), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) .
        '</script>' . "\n";
}

function kkg_seo_filter_title($title) {
    return function_exists('kkg_is_page') && kkg_is_page() ? kkg_seo_title_text() : $title;
}

function kkg_seo_wp_head() {
    if (function_exists('kkg_is_page') && kkg_is_page()) {
        kkg_seo_render_head();
    }
}

/** Prevent duplicate head/schema output from global SEO plugins solely on /grosir/. */
function kkg_seo_page_isolation() {
    if (!function_exists('kkg_is_page') || !kkg_is_page()) { return; }
    remove_action('wp_head', 'rel_canonical');
    foreach (array('wpseo_title', 'wpseo_metadesc', 'wpseo_canonical', 'wpseo_robots',
        'wpseo_opengraph_title', 'wpseo_opengraph_desc', 'wpseo_opengraph_url',
        'wpseo_opengraph_image', 'wpseo_twitter_title', 'wpseo_twitter_description', 'wpseo_twitter_image',
        'rank_math/frontend/title', 'rank_math/frontend/description', 'rank_math/frontend/canonical',
        'rank_math/frontend/robots') as $hook) {
        add_filter($hook, '__return_false', 999);
    }
    add_filter('wpseo_json_ld_output', '__return_empty_array', 999);
    add_filter('rank_math/json_ld', '__return_empty_array', 999);
}

