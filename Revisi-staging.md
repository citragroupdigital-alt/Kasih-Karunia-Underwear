# Revisi Staging KK Grosir v0.2.5 — Handoff Implementasi untuk Antigravity

**Tanggal penyusunan:** 13 November 2026  
**Status:** Daftar revisi dan tindak lanjut berdasarkan QA staging yang sudah dilaksanakan; **bukan persetujuan go-live**.  
**Repository:** `citragroupdigital-alt/Kasih-Karunia-Underwear`  
**Basis implementasi:** plugin `wordpress/kk-grosir/` **v0.2.5** dan Google Apps Script `apps-script/Code.gs`.  
**Staging aktif untuk QA berikutnya:** `https://kk-underwear.id/pmnov/`  
**Staging lama:** `https://kk-underwear.id/franklin/` — gagal diakses, **jangan ditimpa/dihapus** tanpa keputusan terpisah.  
**Landing staging:** halaman Draft **ID 5008**, slug `grosir`, shortcode `[kk_grosir]`.  
**Privacy Policy staging:** halaman Draft **ID 5010**.  
**Mode plugin:** `staging`; **consent:** `disabled`.

> **Instruksi utama untuk Antigravity:** Gunakan dokumen ini sebagai spesifikasi perubahan dan daftar verifikasi. Implementasikan perubahan pada **branch pengembangan / paket rilis kandidat**, uji secara lokal dan di staging `pmnov` setelah persetujuan deployment. **Jangan mengedit website produksi, menyalakan Google Ads offline import, mengganti mode menjadi `active`, menghapus data QA, atau menjalankan migrasi/reset staging lama.** Jangan menafsirkan status QA yang belum diuji sebagai PASS.

---

## 1. Ringkasan eksekutif dan prioritas

| ID | Prioritas | Jenis | Temuan / kebutuhan | Aksi Antigravity |
|---|---|---|---|---|
| **STG-01** | P2 | UI | Sticky CTA mobile terlalu dominan/besar dibanding teks di kiri | **Perbaiki CSS mobile**, pertahankan target sentuh minimum |
| **STG-02** | P2 | UI/konten QA | Teks testimoni placeholder terlalu panjang, kartu mobile kurang ringkas | **Ringkas placeholder & rapikan CSS**; jangan publikasikan testimoni fiktif |
| **STG-03** | **P1** | SEO | Open Graph Yoast dan plugin KK Grosir muncul bersamaan, dengan nilai berbeda | **Perbaiki isolasi output SEO pada halaman Grosir saja** |
| **STG-04** | P2 | UI | Banner kuning `PREVIEW STAGING · ...` ingin dihapus | **Hilangkan banner visual saja**, jangan hapus gate keamanan staging |
| **WP-08** | **P1 — blocker integrasi** | Backend/security | Tidak ada akses hPanel untuk memasang `KKG_SYNC_SECRET` melalui `wp-config.php` | **Desain fitur administrasi secret yang aman melalui WP Admin**, tetap fail-closed |
| **WP-09** | P1 — blocker **staging lama** | Infrastruktur | `franklin` Unhealthy; frontend, login dan aset statis 404 Jupiter | **Investigasi hosting/routing**, bukan patch sembarang di plugin; gunakan `pmnov` untuk QA |
| **PRIV-01** | P1 sebelum rilis | Konten/konfigurasi | Tautan Kebijakan Privasi tidak muncul; kebijakan baru masih Draft | **Finalisasi kebijakan, tetapkan halaman yang benar, audit isi**; potensi peringatan admin |
| **PRIV-05** | P1 sebelum rilis | Konfigurasi keamanan | Lima checkbox audit/approval pernah aktif sebelum audit selesai | **Pastikan semua di-reset dan terverifikasi**, pertahankan release blockers; evaluasi UX peringatan |
| **PRIV-06** | P3 / QA | Verifikasi non-destruktif | Form hapus Reference Code tampil, fungsi hapus aktual belum diuji | **Jangan dianggap defect**; tambahkan/validasi tes aman dengan kode dummy baru |

**Penting soal status:** STG-01–04 adalah permintaan revisi eksplisit pengguna atau temuan visual/SEO. WP-08 membutuhkan perubahan kode tetapi desain penyimpanan secret harus lulus security review. WP-09 adalah masalah **lingkungan staging `franklin`**, sementara `pmnov` sudah bisa login. PRIV-01 dan PRIV-05 adalah **blocker kebijakan/konfigurasi**, belum terbukti sebagai bug kode. PRIV-06 adalah **cakupan tes yang belum selesai**, bukan bug yang terkonfirmasi.

