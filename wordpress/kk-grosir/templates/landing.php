<?php
defined('ABSPATH') || exit;
if (!function_exists('kkg_catalog_items')) {
    require_once KKG_DIR . 'includes/seo.php';
}
$categories = kkg_catalog_items();
$usps = array(
    array('Kualitas Premium', 'Bahan kain katun organik pilihan terbaik untuk kenyamanan luar biasa pelanggan Anda.', 'shield-check'),
    array('Harga Grosir', 'Harga tangan pertama langsung dari pabrik. Maksimalkan margin profit reseller Anda.', 'tag'),
    array('Kargo Termurah', 'Logistik andal dengan pilihan kargo volume besar memastikan biaya kirim tetap hemat.', 'truck'),
    array('Layanan CS', 'Tim Customer Service profesional siap membantu kebutuhan order mitra setiap hari.', 'headset'),
);
$steps = array(
    array('Minta Katalog Grosir', 'Hubungi Customer Service melalui WhatsApp.', 'message-circle'),
    array('Pilih Produk', 'Lihat katalog, informasi harga grosir, dan minimum pembelian 1 lusin.', 'shopping-bag'),
    array('Konfirmasi Pesanan', 'CS membantu memastikan detail pesanan dan pembayaran.', 'circle-check'),
    array('Pengiriman Barang', 'Pesanan diproses untuk dikirim dari Surabaya sesuai ketentuan ekspedisi.', 'truck'),
);
if (!function_exists('kkg_visible_testimonials')) {
    require_once KKG_DIR . 'includes/testimonials.php';
}
$faq = kkg_faq_items();
$testimonials = kkg_visible_testimonials(isset($s) && is_array($s) ? $s : null);
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
<main id="kkg-main" tabindex="-1">
<section class="kkg-hero" data-section="hero" aria-labelledby="kkg-title">
    <div class="kkg-container kkg-hero-grid">
        <div class="kkg-hero-copy">
            <p class="kkg-eyebrow kkg-badge"><span class="kkg-dot" aria-hidden="true"></span> SUPPLIER &amp; DISTRIBUTOR PAKAIAN DALAM · SURABAYA</p>
            <h1 id="kkg-title">Kulakan Grosir Pakaian Dalam <br>Mulai <em>1 Lusin!</em></h1>
            <p class="kkg-intro">CV. Kasih Karunia melayani grosir pakaian dalam wanita dan pria dari toko serta gudang di Surabaya sebagai supplier pakaian dalam untuk toko, agen pakaian dalam, dan reseller seluruh Indonesia. Tersedia pilihan bra (BH) wanita, celana dalam, kaos kaki, serta handuk mulai 1 lusin.</p>
            <div class="kkg-hero-cta" data-kkg-hero-cta><?php kkg_cta('hero'); ?></div>
            <p class="kkg-support"><?php echo kkg_icon('truck', 16); ?> Melayani Pengiriman ke Seluruh Indonesia</p>
        </div>
        <div class="kkg-hero-art">
            <div class="kkg-hero-image"><?php kkg_image('hero', 'Pilihan produk grosir KK Underwear', true, 'Pilihan produk grosir pakaian dalam KK Underwear Surabaya'); ?></div>
            <div class="kkg-moq"><span>Mulai dari</span><strong>12 <small>pcs</small></strong><span>1 lusin untuk mulai kulakan</span></div>
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
        <div class="kkg-grid-four">
        <?php foreach ($usps as $usp): ?>
            <article class="kkg-usp-card"><span class="kkg-icon" aria-hidden="true"><?php echo kkg_icon($usp[2], 22); ?></span><h2><?php echo esc_html($usp[0]); ?></h2><p><?php echo esc_html($usp[1]); ?></p></article>
        <?php endforeach; ?>
        </div>
    </div>
