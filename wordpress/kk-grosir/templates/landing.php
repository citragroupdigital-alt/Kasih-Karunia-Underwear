<?php
defined('ABSPATH') || exit;
$categories = array('Bra Wanita', 'Celana Dalam Pria', 'Celana Dalam Wanita', 'Kaos Kaki', 'Handuk');
$usps = array(
    array('Kualitas Premium', 'Bahan kain katun organik pilihan terbaik untuk kenyamanan luar biasa pelanggan Anda.', '✧'),
    array('Harga Grosir', 'Harga tangan pertama langsung dari pabrik. Maksimalkan margin profit reseller Anda.', '◇'),
    array('Kargo Termurah', 'Logistik andal dengan pilihan kargo volume besar memastikan biaya kirim tetap hemat.', '↗'),
    array('Layanan CS', 'Tim Customer Service profesional siap membantu kebutuhan order mitra setiap hari.', '♡'),
);
$steps = array(
    array('Minta Katalog Grosir', 'Hubungi Customer Service melalui WhatsApp.'),
    array('Pilih Produk', 'Lihat katalog, informasi harga, dan minimum pembelian 1 lusin.'),
    array('Konfirmasi Pesanan', 'CS membantu memastikan detail pesanan dan pembayaran.'),
    array('Pengiriman Barang', 'Pesanan diproses untuk dikirim sesuai ketentuan pengiriman.'),
);
$faq = array(
    'Berapa minimum pembelian grosir?' => 'Minimum pembelian mulai dari 1 lusin (12 pcs).',
    'Bagaimana cara mendapatkan katalog grosir?' => 'Klik tombol Minta Katalog Grosir untuk menghubungi CS melalui WhatsApp.',
    'Apakah harga grosir tersedia di website?' => 'Informasi katalog dan harga grosir dapat diperoleh langsung melalui WhatsApp CS.',
    'Apa saja produk yang tersedia?' => 'Bra wanita, celana dalam pria, celana dalam wanita, kaos kaki, dan handuk.',
    'Apakah reseller baru boleh melakukan pembelian?' => 'Ya, KK Underwear melayani reseller baru dan pemilik toko.',
    'Apakah melayani pengiriman ke seluruh Indonesia?' => 'Ya, KK Underwear melayani pengiriman ke seluruh Indonesia. Ongkir dan pilihan ekspedisi dikonfirmasi melalui CS.',
    'Bagaimana cara melakukan pemesanan?' => 'Hubungi CS, pilih produk, konfirmasi pesanan dan pembayaran, kemudian barang diproses untuk pengiriman.',
);
?>
<div class="kkg-root">
<a href="#kkg-main" class="kkg-skip">Lewati ke konten</a>
<?php if ($s['mode'] === 'staging'): ?>
<aside class="kkg-staging" id="kkg-setup">PREVIEW STAGING · Foto, logo, klaim USP dan konfigurasi CS menunggu verifikasi. Belum untuk publikasi.</aside>
<?php endif; ?>
<header class="kkg-header" data-section="header">
    <div class="kkg-container kkg-header-inner">
        <a href="#kkg-main" class="kkg-brand" aria-label="KK Underwear, awal halaman"><?php kkg_brand(); ?></a>
        <nav class="kkg-nav" aria-label="Navigasi utama">
            <a href="#produk">Produk Grosir</a><a href="#keunggulan">Keunggulan</a><a href="#tentang">Tentang Kami</a><a href="#faq">FAQ</a>
        </nav>
        <?php kkg_cta('header'); ?>
    </div>
</header>
<main id="kkg-main">
<section class="kkg-hero" data-section="hero" aria-labelledby="kkg-title">
    <div class="kkg-container kkg-hero-grid">
        <div class="kkg-hero-copy">
            <p class="kkg-eyebrow"><span aria-hidden="true"></span> SUPPLIER PAKAIAN DALAM &amp; KAOS KAKI</p>
            <h1 id="kkg-title">Kulakan Grosir <br>Mulai <em>1 Lusin!</em></h1>
            <p class="kkg-intro">Temukan pilihan bra wanita, celana dalam pria dan wanita, kaos kaki, serta handuk untuk kebutuhan reseller dan pemilik toko. Dapatkan katalog dan informasi harga grosir langsung dari tim CV. Kasih Karunia.</p>
            <?php kkg_cta('hero'); ?>
            <p class="kkg-support"><span aria-hidden="true">↗</span> Melayani Pengiriman ke Seluruh Indonesia</p>
        </div>
        <div class="kkg-hero-art">
            <div class="kkg-hero-image"><?php kkg_image('hero', 'Pilihan produk grosir KK Underwear', true); ?></div>
            <div class="kkg-moq"><span>Mulai dari</span><strong>12 <small>pcs</small></strong><span>1 lusin untuk mulai kulakan</span></div>
            <span class="kkg-art-caption">KEBUTUHAN HARIAN · PILIHAN UNTUK USAHA ANDA</span>
        </div>
    </div>