---

## 2. Konteks faktual hasil QA — jangan diulang dari nol

### 2.1 Lingkungan

- `franklin` dibuat dahulu melalui WP STAGING, kemudian gagal; WP STAGING menunjukkan `Unhealthy / Unreachable`. Semua uji berikut menuju halaman 404 tema Jupiter: `/franklin/wp-admin/`, `/franklin/wp-login.php`, `/franklin/index.php`, `/franklin/wp-content/plugins/kk-grosir/assets/landing.js`, `/franklin/wp-includes/js/jquery/jquery.min.js`.
- Staging pengganti `pmnov` dapat di-login; hasil Network awal tidak menunjukkan request ke `googletagmanager.com`, `google-analytics.com`, `connect.facebook.net`, dan `doubleclick.net`. Pada `pmnov`, **PixelYourSite** dan **Site Kit by Google** telah dibuat **Inactive**.
- Homepage Jupiter dan halaman produk WooCommerce pernah lulus pada `franklin`; tidak otomatis dianggap pengujian ulang lengkap pada `pmnov`.
- Akses anonim `pmnov` dengan Incognito memunculkan login atau permintaan password (**SEC-02 PASS awal**). WooCommerce Webhooks `pmnov` tidak memiliki webhook terdaftar (**SEC-03 PASS**). Tidak ada plugin SMTP/email eksternal yang aktif (**SEC-04 pemeriksaan awal PASS**). WP STAGING saat pembuatan `pmnov` menunjukkan isolasi Email/Cron/WooCommerce, tetapi operasi layanan eksternal tetap perlu diaudit sebelum tindakan destruktif/transaksi.
- Halaman landing `5008` masih **Draft**; permalink staging memakai format query (`?page_id=...`) akibat **Plain permalink** dari WP STAGING. **Jangan menganggap canonical query staging sebagai bug SEO sampai diverifikasi pada halaman staging yang aman dan konfigurasi permalink yang benar.**

### 2.2 Hasil pengujian yang sudah didukung bukti pengguna

| Area | Bukti / hasil | Batas interpretasi |
|---|---|---|
| Responsive | Pengguna menilai desktop, mobile 320/390 px dan tablet 768 px tampil normal; FAQ dan carousel testimoni berfungsi | Belum membuktikan seluruh ukuran atau accessibility lengkap |
| SEO | Title, description, `noindex,nofollow`, JSON-LD `@graph`, `Organization/WholesaleStore`, `FAQPage`, `BreadcrumbList`, `OfferCatalog` terdeteksi | Validitas semua properti JSON-LD belum diuji komprehensif; ada **duplikasi OG Yoast** |
| Handoff WA | Pesan mengandung Reference Code `KK-GA260002`; kode ditemukan pada Riwayat Handoff | Klik/handoff **bukan** bukti chat terkirim atau Purchase |
| Asal CTA | `KK-GA260002` -> `header` dan telah dikonfirmasi cocok; `KK-GA260001` -> `final_cta` juga terlihat dalam admin | Event kedua belum dikonfirmasi ulang asal kliknya |
| REST API privat | GET `/pmnov/?rest_route=/kk-offline/v1/handoffs` tanpa Bearer token -> `401 kk_unauthorized` | Penggunaan secret sah dari Apps Script belum diuji |
| REST API handoff | GET `/pmnov/?rest_route=/kk-offline/v1/handoff` -> `404 rest_no_route` | Pengujian hanya GET; POST berhasil secara tidak langsung melalui handoff UI |
| Privacy localStorage | Pada DevTools tidak terlihat `kkg-click` atau `kkg-token` ketika `consent_mode=disabled` | Bukan audit semua cookie/penyimpanan pihak ketiga |
| Form hapus | `Penghapusan data terverifikasi` muncul di admin | **Belum menekan tombol hapus**; dua kode QA harus dipertahankan |
| Google Sheets | Google Sheets khusus staging dengan enam tab tersedia; `Code.gs` dan `appsscript.json` terpasang; saat diperiksa Apps Script memiliki 0 trigger | Sinkronisasi native, rekonsiliasi dan upload Ads **belum diuji** |

### 2.3 Konfigurasi Apps Script yang harus diperhatikan