</section>
<section class="kkg-section kkg-products" id="produk" data-section="categories" aria-labelledby="kkg-products-title">
    <div class="kkg-container">
        <div class="kkg-center kkg-products-head"><p class="kkg-eyebrow">PRODUK GROSIR</p><h2 id="kkg-products-title">Pilihan produk untuk <br><em>kebutuhan toko Anda.</em></h2></div>
        <div class="kkg-carousel" data-kkg-carousel data-carousel-label="Produk Grosir" data-track-label="Daftar produk grosir">
            <div class="kkg-carousel-controls" data-kkg-carousel-controls hidden>
                <button type="button" class="kkg-carousel-btn" data-kkg-carousel-prev aria-label="Produk sebelumnya"><?php echo kkg_icon('chevron-left', 20); ?></button>
                <button type="button" class="kkg-carousel-btn" data-kkg-carousel-next aria-label="Produk berikutnya"><?php echo kkg_icon('chevron-right', 20); ?></button>
            </div>
            <div class="kkg-product-grid kkg-carousel-track" data-kkg-carousel-track>
            <?php $total_categories = count($categories); foreach ($categories as $index => $category): ?>
                <article class="kkg-product" data-kkg-carousel-slide data-slide-label="<?php echo esc_attr(($index + 1) . ' dari ' . $total_categories); ?>" data-marker-name="<?php echo esc_attr('Pilih ' . $category['name']); ?>"><div class="kkg-product-image"><?php kkg_image($category['key'], $category['name'], false, $category['alt']); ?></div><div class="kkg-product-body"><h3><?php echo esc_html($category['name']); ?></h3><p class="kkg-product-desc"><?php echo esc_html($category['description']); ?></p></div></article>
            <?php endforeach; ?>
            </div>
            <p class="kkg-sr-only" role="status" aria-live="polite" data-kkg-carousel-status></p>
            <nav class="kkg-carousel-markers" aria-label="Pilih produk grosir" data-kkg-carousel-markers hidden></nav>
        </div>
    </div>
</section>
<section class="kkg-section kkg-about" id="tentang" data-section="about" aria-labelledby="kkg-about-title">
    <div class="kkg-container kkg-about-grid">
        <div class="kkg-about-copy">
            <div class="kkg-about-head">
                <p class="kkg-eyebrow">TENTANG KAMI</p>
                <h2 id="kkg-about-title">CV. KASIH KARUNIA</h2>
            </div>
            <div class="kkg-about-body">
                <p>Kasih Karunia merupakan perusahaan yang bergerak di bidang kebutuhan harian. Kami berkomitmen memberikan produk-produk berkualitas tinggi dan terpercaya dengan harga yang terjangkau untuk kebutuhan konsumen Indonesia.<span class="kkg-desktop-only"> Semua produk Kasih Karunia memiliki bahan-bahan berkualitas terbaik dari proses produksi hingga produk jadi yang disesuaikan dengan pasar konsumen Indonesia. Kami terus berkomitmen menyediakan model dan warna terbaru sesuai dengan tren terkini.</span></p>
                <div class="kkg-vision"><h3>VISI</h3><p>Menjadi distributor pakaian dalam dan kebutuhan harian berkualitas dengan pelayanan terbaik se-Indonesia.</p></div>
                <h3 class="kkg-mission-title">MISI</h3>
                <ol class="kkg-mission">
                    <li>Selalu berinovasi mengikuti tren fashion masyarakat.</li><li>Mengutamakan kepuasan dan pelayanan terbaik untuk pelanggan.</li><li>Membangun tempat kerja yang sehat, bertumbuh dan berkembang untuk karyawan.</li><li>Berinovasi menciptakan terobosan teknologi baru dalam segi fashion.</li><li>Menciptakan sistem pelayanan yang efisien dan memberikan pengalaman yang menyenangkan.</li>
                </ol>
                <div class="kkg-about-location"><?php echo kkg_icon('map-pin', 18); ?><p><strong>Toko &amp; Gudang Surabaya:</strong> Distributor pakaian dalam Surabaya untuk toko, agen, dan reseller se-Indonesia.</p></div>
            </div>
        </div>
        <figure class="kkg-about-image"><?php kkg_image('about', 'Profil CV. Kasih Karunia', false, 'Toko dan gudang CV. Kasih Karunia distributor pakaian dalam Surabaya'); ?><figcaption>CV. Kasih Karunia<span>KK UNDERWEAR · SURABAYA</span></figcaption></figure>
    </div>
