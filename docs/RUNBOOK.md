# Panduan Operasional (Runbook) — KK Underwear `/grosir/`

Panduan ini mencakup instalasi staging, pengoperasian harian Admin & CS, verifikasi pra-rilis, rotasi kredensial, serta prosedur rollback darurat.

> **Penting:** Jangan mengaktifkan mode `active`, mengunggah dataset ke akun Google Ads live, atau memublikasikan klaim/aset sebelum seluruh blocker pada [AUDIT_AND_BLOCKERS.md](AUDIT_AND_BLOCKERS.md) mendapat persetujuan pemilik bisnis.

---

## 1. Prasyarat & Pembuatan Paket Plugin

1. Jalankan verifikasi lokal dan bangun file distribusi ZIP (simpan salinan ZIP versi sebelumnya terlebih dahulu bila ingin menjadikannya kandidat rollback karena `package-plugin.ps1` menimpa `deliverables/kk-grosir.zip`):
   ```powershell
   npm.cmd test
   # Jalankan preview pada proses terpisah (npm.cmd run preview), lalu:
   node scripts/browser-check.cjs
   & ([scriptblock]::Create((Get-Content -LiteralPath scripts/verify-workbook.ps1 -Raw)))
   & ([scriptblock]::Create((Get-Content -LiteralPath scripts/package-plugin.ps1 -Raw)))
   # Opsional bila skema/kontrak DB berubah dan target DB tes lokal terverifikasi:
   # node scripts/database-check.cjs
   ```
2. Hasil paket siap unggah tersedia pada (**paket terbaru `v0.2.10` — pembaruan Testimoni Mitra split-card carousel + lightbox WA, Meta Description 144 karakter, Technical SEO, MOQ Grosir 50 Lusin, dan Cookiebot Consent Bridge**; arsip sebelumnya `v0.2.6` di `artifacts/releases/kk-grosir-0.2.6-rc.zip`, `v0.2.5` di `artifacts/releases/rollback-0.2.5/kk-grosir-0.2.5.zip`, serta `v0.2.4` di `artifacts/releases/rollback-0.2.4/kk-grosir-0.2.4.zip`):
   - Plugin WordPress (canonical deliverable terbaru `v0.2.10`): `deliverables/kk-grosir.zip` (`v0.2.10`)
   - Workbook template 6 tab: `deliverables/KK_Underwear_Offline_Conversion_Purchase_v1.xlsx` (tidak perlu dibangun ulang selama struktur/style baseline tidak berubah)
   - Apps Script: [apps-script/Code.gs](../apps-script/Code.gs) dan [apps-script/appsscript.json](../apps-script/appsscript.json)
   - Contoh konfigurasi secret: [config/wp-config.example.php](../config/wp-config.example.php)

---

## 2. Prosedur Instalasi di WordPress Staging