- Di Apps Script terdapat `KK_SYNC_API_URL` yang sempat diarahkan ke **`/franklin/`**, bukan staging pengganti `pmnov`. **Sebelum uji integrasi ulang**, arahkan **hanya konfigurasi proyek Apps Script staging** ke endpoint pada **`/pmnov/`** dan verifikasi bahwa path API benar-benar dapat diakses.
- **Perhatian teknis penting:** kode saat ini di `apps-script/Code.gs::kkConfig_()` **hanya menerima** format `https://.../wp-json/kk-offline/v1/handoffs` melalui regex; `kkSync_()` menambahkan parameter dengan `?after_change_id=...`. Sementara itu WP STAGING menggunakan **Plain permalinks** dan uji API manual memakai `?rest_route=...`. **Jangan mengganti nilai ke URL query-style saja**, karena validasi regex dan penggabungan query Apps Script akan gagal. Pilihan implementasi: (a) verifikasi/benahi REST pretty URL **hanya di `pmnov`** tanpa memodifikasi permalink produksi, atau (b) tambahkan dukungan resmi query-style ke Apps Script, termasuk pembentukan parameter `&after_change_id=...` dan endpoint `/reconcile`, dengan unit test dan validasi origin/HTTPS yang ketat.
- `KK_SPREADSHEET_ID` sudah ditambahkan untuk Google Sheets **khusus staging**. **Jangan memasukkan ID spreadsheet atau secret dalam log, dokumen publik, atau source code**.
- `KK_SYNC_API_SECRET` dan secret yang identik di WordPress belum disiapkan/terverifikasi. **Jangan jalankan `runDiagnostics`, `syncWaLeadsToSheet`, `installKkSyncTrigger`, atau `kkOnEdit` sampai WP-08 diselesaikan dan endpoint staging diverifikasi.**
- `KK_IMPORT_RULES_VERIFIED` harus tetap `false` hingga aturan Google Ads disetujui; **tidak boleh ada upload Google Ads live otomatis**.

---

## 3. Spesifikasi revisi kode

### STG-01 — Kecilkan sticky CTA mobile agar proporsional

**Observasi QA:** tombol gradien `Minta Katalog Grosir` pada sticky footer mobile tampak terlalu besar/mendominasi teks kiri `Kulakan Grosir / Mulai 1 lusin · 12 pcs`, meskipun layout fungsional.

**Lokasi kode:**
- `wordpress/kk-grosir/assets/landing.css`: `.kkg-sticky-bar`, `.kkg-sticky-meta`, `.kkg-sticky-bar .kkg-button`, media query mobile termasuk aturan sekitar `max-width: 600px`.
- `wordpress/kk-grosir/templates/landing.php`: baris markup `kkg-sticky-bar` / `kkg_cta('sticky')`.

**Perubahan:**
1. Rapikan lebar/ruang tombol, gap, padding horizontal dan tinggi visual sticky bar agar sisi teks kiri tidak terdesak.
2. Target tipografi tombol yang tetap jelas, sekitar **13–14 px bila sesuai layar**, dan tombol tidak terlihat terlalu tinggi. **Jangan mengurangi area sentuh efektif di bawah 44 px** meskipun tampilan dibuat lebih ringkas.
3. Pertahankan teks CTA, ikon, nomor CS, event context `sticky`, safe-area iOS dan kondisi show/hide sticky.
4. Jangan mengubah desain desktop, menu header, atau event attribution.

**Acceptance criteria:** Pada 320, 375, 390 dan 768 px tidak ada overflow, tombol dapat ditekan, teks kiri terbaca, layout lebih seimbang, sticky tidak menutup Final CTA/banner consent/keyboard.

### STG-02 — Ringkas placeholder testimoni dan padatkan kartu mobile

**Observasi QA:** carousel berfungsi, tetapi isi testimoni staging terlalu panjang sehingga kartu mobile terlalu tinggi.

**Lokasi kode:**
- `wordpress/kk-grosir/includes/testimonials.php`: `kkg_testimonials_data()`.
- `wordpress/kk-grosir/assets/landing.css`: `.kkg-testimonial-card`, `.kkg-testimonial-content p`, responsive `.kkg-testimonials .kkg-testimonial-card`.
- `wordpress/kk-grosir/templates/landing.php`: output carousel testimoni.

**Perubahan:**
1. Persingkat tiga **teks placeholder khusus staging** menjadi copy ringkas; hindari klaim baru dan testimonial yang dibuat seolah-olah benar-benar berasal dari pelanggan.
2. Untuk mobile, evaluasi `font-size` sekitar **14–15 px**, `line-height` **1.5–1.6**, serta padding kartu yang lebih ringkas dengan jarak antarelemen seimbang.
3. **Pertahankan `is_placeholder => true` dan gate `kkg_visible_testimonials()`**: placeholder tidak boleh tampil di mode `active`/publik. Jangan mengubah placeholder menjadi testimoni asli tanpa bukti/izin.
4. Pertahankan kontrol panah, marker, scroll-snap, `aria-label`, dan status carousel.

