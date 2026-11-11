# Panduan Operasional (Runbook) — KK Underwear `/grosir/`

Panduan ini mencakup instalasi staging, pengoperasian harian Admin & CS, verifikasi pra-rilis, rotasi kredensial, serta prosedur rollback darurat.

> **Penting:** Jangan mengaktifkan mode `active`, mengunggah dataset ke akun Google Ads live, atau memublikasikan klaim/aset sebelum seluruh blocker pada [AUDIT_AND_BLOCKERS.md](AUDIT_AND_BLOCKERS.md) mendapat persetujuan pemilik bisnis.

---

## 1. Prasyarat & Pembuatan Paket Plugin

1. Jalankan seluruh verifikasi lokal dan bangun file distribusi ZIP:
   ```powershell
   npm.cmd test
   node scripts/database-check.cjs
   node scripts/browser-check.cjs
   & ([scriptblock]::Create((Get-Content -LiteralPath scripts/verify-workbook.ps1 -Raw)))
   & ([scriptblock]::Create((Get-Content -LiteralPath scripts/package-plugin.ps1 -Raw)))
   ```
2. Hasil paket siap unggah tersedia pada:
   - Plugin WordPress: `deliverables/kk-grosir.zip`
   - Workbook template 6 tab: `deliverables/KK_Underwear_Offline_Conversion_Purchase_v1.xlsx`
   - Apps Script: [apps-script/Code.gs](../apps-script/Code.gs) dan [apps-script/appsscript.json](../apps-script/appsscript.json)
   - Contoh konfigurasi secret: [config/wp-config.example.php](../config/wp-config.example.php)

---

## 2. Prosedur Instalasi di WordPress Staging

1. **Backup penuh** database MySQL/MariaDB dan direktori `wp-content/` sebelum menyentuh staging/produksi.
2. Tambahkan konstanta `KKG_SYNC_SECRET` ke `wp-config.php` target (minimal 32 karakter acak yang dibuat khusus di server, jangan disimpan di repo):
   ```php
   define('KKG_SYNC_SECRET', 'ganti-dengan-secret-acak-minimal-32-karakter');
   ```
3. Unggah `deliverables/kk-grosir.zip` melalui **Plugins → Add New → Upload Plugin**, lalu aktifkan **KK Grosir Landing & Offline Attribution**.
4. Pastikan instalasi tabel berhasil (buka **Settings → KK Grosir**, periksa status `Schema: 1`).
5. Buat/pilih halaman WordPress dengan slug persis **`grosir`**, isi dengan WPBakery satu modul Text/Shortcode berisi `[kk_grosir]`. Jangan menempelkan CSS/JS tambahan ke WPBakery Raw HTML dan jangan mengedit `functions.php` Jupiter.
6. Pada **Settings → KK Grosir**:
   - Biarkan `mode = staging` (hanya admin login `manage_options` yang dapat melihat `/grosir/` dan memanggil endpoint handoff).
   - Isi `ID halaman /grosir/`, periksa `WhatsApp CS (62...)` (default sudah terisi nomor resmi `62895339293140`), isi `Alamat terverifikasi`, dan ID media gambar asli (`hero`, `about`, `category_0..4`; logo default sudah dibundel melalui `assets/logo-kk.webp` dan dapat dioverride dengan ID media WordPress jika perlu).
   - Biarkan `consent_mode = disabled` dan checkbox review tidak dicentang sampai audit privacy/CMP/aset/klaim USP selesai.
7. Uji halaman lain di website (beranda, produk WooCommerce, header/footer Jupiter) untuk memastikan tidak ada perubahan tampilan maupun konflik CSS/JS.

---

## 3. Penyiapan Google Sheets Native & Apps Script

1. Unggah `deliverables/KK_Underwear_Offline_Conversion_Purchase_v1.xlsx` ke Google Drive lalu simpan sebagai **Google Sheets native** (*File → Save as Google Sheets*).
2. Pastikan urutan 6 tab tetap tepat: `Upload`, `Closing`, `Klik WA`, `Panduan`, `Ringkasan`, `Pengaturan`, dan timezone spreadsheet (`File → Settings`) bernilai `Asia/Jakarta`.
3. Buka **Extensions → Apps Script**:
   - Tempel isi [apps-script/Code.gs](../apps-script/Code.gs) ke `Code.gs`.
   - Aktifkan tampilan file manifest (`Project Settings → Show "appsscript.json"`), lalu samakan isinya dengan [apps-script/appsscript.json](../apps-script/appsscript.json).
4. Isi **Project Settings → Script Properties**:
   - `KK_SYNC_API_URL`: `https://kk-underwear.id/wp-json/kk-offline/v1/handoffs` (atau URL staging HTTPS).
   - `KK_SYNC_API_SECRET`: nilai identik dengan `KKG_SYNC_SECRET` di `wp-config.php`.
   - `KK_SPREADSHEET_ID`: ID Google Sheet native.
   - `KK_LAST_CHANGE_ID`: `0`
   - `KK_IMPORT_RULES_VERIFIED`: `false` (ubah ke `true` hanya setelah aturan conversion window & usia klik Google Ads disetujui melalui dokumen terpisah).
5. Muat ulang spreadsheet, lalu dari menu **KK Grosir → Run Diagnostics** pastikan log Apps Script menampilkan kontrak API dan 6 tab valid tanpa mencetak secret maupun data pribadi.
6. Jalankan **KK Grosir → Pasang trigger 15 menit** (`installKkSyncTrigger`) untuk mengaktifkan sinkronisasi periodik dan invalidasi edit (`kkOnEdit`).

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
2. **Rotasi `KKG_SYNC_SECRET` (saat dicurigai bocor atau rotasi berkala)**:
   - Buat string acak baru (`>= 32` karakter), perbarui `KKG_SYNC_SECRET` di `wp-config.php`, lalu perbarui `KK_SYNC_API_SECRET` di Script Properties Google Apps Script dan uji dengan **Run Diagnostics**.
3. **Rollback instan landing page / plugin**:
   - Ubah `mode` menjadi `off` di **Settings → KK Grosir** (endpoint langsung menutup dengan `503` dan `/grosir/` berhenti mengambil alih template), lalu nonaktifkan plugin **KK Grosir Landing & Offline Attribution** bila perlu.
   - Pulihkan konten halaman `/grosir/` dari backup jika ingin mengembalikan halaman lama.
   - **Jangan menghapus** tabel `{prefix}kkg_*` atau data tab `Closing` saat rollback agar jejak audit dan data transaksi tetap aman.

