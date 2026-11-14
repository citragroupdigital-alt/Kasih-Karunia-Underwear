# Checklist QA & Matriks 40 Acceptance Criteria (Bab 14 PRD)

Status pengujian lokal dicatat berdasarkan eksekusi aktual skrip uji di lingkungan Windows lokal (PHP 8.3.36 + Chrome Headless Playwright + Node.js v24.18.1 + pemeriksaan XML `.xlsx`). **Item yang bergantung pada WordPress/Jupiter/WPBakery aktual (`pmnov`), aset asli, Google Sheets native, atau audit privacy staging ditandai secara eksplisit sebagai `BELUM DIUJI (Staging/Live)` dan tidak menggantikan verifikasi `T08`/`R08`.**

## Ringkasan Bukti Pengujian Lokal

- `npm.cmd test` (**21 / 21 tes lulus**, 14 Nov 2026 — `v0.2.13`): menguji domain PHP + modul SEO/Schema (`<title>`, meta description tepat `144` karakter tunggal, `<html lang="id-ID">` terisolasi, `publisher` JSON-LD, pencegahan `_wp_render_title_tag`, absennya frasa MOQ lama `1 lusin`/`12 pcs`/`kulakan`) + 3 testimoni aktif (tanpa ikon petik & kontrol `Jeda`) + modul `invoices.php` (3 faktur tersensor aktif, validasi path/tanggal, gate isolasi non-approved/placeholder/missing-file, kemunculan independen saat testimoni kosong, serta bebas kebocoran PII/harga/rekening), Final CTA ringkas SEO, mode consent + enqueue/filter atribut Cookiebot Bridge & isolasi halaman non-`/grosir/` + guard PRIV-01/PRIV-05 & `kkg_cleanup()` server (`PHP domain: 192 checks passed` di `tests/domain.php`), izin API & secret terenkripsi write-only WP Admin (`API: 28 checks passed` di `tests/api.php`), lint sintaks seluruh file PHP plugin (`php -l`), dan logika/batch/formula + parser URL `?rest_route=` Apps Script (`tests/apps-script.test.cjs` — `T02`, `T03`, dan `R05b`).
- `node scripts/database-check.cjs`: menguji instalasi idempotent InnoDB, konkurensi, retry, reuse, kronologi *as-of* pembayaran, retensi, dan rate limit (`artifacts/database-results.json`). **Catatan `R07` (`v0.2.6`–`v0.2.13`):** server MariaDB lokal (`127.0.0.1:33307`) tidak aktif pada sesi build `v0.2.6`–`v0.2.13`, sehingga `database-check.cjs` berstatus `NOT RUN`; perilaku guard & eksekusi `kkg_cleanup()` tetap diuji via mock `$wpdb` terisolasi pada `tests/domain.php`, dan fixture guard ditambahkan di `tests/db-scenarios.php`.
- `npm.cmd run preview` + `node scripts/browser-check.cjs` (**21 / 21 cek lulus, 0 error**, 14 Nov 2026 — `v0.2.13`): selain cakupan render section, mobile revisions, visibilitas kartu `.kkg-moq` (`50 LUSIN`) di desktop & mobile, Sticky CTA (`Minimum Grosir 50 Lusin`), Technical SEO (`<title>` tunggal, meta description tepat `144` karakter tunggal, `lang="id-ID"`, `publisher` JSON-LD, 9 item FAQ), ketiadaan frasa MOQ lama (`1 lusin`/`12 pcs`/`kulakan`), JSON-LD, FAQ keyboard, coalescing double-click, fallback 503, kontrol buka-ulang privasi, perbaikan staging `STG-01`–`STG-04`, dan split-card carousel **Cerita Mitra Kasih Karunia** (`3` testimoni aktif tanpa ikon petik dua dan tanpa tombol `Jeda`/autoplay), turut memverifikasi section independen **Bukti Transaksi Grosir Nyata** (`#bukti-transaksi`, `3` faktur tersensor aktif tanpa badge staging, tata letak `1`/`2`/`3`/`4` kartu di desktop/tablet/mobile carousel, status `empty`/`unapproved`/`missing_image`, kemunculan independen saat testimoni kosong, serta lightbox `<dialog>` bersama berkemampuan zoom, prev/next, keyboard `ArrowLeft`/`ArrowRight`, focus restoration, dan isolasi penuh dari testimoni/Cookiebot/WA CTA) serta 15 skenario simulasi **Cookiebot Consent Bridge** secara lokal menggunakan mock SDK (fail-closed pra-respons, Deny, Allow All, Statistics-only, Marketing-only, Withdraw tanpa menghapus cookie Cookiebot/WooCommerce, reload persistence tanpa `?gclid=`, async & blocked Cookiebot fallback, `Cookiebot.renew()`/`show()`, 0 request tracker pihak ketiga, dan kompatibilitas `disabled`/`standalone`). **Catatan:** perilaku Cookiebot CDN live & Google Tag Assistant tetap `BELUM DIUJI (Staging/Live)`.
- `scripts/verify-workbook.ps1`: memverifikasi 6 nama/urutan tab, kesamaan styles/layout XML dengan baseline, validitas XML, hilangnya contoh kode `KK-GA2601` dan formula snapshot lama (lulus 13 Nov 2026; workbook tidak diubah pada `v0.2.8`–`v0.2.13`).
- Paket & rollback: `artifacts/releases/rollback-0.2.4/kk-grosir-0.2.4.zip`, `artifacts/releases/rollback-0.2.5/kk-grosir-0.2.5.zip`, dan `artifacts/releases/kk-grosir-0.2.6-rc.zip` dipertahankan; paket rilis terbaru `v0.2.13` berada di `deliverables/kk-grosir.zip`.