**Acceptance criteria:** teks tidak terpotong/overlap pada 320/375/390 px; kontrol carousel berfungsi; testimoni placeholder tidak tampil pada mode `active`.

### STG-03 — Hilangkan metadata OG duplikat dari Yoast khusus landing Grosir

**Temuan terkonfirmasi di source halaman staging:** Yoast dan plugin KK Grosir sama-sama mengeluarkan metadata Open Graph. Contoh konflik: `og:locale=en_US` vs `id_ID`, `og:type=article` vs `website`, dan `og:site_name` yang berbeda. Judul/description/robots plugin telah terlihat; hanya output OG/SEO ganda yang perlu dibereskan.

**Lokasi kode:** `wordpress/kk-grosir/includes/seo.php`, khususnya `kkg_seo_page_isolation()`, `kkg_seo_render_head()`, serta hook pada `wordpress/kk-grosir/kk-grosir.php`.

**Perubahan:**
1. Lakukan integrasi kompatibel dengan Yoast yang **benar-benar menonaktifkan output Open Graph/Twitter/schema Yoast pada halaman KK Grosir saja**, atau gunakan satu sumber metadata yang dipilih secara konsisten. Filter parsial sekarang belum mencegah seluruh `og:*` Yoast muncul.
2. Jangan menonaktifkan Yoast global atau SEO halaman WooCommerce/homepage. Hindari output ganda untuk `<title>`, meta description, robots, canonical, OG/Twitter dan JSON-LD.
3. Pertahankan `noindex,nofollow` selama staging dan release gate. Pertahankan graph yang sudah ada (`Organization`, `WholesaleStore`, `WebPage`, `BreadcrumbList`, `OfferCatalog`, `FAQPage`) dan FAQ yang sinkron dengan isi halaman.
4. Canonical pada Draft dengan Plain permalinks berupa `?page_id=5008` **belum ditetapkan sebagai bug**; verifikasi ulang setelah tersedia URL staging yang aman, bisa diakses, dan konfigurasi permalink diverifikasi.

**Acceptance criteria:** pada halaman Grosir hanya ada satu set OG yang tidak konflik (termasuk `og:locale`, `og:type`, `og:site_name`), satu meta description/robots/canonical dan satu JSON-LD graph sesuai desain; di halaman lain Yoast tetap berfungsi; staging tetap noindex.

### STG-04 — Hapus banner kuning `PREVIEW STAGING` dari landing

**Permintaan eksplisit pengguna:** hilangkan banner kuning bertuliskan:

> PREVIEW STAGING · Foto, logo, klaim USP dan konfigurasi CS menunggu verifikasi. Belum untuk publikasi.

**Lokasi kode:**
- `wordpress/kk-grosir/templates/landing.php`: kondisi `if ($s['mode'] === 'staging')` dan `<aside class="kkg-staging" ...>`.
- `wordpress/kk-grosir/assets/landing.css`: rule `.kkg-staging` jika tidak digunakan lagi.

**Perubahan:** Hapus **elemen visual tersebut saja** dari halaman agar tampilan bersih. Jangan menghapus/turunkan `mode=staging`, syarat login admin, `noindex`, `kkg_release_blockers()`, admin warning, consent gate, atau proteksi REST API. Jangan mengganti banner dengan pop-up lain tanpa persetujuan.

**Acceptance criteria:** tidak ada strip kuning/ruang kosong di atas header pada Preview; dashboard admin tetap menunjukkan blocker/audit; pengunjung non-admin tidak dapat mengakses landing staging.

### WP-08 — Konfigurasi secret sinkronisasi lewat WP Admin tanpa akses hosting

**Blocker nyata:** Administrator tidak mempunyai akses Hostinger hPanel / file `wp-config.php`. Pada v0.2.5, API privat hanya membaca `defined('KKG_SYNC_SECRET') ? KKG_SYNC_SECRET : ''`, sehingga endpoint `/handoffs` dan `/reconcile` tidak dapat diakses secara terautentikasi oleh Apps Script sampai secret disiapkan.

