<?php
defined('ABSPATH') || exit;

/**
 * Daftar data section Testimoni Mitra (terpisah dari markup template).
 *
 * Cara mengganti placeholder dengan testimoni asli nanti:
 * 1. Hapus atau ubah entri dengan `'is_placeholder' => true`.
 * 2. Tambahkan data mitra terverifikasi yang memiliki izin publikasi resmi
 *    dari pemilik bisnis dengan `'is_placeholder' => false`.
 * 3. Gunakan inisial netral atau kosongkan `'initials'` agar memakai ikon pengguna netral.
 *    Jangan mengarang nama pelanggan, kota, rating bintang, atau angka pembelian.
 *
 * Selama belum ada item bernilai `'is_placeholder' => false`, seluruh section
 * otomatis disembunyikan pada mode `active` (publik) dan hanya tampil untuk
 * administrator pada mode `staging`.
 */
function kkg_testimonials_data() {
    return array(
        array(
            'name' => 'Pak Agus',
            'category' => 'Reseller Pakaian Dalam',
            'quote' => 'Awalnya sempat ragu mau mulai kulakan pakaian dalam karena modal toko masih terbatas. Di KK Underwear Surabaya bisa belanja grosir bra dan celana dalam mulai 1 lusin, jadi stok harian cepat berputar.',
            'initials' => 'PA',
            'is_placeholder' => true,
        ),
        array(
            'name' => 'Pak Budi',
            'category' => 'Pemilik Toko Pakaian',
            'quote' => 'Sangat terbantu untuk isi etalase toko karena supplier pakaian dalam wanita, celana dalam pria, kaos kaki, sampai handuk lengkap di satu tempat. Tanya produk lewat WhatsApp CS juga cepat dan jelas.',
            'initials' => 'PB',
            'is_placeholder' => true,
        ),
        array(
            'name' => 'Ibu Lala',
            'category' => 'Pelanggan Grosir',
            'quote' => 'Belanja untuk kebutuhan agen pakaian dalam dari gudang Surabaya terasa rapi, mulai dari minta katalog grosir sampai konfirmasi kirim ekspedisi. Cocok buat toko yang cari distributor pakaian dalam.',
            'initials' => 'IL',
            'is_placeholder' => true,
        ),
    );
}

/**
 * Mengembalikan daftar testimoni yang boleh tampil sesuai mode plugin dan hak akses.
 *
 * @param array|null $s Pengaturan plugin opsional.
 * @return array Daftar testimoni yang siap dirender.
 */
function kkg_visible_testimonials($s = null) {
    $s = is_array($s) ? $s : kkg_settings();
    $items = kkg_testimonials_data();
    $verified = array_values(array_filter($items, static function ($item) {
        return empty($item['is_placeholder']);
    }));
    if ($verified) {
        return $verified;
    }
    $is_staging_admin = ($s['mode'] ?? 'off') === 'staging' && current_user_can('manage_options');
    return $is_staging_admin ? $items : array();
}