## Status Tindak Lanjut Audit Ponytail (`T00–T09`)

| Task | Status | Hasil & Lokasi Bukti Aktual | Batas / Belum Diuji |
| --- | --- | --- | --- |
| T00 — Baseline | **SELESAI (Lokal)** | 21 file dicadangkan beserta SHA-256 (`artifacts/checkpoints/t00-baseline/`); baseline `npm.cmd test` (14/14) & `kkSync_` mock (`25` write, `1.220.000` sel, `75` format, `25` commit) tercatat | DB MariaDB & `verify-workbook.ps1` tidak dijalankan ulang di T00 |
| T01 — Buka kembali privasi | **LULUS (Lokal)** | `Pengaturan Privasi` (`[data-kkg-settings]`) & `Kebijakan Privasi` kondisional di Final CTA (`presentation.php`, `landing.php`, `landing.css`, `landing.js`); lulus `domain.php` & `browser-check.cjs` di 6 viewport | `get_privacy_policy_url()` dinamis & adapter CMP live di WordPress staging (**T08**) |
| T02 — Batch penulisan sync | **TERBATAS (Mock VM)** | `kkSync_()` mengumpulkan maks `25` halaman / `120.000 ms` lalu menulis sekali (`t02-t03-metrics.json`: **`1` write, `48.800` sel, `3` format, `1` flush, `1` commit cursor** pada simulasi `6.100` baris); seluruh uji fail/replay/clock lulus | Performa & kuota Google Apps Script / Google Sheets native (**T08**) |
| T03 — Formula duplikat | **TERBATAS (Mock VM)** | `Closing!I` memindai duplikat (`550` scan untuk `550` baris), `Upload!B` memakai ulang `Closing!I` + penjaga `ISFORMULA`/`NOT(ISERROR)`/`IFERROR` (`0` scan duplikat di `Upload`), tulis/flush `Closing` sebelum `Upload`; lulus `evalSheetFormula` | Evaluasi formula aktual pada mesin kalkulasi Google Sheets native (**T08**) |
| T04 — Runtime WordPress | **LULUS (Lokal)** | `function_exists` yang ditargetkan di `seo.php`/`testimonials.php` & fallback domain `kk-underwear.id` dihapus; shim dipusatkan di `tests/wp-shim.php` (`https://example.test`), `current_user_can()` dipanggil langsung; lulus `domain.php`, `api.php`, `browser-check.cjs` | Runtime WordPress/Jupiter/Yoast/RankMath staging (**T08**) |
| T05 — Deteksi Hero sticky CTA | **LULUS (Lokal)** | `window.addEventListener('scroll', updateHero)` dihapus; init sekali + satu `heroObserver` (`IntersectionObserver`); lulus `browser-check.cjs` (scroll, anchor, reload tengah halaman, resize, dialog/banner/Final CTA, `reducedMotion`) | Uji perangkat nyata staging & browser tanpa `IntersectionObserver` (**T08**) |
| T06 — Token CSS `--kkg-target` | **LULUS (Lokal)** | 2 deklarasi & media query `--kkg-target` dihapus di `landing.css` (`REMAINING_CODE_REFS=0`); `browser-check.cjs` & `npm.cmd test` lulus tanpa perubahan ukuran kontrol | Tidak membuat tes baru khusus konstanta mati |
| T07 — Regresi lokal gabungan | **LULUS (Lokal)** | `npm.cmd test` **20/20** lulus (`4.747 ms`), `browser-check.cjs` **16/16** lulus (`0` error), `api.php`/`store.php`/`domain.php`/`settings.php` 0 diff, `git diff --check` bersih, bukti di `artifacts/qa/t07-local-regression/` | Staging WP/Sheets (**T08**), build ZIP & runbook rilis (**T09**); **status proyek keseluruhan tetap belum selesai** |
| T08 — QA staging WP & Sheets | **DILEWATI SEMENTARA / BELUM DIUJI** | — | Dilewati sementara atas arahan pengguna (12 Nov 2026); **tetap wajib dijalankan** sebelum go-live `mode = active` (menunggu akses WordPress staging + Google Sheets native) |
| T09 — Release candidate | **LULUS (Lokal — Staging Candidate `0.2.5`)** | Rollback `0.2.4` tersimpan (`artifacts/releases/rollback-0.2.4/kk-grosir-0.2.4.zip`); plugin/shim/tes dinaikkan ke `0.2.5`; `deliverables/kk-grosir.zip` (`24` file, `638.071` byte, SHA-256 di `artifacts/releases/rc-0.2.5-manifest.json`), `verify-workbook.ps1`, `npm.cmd test` (**20/20**), `browser-check.cjs` (**16/16**), dan `RUNBOOK.md` diperbarui | **BUKAN izin publikasi live**: paket `0.2.5` siap untuk uji staging (`T08`); `mode = active` tetap dilarang hingga `T08` dan seluruh blocker pemilik selesai |

