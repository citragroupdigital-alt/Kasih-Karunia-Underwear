# Checklist QA & Matriks 40 Acceptance Criteria (Bab 14 PRD)

Status pengujian lokal dicatat berdasarkan eksekusi aktual skrip uji di lingkungan Windows lokal (PHP + MariaDB 11.4.5 lokal pada port `33307` + Chrome Headless Playwright + Node.js + pemeriksaan XML `.xlsx`). **Item yang bergantung pada WordPress/Jupiter/WPBakery aktual, aset asli, Google Sheets native, atau audit privacy staging ditandai secara eksplisit sebagai `BELUM DIUJI (Staging/Live)`.**

## Ringkasan Bukti Pengujian Lokal

- `npm.cmd test`: menguji domain PHP (`tests/domain.php`), izin & validasi API (`tests/api.php`), lint sintaks seluruh file PHP plugin (`php -l`), dan logika Apps Script (`tests/apps-script.test.cjs`).
- `node scripts/database-check.cjs`: menguji instalasi idempotent InnoDB, 12 request paralel pengunjung berbeda, 8 request paralel browser sama, 6 retry idempotent, reuse 24 jam tanpa perpanjangan expiry, rollover expiry, kronologi *as-of* pembayaran, cursor sync, kapasitas 9.999 kode, `repeat` order, `kkg_erase_reference`, retensi 180 hari tanpa merusak sequence, serta rate limit (`artifacts/database-results.json`).
- `node scripts/browser-check.cjs`: menguji render 10 section pada viewport `320`, `375`, `390`, `768`, `1440` px (tanpa horizontal overflow dan tanpa tumpang tindih badge MOQ), FAQ keyboard, penolakan consent, penerimaan consent + coalescing double-click, fallback API error 503, serta adapter CMP eksternal (`artifacts/browser-results.json` & `artifacts/screenshots/*.png`).
- `scripts/verify-workbook.ps1`: memverifikasi 6 nama/urutan tab, kesamaan styles/layout XML dengan baseline, validitas XML, hilangnya contoh kode `KK-GA2601` dan formula snapshot lama.

---

## Matriks 40 Acceptance Criteria

### 14.1 Frontend

| # | Kriteria PRD | Status | Bukti / Catatan & Keterbatasan |
|---|---|---|---|
| 1 | `/grosir/` menampilkan urutan 10 section sesuai Bab 4 | **LULUS (Lokal)** | `browser-check.cjs` memverifikasi 10 elemen `[data-section]` pada 5 viewport |
| 2 | Hanya 5 kategori disetujui; tanpa harga, SKU, cart, checkout, form kualifikasi | **LULUS (Lokal)** | Diverifikasi pada `templates/landing.php` dan screenshot `1440`/`375` px |
| 3 | Hero memakai foto produk asli dan H1/CTA disetujui | **SEBAGIAN (Staging)** | Copy H1 & CTA sesuai PRD; foto produk asli menunggu penyerahan aset pemilik (placeholder aktif di staging) |
| 4 | Statistik persis `70.000+`, `2.000+`, `40.000+`; tidak hilang pada mobile | **LULUS (Lokal)** | Diuji `browser-check.cjs` pada semua 5 viewport (`320`–`1440` px) |
| 5 | Copy About mengikuti gambar 1 (`image(2).png`), layout mengikuti gambar 2 (`image(3).png`) | **LULUS (Lokal)** | Copy & layout 2 kolom diverifikasi pada `templates/landing.php` dan screenshot |
| 6 | FAQ accordion berfungsi dengan keyboard dan konten tetap terbaca | **LULUS (Lokal)** | HTML `<details>` server-side + uji keyboard `Enter` & `aria-expanded` di `browser-check.cjs` |
| 7 | Header/footer khusus `/grosir/`; halaman lain tetap Jupiter tanpa perubahan | **BELUM DIUJI (Staging)** | Implementasi `kkg_template` & `kkg_is_page` siap, perlu verifikasi langsung pada WordPress + Jupiter |
| 8 | Semua CTA mengarah ke satu nomor WA yang dikonfigurasi | **LULUS (Lokal)** | Teruji seluruh 9 CTA pada preview memakai satu nomor CS resmi `62895339293140` (`browser-check.cjs`) dan `kkg_wa_url()` |
| 9 | Sticky CTA, popup WA, dan consent banner tidak saling menutupi | **LULUS (Lokal)** | Tidak ada sticky CTA tumpang tindih; banner bottom-screen & `<dialog>` modal teruji di `browser-check.cjs` |
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
| 28 | Order ID duplikat tidak menghasilkan dua Purchase | **TERBATAS (Mock VM)** | Teruji di `kkBusiness_`, `kkUploadRow_`, dan `ARRAYFORMULA(SUMPRODUCT(...))` di `tests/apps-script.test.cjs` |
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

