# Rencana dan keputusan implementasi

Target: plugin WordPress lokal untuk staging, bukan deployment live. PRD dan AGENTS.md tetap sumber persyaratan. Skill Ponytail dipakai untuk memilih PHP/JS native tanpa framework frontend baru.

## Inventaris dan audit awal

- Baseline GS: append-only, cursor Lead ID, contoh kode lama, belum memiliki rekonsiliasi historis.
- Workbook: enam tab sesuai PRD; Upload menggunakan snapshot Klik WA dan batas 500/5.000; contoh Panduan perlu diperbaiki.
- GET publik https://kk-underwear.id/ berhasil pada 11 November 2026. HTML menyebut jupiter, js_composer_theme, jupiter-donut, smart-slider-3, woocommerce, pixelyoursite, google-site-kit. Ini bukan bukti versi, konfigurasi atau consent berfungsi.
- Belum tersedia: akses admin/staging, runtime WordPress/database, hasil audit CMP, aset foto/logo, nomor CS, alamat, bukti USP, Google Sheets native, dan kebijakan retensi final.
- Tidak mengakses isi chat atau mengubah website/akun eksternal. Tidak memasang tag atau banner global.

## Perubahan file

- wordpress/kk-grosir/kk-grosir.php: bootstrap dan hooks WordPress.
- includes/settings.php: pengaturan, gate publikasi, konfigurasi aman dan kesehatan integrasi.
- includes/domain.php: validasi input, kode tahunan, waktu dan pesan WA.
- includes/store.php: migrasi registry/event/sequence/rate-limit, transaksi, sinkronisasi, historical lookup dan cleanup.
- includes/api.php: endpoint publik handoff dan endpoint privat sinkronisasi/rekonsiliasi.
- includes/presentation.php, templates/, assets/: shortcode, template khusus halaman, desain responsif, adapter consent, WA fallback.
- apps-script/: implementasi baru; baseline di root dipertahankan sebagai sumber audit.
- scripts/: pemeriksaan/transformasi workbook, preview lokal, pengemasan.
- tests/: pengujian domain, kontrak, sinkronisasi, Purchase dan browser.
- docs/: kontrak API, runbook, QA dan blocker.

## Keputusan teknis

- Minimal PHP 7.4 sebagai target sintaks awal; wajib dicocokkan dengan hosting aktual.
- Semua tabel plugin memakai InnoDB dan prefix aktual. Migrasi hanya menambah tabel, tidak menghapus tabel saat uninstall.
- Named DB lock per instalasi mengurutkan alokasi sequence, insert event, dan commit. Ini juga mencegah cursor melewati event transaksi lain yang belum commit. Kegagalan lock/database mengembalikan fallback WhatsApp.
- Registry terpisah dari event immutable; sinkronisasi membaca snapshot per event dengan ID registry stabil. Cleanup menjaga sequence agar nomor tidak terpakai ulang.
- Historical lookup memakai waktu pengamatan server sebelum pembayaran. Timestamp klik iklan asli tidak diasumsikan diketahui; tidak mempercayai tanggal klik yang dikirim browser.
- Token browser acak disimpan hanya dengan izin storage; expiry tetap 24 jam dari penerbitan pertama. Tanpa storage, reuse terbatas memori halaman.
- No tracking adalah default. Mode consent standalone hanya setelah audit; integrasi CMP existing menggunakan adapter eksplisit. Tidak memasang Google tag atau mengganti consent global.
- Template halaman khusus membutuhkan page ID terpilih, slug grosir dan shortcode. Halaman lain tidak diganti. Staging tidak boleh disajikan kepada pengunjung anonim.
- Upload disiapkan Apps Script melalui rekonsiliasi historis, bukan formula snapshot terakhir. Workbook distribusi memblokir kesiapan sebelum proses itu dijalankan.
- Pengaturan conversion window/usia impor harus divalidasi terpisah; tanpa itu dataset belum ditandai siap. Tidak ada unggahan Google Ads.

## Migrasi dan rollback

Backup database/files sebelum aktivasi staging. Aktifkan plugin, periksa tabel/engine, konfigurasi mode staging dan shortcode pada halaman grosir yang dipilih. Tidak membuat atau mempublikasikan halaman otomatis. Rollback: stop trigger, mode off, nonaktifkan plugin, pulihkan konten/template halaman dari backup. Data plugin dan Closing dipertahankan. Detail operasional ada di RUNBOOK.md.

## Referensi teknis

- https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/
- https://developers.google.com/apps-script/reference/lock/lock-service

Pengujian lokal tidak menggantikan QA Jupiter/WPBakery, MySQL concurrency, Google Sheets native, dan audit privacy di staging.