---

## Matriks 40 Acceptance Criteria

### 14.1 Frontend

| # | Kriteria PRD | Status | Bukti / Catatan & Keterbatasan |
|---|---|---|---|
| 1 | `/grosir/` menampilkan urutan section landing page (11 section termasuk `Cerita Mitra Kasih Karunia` dan `Bukti Transaksi Grosir Nyata` pada `staging` dan `active` setelah seluruh aset disetujui; otomatis menyembunyikan section non-approved/kosong secara independen; tanpa footer) | **LULUS (Lokal)** | `browser-check.cjs` memverifikasi urutan eksak 11 `[data-section]` (`order` → `testimonials` → `invoices` → `faq` → `final`) baik di `staging` maupun `?mode=active`, serta perilaku independen pada `?testimonials=unapproved` / `?testimonials=empty` / `?invoices=unapproved` / `?invoices=empty` / `?invoices=missing_image` |
| 2 | Hanya 5 kategori disetujui; tanpa harga, SKU, cart, checkout, form kualifikasi | **LULUS (Lokal)** | Diverifikasi pada `templates/landing.php` dan screenshot `1440`/`375` px |
| 3 | Hero memakai foto produk asli dan H1/CTA disetujui | **SEBAGIAN (Staging)** | Gambar Hero terpasang di [hero-kk.webp](../wordpress/kk-grosir/assets/hero-kk.webp) (`1200×1200` WebP dari `Hero Section KK.jpg`), H1 `Grosir Pakaian Dalam untuk Stok Usaha Mulai 50 Lusin!`, badge `MINIMUM ORDER 50 LUSIN` (tampil di desktop & mobile), & CTA `Minta Katalog Grosir`; foto asli/persetujuan `assets_reviewed` diverifikasi sebelum `mode = active` |
| 4 | Statistik persis `70.000+`, `2.000+`, `40.000+`; tidak hilang pada mobile | **LULUS (Lokal)** | Diuji `browser-check.cjs` pada semua 5 viewport (`320`–`1440` px) |
| 5 | Copy About mengikuti gambar 1 (`image(2).png`), layout mengikuti gambar 2 (`image(3).png`) | **LULUS (Lokal)** | Copy (dengan istilah `daily needs` disesuaikan menjadi `kebutuhan harian` atas revisi pengguna 11 Nov 2026) & layout 2 kolom diverifikasi pada `templates/landing.php` dan screenshot |
| 6 | FAQ accordion berfungsi dengan keyboard dan konten tetap terbaca | **LULUS (Lokal)** | HTML `<details>` server-side (9 item FAQ sesuai MOQ `50 lusin` & layanan `100 lusin atau lebih`) + uji keyboard `Enter` & `aria-expanded` di `browser-check.cjs` |
| 7 | Header khusus `/grosir/` tanpa footer halaman (revisi pengguna); halaman lain tetap Jupiter | **BELUM DIUJI (Staging)** | Implementasi `kkg_template` & `kkg_is_page` siap tanpa footer di `/grosir/`; kontrol `Pengaturan Privasi` (`[data-kkg-settings]`) & tautan `Kebijakan Privasi` kondisional telah ditempatkan di section `Final CTA` hanya ketika mode consent efektif `standalone`/`external` (`T01`), masih perlu verifikasi WordPress + Jupiter staging (`T08`) |
| 8 | Semua CTA mengarah ke satu nomor WA yang dikonfigurasi | **LULUS (Lokal)** | Teruji seluruh 4 CTA (`header`, `hero`, `sticky`, `final_cta`; CTA kategori dan footer dihapus atas instruksi pengguna) memakai satu nomor CS resmi `62895339293140` (`browser-check.cjs`) |
| 9 | Sticky CTA, popup WA, dan consent banner tidak saling menutupi | **LULUS (Lokal)** | Teruji di `browser-check.cjs` (`375px`): sticky mobile CTA otomatis tersembunyi saat Hero CTA, banner consent, dialog cookie, atau section Final CTA (`data-kkg-end-guard`) terlihat |
| 10 | Hero/foto/konten tidak pecah di desktop/tablet/mobile | **LULUS (Lokal)** | `scrollWidth <= innerWidth` & bebas tumpang tindih MOQ pada `320`, `375`, `390`, `768`, `1440` px (perlu uji ulang setelah foto asli dipasang) |