**Lokasi kode:**
- `wordpress/kk-grosir/includes/api.php` — `kkg_api_permission($request, true)`.
- `wordpress/kk-grosir/includes/settings.php` — admin form, penyimpanan settings, notice secret.
- `docs/RUNBOOK.md` dan `config/wp-config.example.php`.
- `apps-script/Code.gs` — properti `KK_SYNC_API_URL`, `KK_SYNC_API_SECRET`, dan endpoint integrasi.

**Perubahan yang diminta:**
1. Rancang **alternatif konfigurasi secret yang aman melalui `Settings → KK Grosir`** khusus administrator, tanpa harus mengedit server. Tetap dukung cara server-side existing (`KKG_SYNC_SECRET` constant / lingkungan) sebagai opsi utama dan jelaskan **prioritas sumber secret** yang tidak ambigu.
2. Field **write-only** untuk set/rotasi secret (minimal 32 karakter rahasia berentropi tinggi), jangan tampilkan kembali nilai asli setelah disimpan. Tampilkan hanya status `Terpasang / Belum terpasang` dan waktu rotasi bila diperlukan.
3. Harus ada `manage_options`, nonce/CSRF protection, sanitasi ketat, rate limit dan audit yang **tidak merekam nilai secret**. Jangan mengekspos secret melalui HTML, REST response, JS, log, Git, preview, debug, atau spreadsheet.
4. Pastikan penyimpanan aman terhadap akses tidak sah; **jangan sekadar menambahkan option plaintext/autoloaded di `wp_options`**. Rancang penyimpanan terenkripsi/restricted dengan key material terpisah dari DB apabila memungkinkan; wajib security review. Jika tidak ada mekanisme aman yang layak di hosting ini, tetap **fail-closed** dan nyatakan kebutuhan bantuan admin hosting, **bukan menghapus autentikasi Bearer**.
5. Ekstraksi pembacaan secret ke satu helper teruji (misalnya `kkg_get_sync_secret()`), lalu gunakan pada `/handoffs` dan `/reconcile`. Harus menolak secret tidak ada/lemah dengan `401` seperti sebelumnya.
6. Sediakan prosedur mengubah/merotasi secret dan memasang nilai yang sama ke `KK_SYNC_API_SECRET` di **Apps Script staging** tanpa mengirim nilainya ke percakapan/log. **Jangan pernah salin secret produksi ke staging**.
7. Pastikan konfigurasi Apps Script staging tidak lagi menuju `/franklin/`; arahkan ke endpoint **`/pmnov/`** yang **teruji sesuai pola URL yang didukung kode**. Jika REST memakai `?rest_route=...`, update parser URL, pembangunan query dan route `/reconcile` di `apps-script/Code.gs`, bukan sekadar mengganti Script Properties. Jangan memasang trigger sebelum `Run Diagnostics` berhasil pada spreadsheet staging native.
8. Tetap tidak ada upload Google Ads otomatis; `KK_IMPORT_RULES_VERIFIED` tidak boleh diaktifkan otomatis.

**Acceptance criteria:** Admin bisa mengonfigurasi/merotasi secret tanpa hosting **setelah security review**, nilai tidak bocor, `401` tanpa secret/wrong secret, autentikasi sukses dengan secret valid dari Apps Script staging, `runDiagnostics` dan sync ke Google Sheets enam tab bekerja tanpa duplikasi, tidak ada panggilan ke produksi. Jika fallback aman tidak memungkinkan, dokumen rilis harus menyatakan WP-08 tetap blocker.

### WP-09 — `franklin` Unhealthy / 404 adalah isu lingkungan, bukan bukti bug KK Grosir

**Bukti:** WP STAGING mendaftarkan `franklin` tetapi status `Unhealthy / Unreachable`. Semua URL PHP/admin **dan aset JS statis** dalam `/franklin/` menampilkan HTML 404 dari Jupiter. Staging `pmnov` dibuat kemudian dan sudah bisa login.

**Tindak lanjut yang diminta:**
1. **Jangan mengubah kode plugin untuk mengatasi WP-09 tanpa diagnosis.** Periksa bersama pengelola hosting/WP STAGING Support apakah folder staging lama lengkap, mapping root, `.htaccess`/Nginx rewrite, WAF, redirect atau isolasi staging mengalami gangguan.
2. Jangan menekan `Reset`, `Update`, `Delete`, `Push Changes` pada `franklin`; data tes lama/backup harus aman sampai diputuskan.
3. Lanjutkan semua pengujian di `pmnov`, lalu dokumentasikan kondisi akhir `franklin` sebagai isu operasional terpisah. Bila `franklin` diputuskan akan dihapus, perlu backup/izin eksplisit dahulu.