1. **Backup penuh** database MySQL/MariaDB dan direktori `wp-content/` sebelum menyentuh staging/produksi.
2. Konfigurasikan **API Secret sinkronisasi** (`32–256` karakter ASCII cetak tanpa spasi atau baris baru, dibuat khusus per lingkungan — **jangan pernah** menyamakan secret staging `pmnov` dan produksi, maupun menuliskan secret asli ke Git, dokumen, log, atau chat). Tersedia dua metode konfigurasi:
   - **Metode 1 — WordPress Admin (utama bila tidak memiliki akses Hostinger hPanel / `wp-config.php`):**
     1. **Buat secret acak yang aman** (`32–256` karakter tanpa spasi, contoh menghasilkan secara lokal di PowerShell/terminal admin — bukan menyalin contoh dokumen):
        ```powershell
        $b = New-Object byte[] 36; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b) -replace '[+/=]',''
        ```
     2. Setelah plugin aktif, buka **Settings → KK Grosir → Secret sync Apps Script (write-only)**, tempel secret tersebut, lalu klik **Save Changes** (dilindungi `manage_options`, nonce CSRF, validasi panjang/karakter, dan rate-limit).
     3. **Periksa status penyimpanan tanpa menampilkan nilai:** lihat bagian **Status Integrasi** pada halaman yang sama; jika berhasil akan tampil `Secret API: Tersimpan terenkripsi via WP Admin` dan timestamp `Rotasi WP Admin (UTC)` (secret disimpan pada opsi non-autoload `kkg_sync_secret_box` terenkripsi `AES-256-GCM` / `Sodium` memakai key derivasi salt `wp-config.php` dan tidak pernah dicetak ulang ke HTML, JS, REST, maupun log).
     4. **Pasang di Apps Script:** masukkan nilai secret yang **sama persis** ke properti `KK_SYNC_API_SECRET` di project Google Apps Script target (staging atau produksi masing-masing).
     5. **Rotasi atau hapus secret:** masukkan secret baru `32–256` karakter di **Secret sync Apps Script (write-only)** lalu simpan (atau centang **Hapus secret yang tersimpan di WP Admin** untuk menghapus opsi), perbarui `KK_SYNC_API_SECRET` pada Apps Script target, lalu uji dengan **KK Grosir → Run Diagnostics**.
     6. **Bila enkripsi server tidak tersedia:** jika PHP OpenSSL GCM / Sodium atau konstanta salt `wp-config.php` (`AUTH_KEY`, `SECURE_AUTH_KEY`, `AUTH_SALT`, `SECURE_AUTH_SALT`, `LOGGED_IN_KEY`) tidak memadai (`Catatan server` muncul dan simpan menghasilkan error `500`), plugin sengaja tetap *fail-closed* (`401` di API) — serahkan pemasangan secret ke admin hosting menggunakan **Metode 2 (`wp-config.php`)**.
   - **Metode 2 — `wp-config.php` (alternatif server-level bila memiliki akses file server):**
     - Tambahkan konstanta `KKG_SYNC_SECRET` pada `wp-config.php` (lihat template [config/wp-config.example.php](../config/wp-config.example.php)):
       ```php
       define('KKG_SYNC_SECRET', 'ganti-dengan-secret-acak-minimal-32-karakter');
       ```
     - **Prioritas sumber secret (`kkg_get_sync_secret()`):** konstanta `KKG_SYNC_SECRET` di `wp-config.php` **selalu memiliki prioritas lebih tinggi** dan menimpa secret terenkripsi yang disimpan melalui WP Admin (jika konstanta terisi `< 32` karakter, status menjadi `constant_weak` dan API tetap mengunci dengan `401`).
3. Unggah `deliverables/kk-grosir.zip` melalui **Plugins → Add New → Upload Plugin**, lalu aktifkan **KK Grosir Landing & Offline Attribution**.
4. Pastikan instalasi tabel berhasil (buka **Settings → KK Grosir**, periksa status `Schema: 1`).
5. Buat/pilih halaman WordPress dengan slug persis **`grosir`**, isi dengan WPBakery satu modul Text/Shortcode berisi `[kk_grosir]`. Jangan menempelkan CSS/JS tambahan ke WPBakery Raw HTML dan jangan mengedit `functions.php` Jupiter.
6. Pada **Settings → KK Grosir**:
   - Biarkan `mode = staging` (hanya admin login `manage_options` yang dapat melihat `/grosir/` dan memanggil endpoint handoff).
   - Isi `ID halaman /grosir/`, periksa `WhatsApp CS (62...)` (default sudah terisi nomor resmi `62895339293140`), isi `Alamat toko & gudang Surabaya (untuk Schema JSON-LD)` bila ingin mencantumkan nama jalan resmi ke properti `streetAddress` JSON-LD (`addressLocality: Surabaya` sudah otomatis aktif); seluruh aset default (`logo-kk.webp`, `hero-kk.webp`, `about-gudang-kk.webp`, dan ke-5 kategori `category-0` s.d. `category-4`) sudah dibundel dan dapat dioverride dengan ID media WordPress sebelum publikasi live.
   - Biarkan `consent_mode = disabled` dan checkbox review tidak dicentang sampai audit privacy/CMP/aset/klaim USP selesai (catatan: karena footer halaman dihapus, pastikan penempatan kontrol pembuka kembali pilihan cookie apabila `consent_mode = standalone` atau `external` diaktifkan).
7. Uji halaman lain di website (beranda, produk WooCommerce, header/footer Jupiter) untuk memastikan tidak ada perubahan tampilan maupun konflik CSS/JS, serta periksa *View Page Source* pada `/grosir/` agar `<title>`, `<meta description>`, `rel="canonical"`, dan `<script type="application/ld+json">` tampil tunggal tanpa duplikasi Yoast/RankMath.
   - Opsional (AEO non-Google): jika pemilik menyetujui file root domain, unggah [`deliverables/llms.txt`](../deliverables/llms.txt) ke `/llms.txt` pada web root dan pastikan `robots.txt` tidak memblokir `Googlebot`, `Google-Extended`, `GPTBot`, `PerplexityBot`, `ClaudeBot`, maupun `Bingbot`. Panduan struktur Ad Group Google Ads Search tersedia di [`docs/SEO_AEO_GEO_ADS_PLAYBOOK.md`](SEO_AEO_GEO_ADS_PLAYBOOK.md).