</section>
<section class="kkg-stats" data-section="statistics" aria-label="KK Underwear dalam angka">
    <div class="kkg-container kkg-stats-grid">
        <div><strong>70.000+</strong><span>PRODUK TERJUAL</span></div>
        <div><strong>2.000+</strong><span>MITRA RESELLER</span></div>
        <div><strong>40.000+</strong><span>PELANGGAN PUAS</span></div>
    </div>
</section>
<section class="kkg-section kkg-usp" id="keunggulan" data-section="usp" aria-label="Keunggulan KK Underwear">
    <div class="kkg-container">
        <?php if (!$s['claims_reviewed']): ?><p class="kkg-review-note">Klaim berikut menunggu validasi pemilik sebelum publikasi.</p><?php endif; ?>
        <div class="kkg-grid-four">
        <?php foreach ($usps as $usp): ?>
            <article class="kkg-usp-card"><span class="kkg-icon" aria-hidden="true"><?php echo esc_html($usp[2]); ?></span><h2><?php echo esc_html($usp[0]); ?></h2><p><?php echo esc_html($usp[1]); ?></p></article>
        <?php endforeach; ?>
        </div>
    </div>
</section>
<section class="kkg-section kkg-products" id="produk" data-section="categories" aria-labelledby="kkg-products-title">
    <div class="kkg-container">
        <div class="kkg-section-heading"><div><p class="kkg-eyebrow">PRODUK GROSIR</p><h2 id="kkg-products-title">Pilihan produk untuk <br><em>kebutuhan toko Anda.</em></h2></div><p>Lima kategori kebutuhan harian.<br>Katalog dan harga grosir melalui CS.</p></div>
        <div class="kkg-product-grid">
        <?php foreach ($categories as $i => $category): ?>
            <article class="kkg-product"><div class="kkg-product-image"><?php kkg_image('category_' . $i, $category); ?></div><span class="kkg-product-number">0<?php echo (int) $i + 1; ?></span><h3><?php echo esc_html($category); ?></h3><?php kkg_cta('category', true); ?></article>
        <?php endforeach; ?>
        </div>
    </div>
</section>
<section class="kkg-section kkg-about" id="tentang" data-section="about" aria-labelledby="kkg-about-title">
    <div class="kkg-container kkg-about-grid">
        <div>
            <p class="kkg-eyebrow">TENTANG KAMI</p><h2 id="kkg-about-title">CV. KASIH KARUNIA</h2>
            <p>Kasih Karunia merupakan perusahaan yang bergerak di bidang daily needs. Kami berkomitmen memberikan produk-produk berkualitas tinggi dan terpercaya dengan harga yang terjangkau untuk kebutuhan konsumen Indonesia. Semua produk Kasih Karunia memiliki bahan-bahan berkualitas terbaik dari proses produksi hingga produk jadi yang disesuaikan dengan pasar konsumen Indonesia. Kami terus berkomitmen menyediakan model dan warna terbaru sesuai dengan tren terkini.</p>
            <div class="kkg-vision"><h3>VISI</h3><p>Menjadi distributor pakaian dalam dan daily needs berkualitas dengan pelayanan terbaik se-Indonesia.</p></div>
            <h3 class="kkg-mission-title">MISI</h3>
            <ol class="kkg-mission">
                <li>Selalu berinovasi mengikuti tren fashion masyarakat.</li><li>Mengutamakan kepuasan dan pelayanan terbaik untuk pelanggan.</li><li>Membangun tempat kerja yang sehat, bertumbuh dan berkembang untuk karyawan.</li><li>Berinovasi menciptakan terobosan teknologi baru dalam segi fashion.</li><li>Menciptakan sistem pelayanan yang efisien dan memberikan pengalaman yang menyenangkan.</li>
            </ol>
        </div>
        <figure class="kkg-about-image"><?php kkg_image('about', 'Profil CV. Kasih Karunia'); ?><figcaption>CV. Kasih Karunia<span>KK UNDERWEAR</span></figcaption></figure>
    </div>
</section>
<section class="kkg-section kkg-order" data-section="order" aria-labelledby="kkg-order-title">
    <div class="kkg-container">
        <div class="kkg-center"><p class="kkg-eyebrow">CARA PEMESANAN</p><h2 id="kkg-order-title">Mulai kulakan dalam <em>4 langkah.</em></h2></div>
        <div class="kkg-grid-four kkg-steps">
        <?php foreach ($steps as $i => $step): ?>
            <article><span class="kkg-step-number">0<?php echo (int) $i + 1; ?></span><h3><?php echo esc_html($step[0]); ?></h3><p><?php echo esc_html($step[1]); ?></p></article>
        <?php endforeach; ?>
        </div>
    </div>
