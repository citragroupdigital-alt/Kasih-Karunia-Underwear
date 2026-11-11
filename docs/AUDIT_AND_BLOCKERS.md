# Laporan Audit Awal dan Daftar Blocker Produksi

## 1. Ringkasan Audit Read-Only yang Telah Dilakukan

### 1.1 Pemeriksaan HTML Publik `https://kk-underwear.id/` (11 November 2026)

- Melalui permintaan `GET` publik (read-only, tanpa login dan tanpa mengubah situs live), respons HTML menyebut aset/jejak komponen berikut:
  - Tema & builder: `jupiter`, `js_composer_theme` (WPBakery), `jupiter-donut`, `smart-slider-3`
  - E-commerce & tracking: `woocommerce`, `pixelyoursite`, `google-site-kit`
- **Batasan temuan:** pemeriksaan HTML publik **tidak** membuktikan versi PHP/WordPress/MySQL aktual, konfigurasi tag aktif, status Google Consent Mode, perilaku plugin cache server, maupun kepatuhan Privacy Policy. Audit terautentikasi di wp-admin/staging tetap wajib sebelum `privacy_reviewed` diaktifkan.

### 1.2 Audit Baseline Workbook & Apps Script

Perbandingan terhadap baseline `KK_Underwear_Offline_Conversion_Purchase.xlsx` dan `KK_Underwear_Apps_Script_Code.gs` menemukan lima celah yang seluruhnya telah ditangani pada versi v1 ([prepare-workbook.ps1](../scripts/prepare-workbook.ps1) dan [Code.gs](../apps-script/Code.gs)):

1. Contoh kode lama `KK-GA2601` dan regex panjang variabel (`KK-GA\d{4,}`) di Apps Script & Panduan → diperbarui menjadi format ketat 4 digit `^KK-GA\d{2}(?!0000)\d{4}$` (`KK-GA260001`).
2. Sync baseline bersifat append-only dengan `after_id` & `Lead ID` → diubah menjadi upsert bercursor monotonik `after_change_id` / `change_id` menggunakan ID registry stabil pada `Klik WA!H`.
3. Formula `Upload` baseline hanya membaca snapshot terakhir `Klik WA` sehingga gagal saat Click ID berubah atau terjadi sesudah pembayaran → diganti rekonsiliasi historis *as-of* waktu pembayaran melalui `/reconcile` dengan penjaga snapshot `Closing`.
4. Batas rumus statis 500 baris `Closing` dan 5.000 baris `Klik WA` → diganti rentang kolom terbuka (`Ringkasan`), `ARRAYFORMULA(SUMPRODUCT(...))`, serta ekspansi kapasitas dinamis `kkCapacity_` (`insertRowsAfter`).
5. Formula `Upload` pada workbook distribusi `.xlsx` berpotensi memberi status `"Ya"` tanpa rekonsiliasi historis → workbook distribusi [KK_Underwear_Offline_Conversion_Purchase_v1.xlsx](../deliverables/KK_Underwear_Offline_Conversion_Purchase_v1.xlsx) memblokir kesiapan sampai Apps Script menjalankan rekonsiliasi.

---

## 2. Daftar Risiko Teknis Integrasi WordPress Staging

| Risiko | Dampak | Mitigasi dalam Kode | Verifikasi Staging yang Masih Diperlukan |
|---|---|---|---|
| Konflik CSS/JS tema Jupiter / WPBakery / WooCommerce | Layout atau kontras tombol rusak di `/grosir/` atau halaman toko lain berubah | Isolasi namespace `.kkg-*`, enqueue aset bersyarat hanya jika `kkg_is_page()`, template khusus halaman `templates/page.php` | Uji visual `/grosir/`, beranda, dan halaman produk WooCommerce di staging |
| Page cache server / plugin caching | Respons `/handoff` ter-cache atau halaman staging terlihat publik | Header `Cache-Control: private, no-store, max-age=0` pada `/kk-offline/v1/*`; `nocache_headers()` + gate `manage_options` pada staging; tidak memakai nonce publik pada pengunjung anonim | Uji di staging dengan plugin cache aktif |
| Benturan consent banner ganda atau duplikasi tag Google/Pixel | Pelanggaran privasi atau tracking berjalan sebelum izin | Default `consent_mode = disabled`; tidak memuat tag Google/Pixel sendiri; mendukung mode `external` (`KKConsent.set` + event `kkg:open-consent`) maupun `standalone` | Audit wp-admin Site Kit, PixelYourSite, CMP existing, dan Privacy Policy |
| Konkurensi & perubahan zona waktu pada server/DB | Kode ganda atau sequence melompat saat rollover tahun WIB | Named MySQL `GET_LOCK` + transaksi InnoDB + `FOR UPDATE` + `UNIQUE KEY reference_code` + konversi `Asia/Jakarta` eksplisit di PHP | Uji beban langsung pada MySQL/MariaDB staging |