---

## 3. Penyiapan Google Sheets Native & Apps Script

1. Unggah `deliverables/KK_Underwear_Offline_Conversion_Purchase_v1.xlsx` ke Google Drive lalu simpan sebagai **Google Sheets native** (*File → Save as Google Sheets*).
2. Pastikan urutan 6 tab tetap tepat: `Upload`, `Closing`, `Klik WA`, `Panduan`, `Ringkasan`, `Pengaturan`, dan timezone spreadsheet (`File → Settings`) bernilai `Asia/Jakarta`.
3. Buka **Extensions → Apps Script**:
   - Tempel isi [apps-script/Code.gs](../apps-script/Code.gs) ke `Code.gs`.
   - Aktifkan tampilan file manifest (`Project Settings → Show "appsscript.json"`), lalu samakan isinya dengan [apps-script/appsscript.json](../apps-script/appsscript.json).
4. Isi **Project Settings → Script Properties** (pada Google Sheets staging `pmnov`, pastikan hanya mengarah ke staging `pmnov`, jangan pernah mengarah ke `/franklin/` maupun produksi live):
   - `KK_SYNC_API_URL`: endpoint `/handoffs` HTTPS target:
     - **Staging `pmnov` — Plain Permalinks (kompatibel saat `?rest_route=` aktif):** `https://kk-underwear.id/pmnov/?rest_route=/kk-offline/v1/handoffs`
     - **Staging `pmnov` — Pretty Permalinks:** `https://kk-underwear.id/pmnov/wp-json/kk-offline/v1/handoffs`
     - **Produksi (hanya setelah persetujuan rilis):** `https://kk-underwear.id/wp-json/kk-offline/v1/handoffs`
     - **Mekanisme `kkEndpoint_(base, route, query)` di [Code.gs](../apps-script/Code.gs):** fungsi mengganti akhiran `/handoffs` menjadi `/reconcile` untuk lookup batch `kkReconcile_()` atau tetap `/handoffs` untuk `kkSync_()` dan `runDiagnostics()`. Parameter query pagination (`after_change_id=<cursor>&limit=100` saat sync, `limit=1` saat diagnostics) otomatis disambung memakai `?` pada Pretty Permalinks atau `&` pada Plain Permalinks (`?rest_route=...&after_change_id=...`).
   - `KK_SYNC_API_SECRET`: secret yang **identik** dengan konfigurasi aktif di WordPress target (dari **Metode 1 WP Admin** atau **Metode 2 `KKG_SYNC_SECRET` di `wp-config.php`**; gunakan secret berbeda antara staging dan produksi).
   - `KK_SPREADSHEET_ID`: ID Google Sheet native target (masing-masing terpisah untuk staging dan produksi).
   - `KK_LAST_CHANGE_ID`: `0` (awal mula cursor sinkronisasi; jangan direset sembarang jika sheet sudah berisi data).
   - `KK_IMPORT_RULES_VERIFIED`: `false` (**wajib tetap `false`** hingga aturan conversion window & usia klik Google Ads disetujui melalui dokumen terpisah; Google Ads offline upload live tidak pernah dijalankan otomatis).
5. Muat ulang spreadsheet, lalu dari menu **KK Grosir → Run Diagnostics** pastikan log Apps Script menampilkan kontrak API dan 6 tab valid tanpa mencetak secret maupun data pribadi.
6. **Jika menerapkan pembaruan `Code.gs` ke spreadsheet yang sudah berisi baris `Closing`**, jalankan **KK Grosir → Sync / Retry / Rekonsiliasi** sekali secara manual agar seluruh kolom turunan (`Closing!H:I`, `Closing!L`, dan `Upload!A:P`, termasuk penyatuan pemeriksaan duplikat `Closing!I` → `Upload!B` beserta guard `ISFORMULA`/`IFERROR`) langsung teregenerasi memakai aturan terbaru sebelum mengaktifkan trigger otomatis.
7. Jalankan **KK Grosir → Pasang trigger 15 menit** (`installKkSyncTrigger`) untuk mengaktifkan sinkronisasi periodik dan invalidasi edit (`kkOnEdit`).

---

## 4. Panduan Harian Tim CS (Tab `Closing`)

Prinsip utama: **Klik tombol WhatsApp ≠ chat terkirim ≠ Purchase.**