</section>
<section class="kkg-section kkg-order" data-section="order" aria-labelledby="kkg-order-title">
    <div class="kkg-container">
        <div class="kkg-center"><p class="kkg-eyebrow">CARA PEMESANAN</p><h2 id="kkg-order-title">Mulai kulakan dalam <em>4 langkah.</em></h2></div>
        <div class="kkg-grid-four kkg-steps">
        <?php foreach ($steps as $step): ?>
            <article><span class="kkg-icon kkg-step-icon" aria-hidden="true"><?php echo kkg_icon($step[2], 22); ?></span><h3><?php echo esc_html($step[0]); ?></h3><p><?php echo esc_html($step[1]); ?></p></article>
        <?php endforeach; ?>
        </div>
    </div>
</section>
<?php if ($testimonials): ?>
<section class="kkg-section kkg-testimonials" id="testimoni" data-section="testimonials" aria-labelledby="kkg-testimonials-title">
    <div class="kkg-container">
        <div class="kkg-center kkg-testimonials-head">
            <p class="kkg-eyebrow">TESTIMONI MITRA</p>
            <h2 id="kkg-testimonials-title">Apa Kata <em>Mitra Kami?</em></h2>
        </div>
        <div class="kkg-carousel" data-kkg-carousel data-carousel-label="Testimoni Mitra" data-track-label="Daftar testimoni mitra">
            <div class="kkg-carousel-controls" data-kkg-carousel-controls hidden>
                <button type="button" class="kkg-carousel-btn" data-kkg-carousel-prev aria-label="Testimoni sebelumnya"><?php echo kkg_icon('chevron-left', 20); ?></button>
                <button type="button" class="kkg-carousel-btn" data-kkg-carousel-next aria-label="Testimoni berikutnya"><?php echo kkg_icon('chevron-right', 20); ?></button>
            </div>
            <div class="kkg-testimonials-grid kkg-carousel-track" data-kkg-carousel-track>
            <?php $total_testimonials = count($testimonials); foreach ($testimonials as $t_index => $item): ?>
                <article class="kkg-testimonial-card" data-kkg-carousel-slide data-slide-label="<?php echo esc_attr(($t_index + 1) . ' dari ' . $total_testimonials); ?>" data-marker-name="<?php echo esc_attr('Pilih testimoni ' . $item['name']); ?>">
                    <div class="kkg-testimonial-top">
                        <span class="kkg-testimonial-quote-icon" aria-hidden="true"><?php echo kkg_icon('quote', 18); ?></span>
                    </div>
                    <blockquote class="kkg-testimonial-content">
                        <p>&ldquo;<?php echo esc_html($item['quote']); ?>&rdquo;</p>
                    </blockquote>
                    <div class="kkg-testimonial-author">
                        <span class="kkg-testimonial-avatar" aria-hidden="true"><?php echo !empty($item['initials']) ? esc_html($item['initials']) : kkg_icon('user', 18); ?></span>
                        <div class="kkg-testimonial-meta">
                            <h3><?php echo esc_html($item['name']); ?></h3>
                            <p><?php echo esc_html($item['category']); ?></p>
                        </div>
                    </div>
                </article>
            <?php endforeach; ?>
            </div>
            <p class="kkg-sr-only" role="status" aria-live="polite" data-kkg-carousel-status></p>
            <nav class="kkg-carousel-markers" aria-label="Pilih testimoni mitra" data-kkg-carousel-markers hidden></nav>
        </div>
    </div>
</section>
<?php endif; ?>
<section class="kkg-section kkg-faq" id="faq" data-section="faq" aria-labelledby="kkg-faq-title">
    <div class="kkg-container kkg-faq-grid">
        <div><p class="kkg-eyebrow">PERTANYAAN UMUM</p><h2 id="kkg-faq-title">Sebelum <br><em>mulai kulakan.</em></h2></div>
        <div class="kkg-questions">
        <?php $i = 0; foreach ($faq as $question => $answer): $i++; ?>
            <details class="kkg-question"><summary aria-controls="kkg-answer-<?php echo $i; ?>"><?php echo esc_html($question); ?><span class="kkg-faq-icon" aria-hidden="true"><?php echo kkg_icon('chevron-down', 18); ?></span></summary><div id="kkg-answer-<?php echo $i; ?>"><p><?php echo esc_html($answer); ?></p></div></details>
        <?php endforeach; ?>
        </div>
    </div>