### 14.2 Reference Code dan Handoff

| # | Kriteria PRD | Status | Bukti / Catatan & Keterbatasan |
|---|---|---|---|
| 11 | Klik pertama memberi `KK-GA260001` sesuai sequence tahun dan tercatat di DB | **LULUS (Lokal)** | Teruji di `tests/domain.php` dan `tests/db-scenarios.php` pada MariaDB lokal |
| 12 | Dua pengunjung bersamaan tidak menerima kode yang sama | **LULUS (Lokal)** | 12 worker paralel menghasilkan 12 kode unik di `scripts/database-check.cjs` |
| 13 | Klik berulang dalam 24 jam memakai kode sama dan tiap event dicatat | **LULUS (Lokal)** | 8 request paralel browser sama menghasilkan 1 kode & 8 event; reuse non-perpanjangan diuji di `db-scenarios.php` |
| 14 | Klik setelah expiry mendapatkan kode baru tanpa memperpanjang kode lama | **LULUS (Lokal)** | Teruji di `tests/db-scenarios.php` |
| 15 | Klik iklan baru saat reuse menyimpan histori Click ID dan memperbarui ringkasan | **LULUS (Lokal)** | Teruji di `tests/db-scenarios.php` + `tests/apps-script.test.cjs` |
| 16 | Klik baru setelah pembayaran tidak mengatribusikan Purchase sebelumnya | **LULUS (Lokal)** | Teruji `kkg_lookup_store` as-of payment di `tests/db-scenarios.php` dan `kkAttribution_` |
| 17 | Tidak ada kode > 4 digit; kapasitas 9.999/tahun berhenti tanpa mengulang nomor | **LULUS (Lokal)** | Teruji di `tests/domain.php` dan `tests/db-scenarios.php` (sequence berhenti di `9999`) |
| 18 | Tanpa Click ID/izin pelacakan, WA tetap terbuka tanpa data iklan terlarang | **LULUS (Lokal)** | Teruji di `browser-check.cjs` (`deniedConsent`) dan `tests/domain.php` |
| 19 | REST gagal/timeout: fallback WA tanpa kode tetap bisa dipakai | **LULUS (Lokal)** | Teruji HTTP 503 fallback pada `browser-check.cjs` (`apiFailure`) |
| 20 | Klik tombol WA tidak tercatat sebagai Purchase maupun chat terkirim | **LULUS (Lokal)** | Hanya mencatat event handoff di `{prefix}kkg_events`; label admin/Panduan menegaskan hal ini |

### 14.3 Sheets dan Closing