**Acceptance criteria:** penyebab 404 `franklin` diidentifikasi/ditutup sebagai keputusan operasional; **tidak ada regresi pada produksi maupun `pmnov`**. Keberhasilan `pmnov` tidak otomatis menyelesaikan WP-09.

---

## 4. Privasi, keamanan, dan QA yang belum selesai

### PRIV-01 — Kebijakan Privasi belum siap dipublikasikan

**Temuan:** tautan `Kebijakan Privasi` tidak muncul pada Final CTA landing. Dari kode `templates/landing.php`, tautan kondisional memakai `get_privacy_policy_url()`. Pengguna membuat halaman Privacy Policy ID **5010** pada staging `pmnov` dan memasukkan draf bahasa Indonesia khusus WhatsApp Attribution, tetapi **status halaman masih Draft**; penetapan halaman pada `Settings → Privacy` dan publikasi kebijakan **belum terverifikasi**.

**Tindak lanjut:**
- Finalisasi dan minta persetujuan pemilik/legal atas kebijakan (kontak resmi hak subjek data, retensi sebenarnya, proses penghapusan, pihak ketiga/WhatsApp, penggunaan Google Sheets, produk WooCommerce, mekanisme consent). Jangan klaim kepatuhan hukum dari template saja.
- Saat kebijakan siap, tetapkan halaman kebijakan yang benar melalui **Settings → Privacy** pada **staging**, kemudian periksa tautan dan isi. **Jangan menjadikan halaman Grosir ID 5008 sebagai Privacy Policy.**
- Pertimbangkan admin-only release notice yang spesifik bila `get_privacy_policy_url()` belum tersedia. Tidak perlu mengubah fallback publik sehingga kebijakan draf terpublikasi tanpa izin.

**Acceptance criteria:** Kebijakan final yang disetujui dapat diakses melalui tautan `Kebijakan Privasi` pada landing, tidak mengarah ke Draft/staging dari produksi, dan disclosure sesuai perilaku kode. Sampai saat itu status PRIV-01 = **Open**.

### PRIV-05 — Approval/cleanup sempat aktif terlalu dini

**Bukti:** screenshot QA menunjukkan semua checkbox `privacy_reviewed`, `claims_reviewed`, `assets_reviewed`, `release_reviewed`, `cleanup_enabled` **dicentang** saat kebijakan masih Draft. Pengguna diminta mengosongkan semuanya lalu Save; **belum ada screenshot konfirmasi setelah penyimpanan**. Jangan berasumsi sudah selesai.

**Lokasi kode:** `includes/settings.php` (`kkg_release_blockers()`, form approval dan handler simpan), `includes/store.php` (`kkg_cleanup()`, retensi `retention_days=180`).

**Tindak lanjut:**
1. Verifikasi kelima checkbox **kosong** di `pmnov` setelah reload; jangan mengubah produksi. `mode=staging`, `consent_mode=disabled`, retensi 180 hari sebagai nilai sementara.
2. Review apakah perlu konfirmasi terpisah/penjelasan lebih jelas di admin sebelum menyatakan `release_reviewed=1`, atau admin notice jika approval belum terbukti. Jangan mengubah data approved diam-diam tanpa proses audit.
3. Jangan menyimpulkan cleanup teruji hanya dari checkbox: pada kode cleanup berjalan terjadwal, dan mensyaratkan `privacy_reviewed && cleanup_enabled`.

**Acceptance criteria:** sebelum approval riil, mode `active` tetap diblokir, consent optional tidak aktif, dan tidak ada cleanup data yang tidak diotorisasi. Setelah legal/operasional menyetujui, audit masa simpan dan jadwal cleanup secara terpisah.

### PRIV-06 — Form penghapusan tersedia, fungsi hapus nyata belum diverifikasi

**Bukti:** admin menampilkan `Riwayat handoff (admin)`, dua kode/dua event; ada form `Penghapusan data terverifikasi`. Fungsi `kkg_erase_reference()` pada `includes/store.php` menghapus event dan memutus `token_hash` sambil mempertahankan reservasi kode. **Tidak ada tes destruktif yang dijalankan pengguna.**

**Tindak lanjut QA:** buat Reference Code **dummy baru dan jelas terisolasi di staging**, dokumentasikan ID, uji authorization/nonce, hapus hanya dummy setelah persetujuan, pastikan kode tidak dipakai ulang, dan pastikan jejak data di Google Sheets direduksi/dihapus melalui prosedur bila sudah sinkron. **Jangan menghapus** `KK-GA260001` atau `KK-GA260002` sebagai bukti pengujian yang ada.