</section>
<section class="kkg-final" data-section="final" aria-labelledby="kkg-final-title" data-kkg-end-guard>
    <div class="kkg-container kkg-center">
        <p class="kkg-eyebrow">UNTUK RESELLER &amp; PEMILIK TOKO</p>
        <h2 id="kkg-final-title">Siap Kulakan untuk Usaha Anda?</h2>
        <p>Mulai grosir dari 1 lusin. Dapatkan katalog produk dan informasi harga langsung dari tim KK Underwear.</p>
        <div class="kkg-final-cta"><?php kkg_cta('final_cta', true); ?></div>
        <p class="kkg-support">Melayani Pengiriman Seluruh Indonesia</p>
        <?php $kkg_consent_mode = kkg_consent_mode($s); $kkg_privacy_url = get_privacy_policy_url(); ?>
        <?php if ($kkg_privacy_url || $kkg_consent_mode !== 'disabled'): ?>
        <div class="kkg-final-privacy" data-kkg-privacy-row>
            <?php if ($kkg_privacy_url): ?><a class="kkg-privacy-link" href="<?php echo esc_url($kkg_privacy_url); ?>">Kebijakan Privasi</a><?php endif; ?>
            <?php if ($kkg_consent_mode !== 'disabled'): ?><button type="button" class="kkg-privacy-link" data-kkg-settings>Pengaturan Privasi</button><?php endif; ?>
        </div>
        <?php endif; ?>
    </div>
</section>
</main>
<div class="kkg-sticky-bar" data-kkg-sticky hidden>
    <div class="kkg-sticky-meta"><strong>Kulakan Grosir</strong><span>Mulai 1 lusin · 12 pcs</span></div>
    <?php kkg_cta('sticky'); ?>
</div>
<div class="kkg-consent" data-kkg-banner hidden role="region" aria-label="Pilihan privasi">
    <div class="kkg-consent-copy"><strong><?php echo kkg_icon('cookie', 18); ?> Privasi Anda, pilihan Anda.</strong><p>Cookie opsional membantu menghubungkan permintaan katalog dengan iklan. Anda tetap bisa menghubungi WhatsApp tanpa menyetujuinya. <?php if (get_privacy_policy_url()): ?><a href="<?php echo esc_url(get_privacy_policy_url()); ?>">Kebijakan Privasi</a><?php endif; ?></p></div>
    <div class="kkg-consent-actions"><button type="button" class="kkg-btn-outline" data-kkg-reject>Tolak Opsional</button><button type="button" class="kkg-btn-outline" data-kkg-choices>Atur Pilihan</button><button type="button" class="kkg-btn-solid" data-kkg-accept>Terima Semua</button></div>
</div>
<dialog class="kkg-dialog" closedby="any" aria-labelledby="kkg-privacy-title">
    <div class="kkg-dialog-head">
        <div><h2 id="kkg-privacy-title">Pilihan cookie</h2><p>WhatsApp tetap dapat digunakan dengan pilihan apa pun.</p></div>
        <button type="button" class="kkg-dialog-x" data-kkg-close aria-label="Tutup pilihan cookie"><?php echo kkg_icon('x', 18); ?></button>
    </div>
    <div class="kkg-dialog-fields">
        <label class="kkg-check-row"><input type="checkbox" checked disabled><span><strong>Necessary</strong><small>Menyimpan pilihan privasi Anda</small></span></label>
        <label class="kkg-check-row"><input type="checkbox" name="kkg-analytics"><span><strong>Analytics</strong><small>Pengukuran trafik (hanya ke integrasi teraudit)</small></span></label>
        <label class="kkg-check-row"><input type="checkbox" name="kkg-advertising"><span><strong>Advertising / Attribution</strong><small>Menghubungkan handoff WhatsApp dengan klik iklan</small></span></label>
    </div>
    <p class="kkg-dialog-note">Analytics hanya diteruskan ke integrasi yang telah diaudit. Halaman ini tidak memasang tag analitik sendiri.</p>
    <div class="kkg-dialog-actions"><button type="button" class="kkg-btn-outline" data-kkg-close-secondary>Tutup</button><button type="button" class="kkg-btn-solid" data-kkg-save>Simpan Pilihan</button></div>
</dialog>
<p class="kkg-toast" aria-live="polite" role="status" data-kkg-status hidden></p>
</div>