1. **Kolom yang diisi CS (`A:G`, `J`, `K`)**:
   - `A` (**Kode Ref**): salin kode `KK-GA{YY}{NNNN}` dari pesan pembuka WhatsApp pembeli (kosongkan jika pembeli menghapus kode atau chat langsung).
   - `B` (**Tanggal Closing**): tanggal pembayaran **terverifikasi masuk/LUNAS** sebagai **sel Date asli** (bukan teks dan bukan tanggal awal chat).
   - `C` (**Jam Closing**): jam pembayaran terverifikasi WIB (`HH:MM` sebagai **sel Time asli**).
   - `D` (**Nilai Order (IDR)**): nominal angka murni `> 0`.
   - `E` (**Nomor WA Pembeli**): opsional internal CS; **tidak pernah** disalin ke tab `Upload` atau URL.
   - `F` (**Jenis Pembeli**): pilih `Baru` atau `Repeat`. Kedua jenis tetap menjadi Purchase bisnis yang sah jika LUNAS.
   - `G` (**Catatan**): catatan operasional / keterangan refund atau pembatalan.
   - `J` (**Order ID**): **wajib diisi dan unik global** per transaksi pembayaran. Untuk **repeat order** pelanggan yang sama, buat **baris baru** dengan **Order ID baru** (boleh tetap memakai `Kode Ref` yang sama).
   - `K` (**Status Pembayaran**): pilih **`Lunas`** hanya jika pembayaran sudah benar-benar lunas; pilih **`Belum Lunas`** jika belum dibayar, batal, atau direfund.
2. **Kolom otomatis (`H`, `I`, `L` dan seluruh tab `Upload`)**:
   - Jangan mengedit manual kolom `H`, `I`, `L` di `Closing`, tab `Klik WA`, maupun tab `Upload`.
   - Setiap kali CS mengubah baris `Closing`, `kkOnEdit` akan menandai `Upload` menunggu rekonsiliasi hingga proses sinkronisasi/rekonsiliasi berikutnya berjalan (atau jalankan **KK Grosir → Sync / Retry / Rekonsiliasi**).
3. **Transaksi LUNAS tanpa kode atau tanpa Click ID**:
   - Tetap catat di `Closing` dengan `Status Pembayaran = Lunas`. Transaksi tetap terhitung pada Purchase bisnis dan omzet di `Ringkasan`, dan tidak dipaksa menjadi konversi iklan di `Upload`.
4. **Prosedur Refund / Pembatalan Setelah Lunas**:
   - **Jangan menghapus baris** transaksi dari `Closing`.
   - Ubah `Status Pembayaran` (`K`) menjadi `Belum Lunas`, catat tanggal dan alasan refund/pembatalan pada kolom `Catatan` (`G`), lalu jalankan **Sync / Retry / Rekonsiliasi** agar baris tersebut otomatis keluar dari kesiapan `Upload` sambil mempertahankan jejak audit pada Google Sheets Version History.

---

## 5. Penghapusan Data Terverifikasi & Pemantauan Admin

- **Pemantauan kesehatan**: periksa **Settings → KK Grosir** di WordPress untuk melihat `Schema`, `API dibaca terakhir (UTC)`, `Status` (`kkg_health` akan memperingatkan bila kapasitas kode mendekati `9000/9999` atau habis di `9999`), serta 20 event handoff terbaru.
- **Penghapusan data atas permintaan sah**:
  1. Pada **Settings → KK Grosir → Penghapusan data terverifikasi**, masukkan `Reference Code` lalu klik **Hapus Riwayat Kode**. Ini memanggil `kkg_erase_reference()` untuk menghapus riwayat event dan `token_hash` di WordPress sementara kode tetap direservasi agar nomor urut tidak terpakai ulang.
  2. Jika `Reference Code` terkait sudah tersinkron ke Google Sheets tab `Klik WA`, hapus/kosongkan kolom Click ID pada baris terkait di `Klik WA` secara manual sambil mempertahankan catatan operasional `Closing` sesuai kebijakan pembukuan.

---

## 6. Prosedur Go-Live (Staging → Active)

Hanya dilakukan setelah pemilik bisnis menyetujui seluruh blocker secara eksplisit:

1. Pastikan seluruh checkbox review di **Settings → KK Grosir** memang telah disetujui (`privacy_reviewed`, `claims_reviewed`, `assets_reviewed`, `release_reviewed`), nomor WA CS resmi terisi, privacy policy URL aktif, alamat terverifikasi, seluruh media ID terpasang, dan `consent_mode` (`standalone` atau `external`) sesuai hasil audit CMP.
2. Ambil backup final sebelum cutover.
3. Ubah `mode` dari `staging` ke `active` lalu simpan. Jika ada satu saja blocker yang belum terpenuhi, plugin akan menolak aktivasi otomatis (`kkg_release_blockers`).
4. Lakukan uji smoke langsung di `/grosir/` (desktop & mobile) dengan satu klik CTA nyata dan periksa tercatatnya event di admin + sinkronisasi ke tab `Klik WA`.

---

## 7. Prosedur Darurat, Rotasi Secret, dan Rollback

1. **Hentikan sinkronisasi Sheets tanpa mengganggu WordPress**:
   - Di Google Sheets, buka **KK Grosir → Stop trigger KK** (atau hapus trigger di Apps Script).
2. **Rotasi secret sinkronisasi (saat dicurigai bocor atau rotasi berkala)**:
   - Buat string acak baru (`32–256` karakter ASCII cetak tanpa spasi) secara lokal/server, **jangan kirim ke chat atau Git**.
   - **Metode 1 (WP Admin):** isi nilai baru di kolom *write-only* **Settings → KK Grosir → Secret sync Apps Script** lalu klik **Save Changes** (atau gunakan checkbox **Hapus secret yang tersimpan di WP Admin** jika mencabut akses admin-level). **Metode 2 (`wp-config.php` — prioritas lebih tinggi):** perbarui konstanta `KKG_SYNC_SECRET` langsung di `wp-config.php`.
   - Perbarui `KK_SYNC_API_SECRET` di Script Properties proyek Apps Script target agar identik, lalu uji dengan **KK Grosir → Run Diagnostics**.
3. **Rollback instan landing page / plugin**:
   - Ubah `mode` menjadi `off` di **Settings → KK Grosir** (endpoint langsung menutup dengan `503` dan `/grosir/` berhenti mengambil alih template), lalu nonaktifkan plugin **KK Grosir Landing & Offline Attribution** bila perlu.
   - Pulihkan konten halaman `/grosir/` dari backup jika ingin mengembalikan halaman lama.
   - **Jangan menghapus** tabel `{prefix}kkg_*`, `Klik WA`, `KK_LAST_CHANGE_ID`, maupun data ledger `Closing` saat rollback agar jejak audit dan data transaksi tetap aman.
4. **Urutan Pembaruan Terkendali & Pemulihan Versi (Plugin + Apps Script)**:
   - **Langkah pembaruan ke `v0.2.10` + `Code.gs` baru:**
     1. Ambil **backup penuh** (database MySQL, ZIP plugin sebelumnya mis. `kk-grosir-0.2.6-rc.zip` / `kk-grosir-0.2.5.zip`, salinan Google Sheet, dan nilai `KK_LAST_CHANGE_ID`).
     2. **Hentikan trigger Apps Script** (**KK Grosir → Stop trigger KK**).
     3. **Pasang** versi `Code.gs` dan/atau plugin ZIP yang sudah ditinjau (**Plugins → Add New → Upload Plugin**).
     4. Jalankan **KK Grosir → Run Diagnostics** hingga log memastikan kontrak API dan enam tab OK.
     5. Jalankan **KK Grosir → Sync / Retry / Rekonsiliasi** sebagai uji sinkronisasi & regenerasi kolom turunan (`Klik WA`, `Closing!H:I`, `Closing!L`, `Upload!A:P`), lalu **verifikasi** hasilnya tanpa error (jangan aktifkan impor Google Ads).
     6. **Aktifkan kembali trigger** yang diotorisasi (**KK Grosir → Pasang trigger 15 menit**).
   - **Jika pembaruan gagal di salah satu tahap:**
     1. Segera jalankan **KK Grosir → Stop trigger KK**.
     2. Pulihkan paket plugin versi sebelumnya (`artifacts/releases/rollback-0.2.5/kk-grosir-0.2.5.zip`, atau `rollback-0.2.4` bila berasal dari `0.2.4`) dan salinan `Code.gs` sebelumnya secara berpasangan bila terkait.
     3. Jalankan ulang **Run Diagnostics** dan **Sync / Retry / Rekonsiliasi** (*replay* aman tanpa duplikasi baris `Klik WA`) untuk memverifikasi keutuhan data & `KK_LAST_CHANGE_ID` **tanpa mereset ledger transaksi `Closing` atau `KK_LAST_CHANGE_ID` secara sembarang**.