### PRIV-07 dan PRIV-08

- **PRIV-07 PASS awal:** `kkg-click` dan `kkg-token` tidak terlihat pada Local Storage saat `consent_mode=disabled`; pertahankan perilaku ini.
- **PRIV-08 PENDING:** belum ada laporan final apakah banner cookie dan tombol `Pengaturan Privasi` benar-benar tersembunyi pada `pmnov` ketika consent disabled. Jangan tandai PASS tanpa uji.

### Aspek keamanan tambahan

- Pengujian API tanpa secret **PASS** (`401 kk_unauthorized`), dan GET pada route POST handoff **PASS** (`404 rest_no_route`). Tambahkan regresi untuk kedua kasus setelah WP-08.
- Tracking Google/Meta tidak terlihat pada empat domain yang dicek di Network `pmnov` (**PASS awal, bukan audit menyeluruh**). PixelYourSite & Site Kit tetap Inactive selama QA.
- Jangan melakukan checkout, mengirim email nyata atau mengirim chat ke CS untuk membuktikan handoff; klik CTA **bukan** bukti chat terkirim maupun Purchase.
- Sebelum sinkronisasi, verifikasi pengamanan email, pemicu Apps Script, URL API dan hak akses Google Sheet staging. WP STAGING melaporkan isolasi email, cron dan tindakan WooCommerce saat clone, tetapi konektor pihak ketiga perlu diuji terpisah.

---

## 5. Urutan implementasi yang diminta

1. **Backup / branch:** buat branch revisi dari baseline v0.2.5. Pastikan ZIP rilis lama dan data staging aman. Tidak mengubah produksi.
2. **Patch UI yang terisolasi:** STG-01, STG-02, STG-04. Hindari perubahan CSS global di luar namespace `.kkg-*`.
3. **Patch SEO:** STG-03 hanya pada halaman ID yang cocok dengan shortcode/slug Grosir. Sertakan pengujian Yoast aktif.
4. **Desain & security review backend:** WP-08. Jangan implementasi field plaintext tanpa proteksi hanya demi menyingkirkan blocker.
5. **Dokumentasi environment:** WP-09 untuk admin hosting/WP STAGING Support; bukan perubahan global WordPress.
6. **Finalisasi privacy dan approval:** PRIV-01, PRIV-05. Uji PRIV-06 secara terisolasi dan non-destruktif terhadap data eksisting.
7. **Regresi lokal dan staging:** ulangi checklist di bawah; tidak aktifkan mode `active` atau impor Google Ads.
8. **Handoff rilis:** serahkan diff, ringkasan perubahan per ID, bukti uji, batasan yang belum selesai, ZIP kandidat baru, petunjuk update/rollback. Jangan menimpa arsip rollback lama.

---

## 6. Checklist acceptance / regression setelah patch

### Unit, browser, package

- [ ] `npm test` pada root repo lulus (baseline dokumentasi: 20/20 sebelum revisi; **bukan klaim hasil revisi**).
- [ ] `node scripts/browser-check.cjs` lulus (baseline dokumentasi: 16/16 sebelum revisi); tambahkan skenario untuk STG-01, STG-02, STG-04, dan duplikasi SEO.
- [ ] PHP lint file yang diubah, test domain/API/SEO, validasi packaging dan `git diff --check` lulus.
- [ ] Tidak ada hardcoded secret, nomor uji, URL `franklin` yang tertinggal dalam koneksi staging baru, atau data sensitif di log.

### WordPress staging `pmnov`

- [ ] `mode=staging`, `consent_mode=disabled`, `page_id=5008`, shortcode `[kk_grosir]`, status Draft terjaga selama QA.
- [ ] Di 320/375/390/768 px, CTA sticky tidak mendominasi, tidak overflow, area tekan >=44 px, tidak menutup konten/consent.
- [ ] Placeholder testimoni compact dan staging-only; carousel swipe/arrow/marker tetap bekerja.
- [ ] Strip `PREVIEW STAGING` hilang tanpa menghilangkan login gate, release blockers dan `noindex`.
- [ ] Dengan Yoast aktif, source halaman Grosir menunjukkan satu set OG/Twitter/schema yang benar; homepage/produk tetap menampilkan SEO Yoast normal.
- [ ] FAQ, hero, footer Jupiter halaman non-Grosir, halaman produk WooCommerce dan link WA tidak mengalami regresi.
- [ ] Pemantauan Network tetap tidak menemukan request iklan produksi yang tidak semestinya.
- [ ] Link Privacy Policy baru muncul **setelah** dokumen final disetujui & ditetapkan (jangan mempublikasikan Draft karena test saja).
- [ ] Kelima checkbox approval di `pmnov` diverifikasi kembali sesuai status audit sebenarnya.
- [ ] `KK-GA260001` dan `KK-GA260002` tetap ada sampai pengujian selesai; jangan hapus/ubah data existing.