---

## 3. Blocker Produksi Wajib Sebelum Go-Live (`mode = active`)

Seluruh item di bawah merupakan gate keras di `kkg_release_blockers()` ([settings.php](../wordpress/kk-grosir/includes/settings.php)) dan Bab 16 PRD. **Tidak boleh** diisi dengan data karangan.

| # | Item Blocker | Status Saat Ini | Penanggung Jawab |
|---|---|---|---|
| 1 | Nomor WhatsApp CS resmi format `62...` | **Tersedia (`62895339293140`)** — ditetapkan sebagai default `phone` pada `kkg_settings()` | Pemilik bisnis (sudah diberikan) |
| 2 | Foto produk asli Hero + 5 kategori produk | **Terpasang lengkap** — Hero ([hero-kk.webp](../wordpress/kk-grosir/assets/hero-kk.webp), `1200×1200`) serta ke-5 kategori (`826×1026` WebP rasio `4:5`: `category-0-bra-wanita.webp`, `category-1-cd-pria.webp`, `category-2-cd-wanita.webp`, `category-3-kaos-kaki.webp`, `category-4-handuk.webp`); tetap memerlukan centang `assets_reviewed` sebelum publikasi live | Pemilik bisnis / Tim kreatif |
| 3 | Foto asli profil CV. Kasih Karunia | **Terpasang untuk staging** ([about-gudang-kk.webp](../wordpress/kk-grosir/assets/about-gudang-kk.webp), `960×1192` WebP hasil optimasi `Gambar gudang KK.jpg`); disarankan memakai foto gudang asli pada publikasi live melalui persetujuan `assets_reviewed` | Pemilik bisnis / Tim kreatif |
| 4 | Logo master resolusi memadai | **Tersedia (`640×480` WebP transparan)** — dibundel di [logo-kk.webp](../wordpress/kk-grosir/assets/logo-kk.webp) | Pemilik bisnis (sudah diberikan) |
| 5 | Alamat usaha/kontak terverifikasi (Surabaya) | **Kota Surabaya terkonfirmasi** (toko & gudang di Surabaya per konfirmasi pemilik 11 Nov 2026). Alamat jalan spesifik belum diisi di kolom admin; Schema `PostalAddress` hanya mengisi `Surabaya, Jawa Timur, ID` tanpa mengarang nama jalan hingga diisi di Settings (gate blocker alamat dihapus seiring penghapusan footer) | Pemilik bisnis |
| 6 | Validasi bukti atau persetujuan copy revisi 4 klaim USP (katun organik, langsung pabrik, kargo termurah, CS setiap hari) | **Menunggu validasi** (`claims_reviewed = 0`; catatan disclaimer staging disembunyikan dari tampilan publik sesuai revisi pengguna) | Pemilik bisnis |
| 7 | Audit read-only wp-admin (versi WP/PHP/DB, Jupiter, WPBakery, WooCommerce, Site Kit, PixelYourSite, CMP, Privacy Policy) | **Belum diaudit** (`privacy_reviewed = 0`) | Developer + Admin WP |
| 8 | Persetujuan final kebijakan retensi (90 hari browser / 180 hari DB) & pilihan `consent_mode` (`standalone` / `external`) | **Masih rancangan awal** | Pemilik bisnis + Admin |
| 9 | Google Sheets native milik KK Underwear + akses editor & aktivasi Script Properties | **Belum tersedia** | Pemilik bisnis / Admin |
| 10 | Pembuatan `KKG_SYNC_SECRET` di `wp-config.php` lingkungan target & verifikasi HTTPS | **Belum dibuat di server** | Developer / Admin server |
| 11 | QA lintas perangkat/plugin di staging + konfirmasi backup/restore & rollback | **Belum dijalankan di staging** | Developer + QA + Pemilik bisnis |
| 12 | Pemetaan & verifikasi aturan impor Google Ads (`KK_IMPORT_RULES_VERIFIED`) | **Di luar scope PRD ini** (dokumen terpisah) | Tim Google Ads |