| # | Kriteria PRD | Status | Bukti / Catatan & Keterbatasan |
|---|---|---|---|
| 21 | Enam nama/urutan sheet dan layout visual tetap seperti template | **LULUS (Lokal)** | Terverifikasi byte-level `styles.xml` & layout XML oleh `scripts/verify-workbook.ps1` |
| 22 | Apps Script upsert satu baris `Klik WA` per kode tanpa duplikasi | **TERBATAS (Mock VM)** | Logika `kkUpsertPlan_` teruji di `tests/apps-script.test.cjs`; perlu uji di Google Sheets native |
| 23 | Idempotent sync: rerun setelah gagal tidak menggandakan Lead ID/kode | **TERBATAS (Mock VM)** | Teruji `kkUpsertPlan_` replay & cursor non-commit di `tests/apps-script.test.cjs`; perlu uji di Google Sheets native |
| 24 | `Klik WA!E` berupa Date asli dan tampil WIB | **TERBATAS (Mock VM)** | `kkUtc_` menghasilkan `Date` asli & `setNumberFormat` WIB; perlu verifikasi konversi di Google Sheets native |
| 25 | Closing `LUNAS` dengan Order ID unik, nilai > 0, waktu valid masuk Purchase bisnis | **TERBATAS (Mock VM)** | Teruji `kkBusiness_` di `tests/apps-script.test.cjs`; formula `Ringkasan` perlu uji di Google Sheets native |
| 26 | Pembayaran belum `LUNAS` tidak menjadi Purchase | **TERBATAS (Mock VM)** | Teruji di `tests/apps-script.test.cjs` |
| 27 | Dua Order ID berbeda pada satu Reference Code = dua Purchase bisnis jika LUNAS | **TERBATAS (Mock VM)** | Teruji di `tests/db-scenarios.php` dan `tests/apps-script.test.cjs` |
| 28 | Order ID duplikat tidak menghasilkan dua Purchase | **TERBATAS (Mock VM)** | Teruji di `kkBusiness_`, `Closing!I` (`ARRAYFORMULA(SUMPRODUCT(...))`), dan pemakaian ulang `Closing!I` oleh `Upload!B` dengan penjaga `ISFORMULA`/`IFERROR` (`T03`, 550 scan di Closing & 0 duplikat scan di Upload); evaluasi mesin formula nyata wajib dibuktikan di Google Sheets native (`T08`) |
| 29 | Kode tidak ditemukan/tanpa Click ID tetap transaksi bisnis, bukan konversi beratribusi | **TERBATAS (Mock VM)** | Teruji di `kkAttribution_` dan formula `Ringkasan` |
| 30 | Rekonsiliasi tidak menganggap klik sesudah Purchase sebagai atribusi valid | **LULUS (Lokal + Mock)** | Diuji baik pada `kkg_lookup_store` (`db-scenarios.php`) maupun `kkAttribution_` (`apps-script.test.cjs`) |
| 31 | Semua contoh kode format lama diganti `KK-GA{YY}{NNNN}` | **LULUS (Lokal)** | Diverifikasi di seluruh XML workbook oleh `verify-workbook.ps1` dan di `Code.gs` |
| 32 | Data di luar batas 500/5.000 baris tidak hilang diam-diam | **TERBATAS (Mock VM)** | Teruji ekspansi `550` baris Closing & `6.100` baris Klik WA di `tests/apps-script.test.cjs`; perlu uji di Google Sheets native |
| 33 | `Upload` tidak otomatis mengaktifkan unggahan ke Google Ads live | **LULUS (Lokal)** | Tidak ada kode API Google Ads; `KK_IMPORT_RULES_VERIFIED` default `false` |

### 14.4 Privasi, Keamanan, Operasi

| # | Kriteria PRD | Status | Bukti / Catatan & Keterbatasan |
|---|---|---|---|
| 34 | Audit privacy/tracking existing terdokumentasi sebelum enablement | **BELUM DIUJI (Staging)** | Audit awal tercatat di `AUDIT_AND_BLOCKERS.md`, namun audit wp-admin/CMP live belum dilakukan |
| 35 | Penolakan consent opsional tidak menghalangi WhatsApp | **LULUS (Lokal)** | Teruji di `browser-check.cjs` (`deniedConsent`) |
| 36 | Token API tidak terlihat di frontend, respons publik, sheet publik, atau log | **LULUS (Lokal)** | Secret hanya dari `KKG_SYNC_SECRET` & Script Properties; teruji tidak ada token/Click ID di respons atau WA URL |
| 37 | API sync tak terautentikasi ditolak tanpa membocorkan isi database | **LULUS (Lokal)** | Teruji HTTP `401` di `tests/api.php` |
| 38 | Trigger sinkronisasi dapat dimatikan tanpa mematikan website | **TERBATAS (Mock + Docs)** | `stopKkSyncTrigger()` tersedia di `Code.gs` dan terdokumentasi di `RUNBOOK.md` |
| 39 | Tidak ada benturan CSS/JS, error PHP, atau perubahan global di Jupiter/WPBakery/WooCommerce | **BELUM DIUJI (Staging)** | Sintaks PHP lulus (`php -l`) & CSS scoped `.kkg-*`, perlu uji langsung di staging |
| 40 | Backup, rollback, dan panduan CS/admin selesai diuji sebelum publikasi | **SEBAGIAN (Docs siap, Staging belum)** | `RUNBOOK.md` dan `package-plugin.ps1` tersedia; uji backup/restore aktual menunggu staging |