### API / Google Sheets (masih terblokir WP-08 sampai solusi aman siap)

- [ ] GET privat tanpa secret -> `401` dan tidak membocorkan data.
- [ ] GET `/handoff` -> `404 rest_no_route`.
- [ ] Secret staging valid, tidak terekspos, dapat dirotasi dan autentikasi ke endpoint staging sukses.
- [ ] `KK_SYNC_API_URL` Apps Script staging mengarah ke `/pmnov/`, bukan `/franklin/` atau produksi; bila URL memakai `?rest_route=`, penggabungan query dan pemanggilan `/reconcile` ikut teruji.
- [ ] Spreadsheet staging native memiliki enam tab `Upload`, `Closing`, `Klik WA`, `Panduan`, `Ringkasan`, `Pengaturan`; `Run Diagnostics` benar-benar sukses sebelum trigger.
- [ ] Uji idempotensi sync, tidak ada duplikat Reference Code, timestamp benar Asia/Jakarta; simulasi closing dan rekonsiliasi tanpa Google Ads live.
- [ ] Fitur penghapusan data diuji hanya pada kode dummy terisolasi, bukan kode QA pengguna.
- [ ] `KK_IMPORT_RULES_VERIFIED=false` selama belum ada persetujuan aturan conversion/import.

### Infrastruktur

- [ ] `pmnov` tetap dapat diakses admin, anonim diblokir; tidak ada 404 aset atau PHP.
- [ ] `franklin` tetap disimpan/ditangani berdasarkan keputusan hosting; **jangan reset atau hapus tanpa backup dan otorisasi**.
- [ ] Backup/restore dan rollback diverifikasi sebelum perubahan versi atau rilis apa pun.

---

## 7. Artefak yang harus dikembalikan Antigravity

1. **Patch source code** terstruktur per issue ID, dengan daftar file berubah dan alasan perubahan.
2. **Bukti uji** unit, browser, staging, compatibility Yoast, keamanan API, dan privasi (PASS/FAIL/BLOCKED, jangan menebak).
3. **Perubahan dokumentasi** `docs/RUNBOOK.md`, `docs/QA_CHECKLIST.md` dan catatan blocker sesuai hasil nyata; tunjukkan alur secret staging jika berhasil ditambah.
4. **Rilis kandidat ZIP** dengan versi/manifest yang jelas dan rollback yang aman, **hanya setelah tes lokal lulus**; deployment ke staging/produksi memerlukan instruksi eksplisit pemilik.
5. **Daftar blocker yang masih terbuka**: terutama WP-08 jika penyimpanan secret aman belum disepakati, PRIV-01 finalisasi kebijakan, WP-09 penanganan staging lama, dan pengujian Google Sheets native yang belum selesai.

## 8. Batasan keputusan dan pengingat

- Ini merupakan **permintaan revisi berdasarkan QA aktual**, bukan bukti bahwa semua kode bermasalah. QA yang sudah lulus harus dipertahankan.
- **Jangan menyalin secret ke dokumen, GitHub, chat, output API, frontend, atau Google Sheets publik.**
- **Jangan membuat/memalsukan testimoni nyata, alamat usaha spesifik, persetujuan legal, status pembayaran, maupun conversion Google Ads.**
- Klaim empat USP dan aset final perlu verifikasi bisnis. Staging mungkin menampilkan placeholder yang sengaja disembunyikan saat `active`.
- Plugin tidak dapat membuktikan pesan WA benar-benar terkirim. Satu event `handoff` bukan satu Purchase.
- Perubahan source tidak boleh otomatis mengubah status approval, menghapus riwayat, mengaktifkan CMP, atau mengizinkan tracking tanpa izin.
- **Titik akhir dokumen:** Antigravity boleh mengerjakan revisi sesuai prioritas, tetapi **go-live tetap dilarang** sampai checklist operasional/privasi/Google Sheets yang relevan benar-benar PASS dan disetujui pemilik.