</section>
<section class="kkg-section kkg-faq" id="faq" data-section="faq" aria-labelledby="kkg-faq-title">
    <div class="kkg-container kkg-faq-grid">
        <div><p class="kkg-eyebrow">PERTANYAAN UMUM</p><h2 id="kkg-faq-title">Sebelum <br><em>mulai kulakan.</em></h2><p>Informasi yang membantu Anda<br>mempersiapkan pesanan grosir.</p></div>
        <div class="kkg-questions">
        <?php $i = 0; foreach ($faq as $question => $answer): $i++; ?>
            <details class="kkg-question"><summary aria-controls="kkg-answer-<?php echo $i; ?>"><?php echo esc_html($question); ?><span aria-hidden="true">+</span></summary><div id="kkg-answer-<?php echo $i; ?>"><p><?php echo esc_html($answer); ?></p></div></details>
        <?php endforeach; ?>
        </div>
    </div>
</section>
<section class="kkg-final" data-section="final" aria-labelledby="kkg-final-title">
    <div class="kkg-container kkg-center">
        <p class="kkg-eyebrow">UNTUK RESELLER &amp; PEMILIK TOKO</p>
        <h2 id="kkg-final-title">Siap Kulakan untuk Usaha Anda?</h2>
        <p>Mulai grosir dari 1 lusin. Dapatkan katalog produk dan informasi harga langsung dari tim KK Underwear.</p>
        <?php kkg_cta('final_cta', true); ?><p class="kkg-support">Melayani Pengiriman Seluruh Indonesia</p>
    </div>
</section>
</main>
<footer class="kkg-footer" data-section="footer">
    <div class="kkg-container">
        <div class="kkg-footer-top">
            <div><?php kkg_brand(); ?><?php if ($s['address']): ?><p><?php echo nl2br(esc_html($s['address'])); ?></p><?php endif; ?></div>
            <div><p class="kkg-eyebrow">KATALOG &amp; INFORMASI GROSIR</p><?php if ($s['phone']): ?><p>WhatsApp CS: +<?php echo esc_html($s['phone']); ?></p><?php endif; ?><?php kkg_cta('footer', true); ?></div>
        </div>
        <div class="kkg-footer-bottom"><small>© <?php echo esc_html(wp_date('Y')); ?> CV. Kasih Karunia.</small><div><?php if (get_privacy_policy_url()): ?><a href="<?php echo esc_url(get_privacy_policy_url()); ?>">Kebijakan Privasi</a><?php endif; ?><button type="button" class="kkg-text-button" data-kkg-settings>Pengaturan Cookie</button></div></div>
    </div>
</footer>
<div class="kkg-consent" data-kkg-banner hidden role="region" aria-label="Pilihan privasi">
    <div class="kkg-consent-copy"><strong>Privasi Anda, pilihan Anda.</strong><p>Cookie opsional membantu menghubungkan permintaan katalog dengan iklan. Anda tetap bisa menghubungi WhatsApp tanpa menyetujuinya. <?php if (get_privacy_policy_url()): ?><a href="<?php echo esc_url(get_privacy_policy_url()); ?>">Kebijakan Privasi</a><?php endif; ?></p></div>
    <div class="kkg-consent-actions"><button type="button" data-kkg-reject>Tolak Opsional</button><button type="button" data-kkg-choices>Atur Pilihan</button><button type="button" data-kkg-accept>Terima Semua</button></div>
</div>
<dialog class="kkg-dialog" aria-labelledby="kkg-privacy-title">
    <h2 id="kkg-privacy-title">Pilihan cookie</h2><p>WhatsApp tetap dapat digunakan dengan pilihan apa pun.</p>
    <label><input type="checkbox" checked disabled> Necessary — menyimpan pilihan privasi</label>
    <label><input type="checkbox" name="kkg-analytics"> Analytics</label>
    <label><input type="checkbox" name="kkg-advertising"> Advertising / Attribution</label>
    <p class="kkg-dialog-note">Analytics hanya diteruskan ke integrasi yang telah diaudit. Halaman ini tidak memasang tag analitik sendiri.</p>
    <div><button type="button" data-kkg-save>Simpan Pilihan</button><button type="button" data-kkg-close>Tutup</button></div>
</dialog>
<p class="kkg-live" aria-live="polite" role="status" data-kkg-status></p>
</div>
