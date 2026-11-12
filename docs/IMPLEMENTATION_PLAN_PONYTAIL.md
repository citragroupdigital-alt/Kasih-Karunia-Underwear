# Implementation Plan — Tindak Lanjut Audit Ponytail

**Tanggal:** 12 November 2026\
**Dasar:** [Audit Overengineering Ponytail](AUDIT_OVERENGINEERING_PONYTAIL.md), [AGENTS.md](../AGENTS.md), dan [PRD](../PRD-kk-underwear.md).\
**Status:** rencana; seluruh task belum dikerjakan. Permintaan ini mengotorisasi penyusunan dokumen, bukan perubahan kode atau deployment.

## Sasaran dan batas pekerjaan

Selesaikan enam temuan audit melalui perubahan kecil yang dapat diuji dan ditinjau per task. Pertahankan WordPress existing, kontrak API, enam tab spreadsheet, input CS, riwayat atribusi, aturan Purchase, serta desain yang sudah disetujui.

Tidak diperlukan migrasi database, dependency baru, penggantian framework, atau perubahan akun Google Ads. Perkiraan pengurangan baris pada audit bukan target penerimaan; perilaku yang benar dan berkurangnya pekerjaan berulang menjadi ukuran keberhasilan.

## Daftar task dan urutan pengerjaan

| Status | Task | Hasil yang diserahkan | Prioritas | Bergantung pada |
| --- | --- | --- | --- | --- |
| [x] | T00 — Persiapan | Baseline sumber dan hasil tes tercatat | Wajib sebelum edit | — |
| [x] | T01 — Buka kembali privasi | Kontrol privasi tetap dapat diakses (selesai lokal; verifikasi WordPress/CMP live di T08) | Wajib sebelum consent diaktifkan | T00 |
| [x] | T02 — Batch penulisan sync | Satu penulisan data per batch terkumpul (selesai lokal; verifikasi Google Sheets live di T08) | Tinggi | T00 |
| [x] | T03 — Formula duplikat | Upload memakai pemeriksaan duplikat bersama (selesai lokal; evaluasi mesin formula Google Sheets live di T08) | Tinggi | T02 |
| [x] | T04 — Runtime WordPress | Cabang untuk runtime tiruan dipindahkan ke tes (selesai lokal; verifikasi WordPress staging di T08) | Menengah | T00 |
| [x] | T05 — Deteksi Hero | Satu mekanisme menentukan status Hero (selesai lokal; QA WordPress staging di T08) | Rendah | T01 |
| [x] | T06 — Token CSS | Token yang tidak digunakan dihapus (selesai lokal) | Rendah | T00 |
| [x] | T07 — QA lokal gabungan | Hasil regresi dan bukti sebelum/sesudah (lokal lulus; staging tetap T08 & rilis T09) | Wajib | T01–T06 |
| [ ] | T08 — QA integrasi staging | Bukti WordPress dan Sheets native (dilewati sementara atas arahan pengguna; wajib sebelum go-live live) | Wajib sebelum rilis | T07 + akses staging |
| [x] | T09 — Release candidate | Paket `v0.2.5`, panduan `RUNBOOK.md`, dan rollback `v0.2.4` siap untuk uji staging (BUKAN izin go-live; T08 masih tertunda) | Wajib sebelum rilis | T07 (umumnya T08; T08 ditunda atas instruksi pengguna) |

Urutan praktis: **T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09**. Dependensi T03 pada T02 menjaga perubahan `Code.gs` mudah ditinjau secara berurutan; bukan perubahan kontrak di antara keduanya. T05–T06 dapat ditunda tanpa menunda perbaikan utama, tetapi harus tetap ditandai belum selesai bila ditunda.

## T00 — Catat baseline dan lindungi pekerjaan yang sudah ada

**Tujuan:** memastikan perubahan implementasi dapat dibedakan dari perubahan pengguna yang sudah ada.

**File terkait:** sumber dan tes yang disentuh task berikutnya; [QA_CHECKLIST.md](QA_CHECKLIST.md).

**Langkah:**

1. Periksa `git status --short` dan diff terbaru. Working tree audit memiliki perubahan lokal serta file baru; jangan melakukan reset, restore massal, atau menambahkan seluruh working tree ke commit.
2. Simpan salinan sebelum perubahan atau checkpoint terpilih yang mencakup file terkait, termasuk file belum terlacak. Jangan mengandalkan HEAD sebagai satu-satunya baseline.
3. Jalankan `npm.cmd test`, catat hasil aktual dan versi runtime yang tersedia. Hasil audit sebelumnya adalah 14 tes lulus; itu bukan hasil tes implementasi baru.
4. Catat baseline operasi sync: 6.100 registry, 25 halaman × 100 event yang mengubah satu registry, 25 write, 1.220.000 sel, 75 pemanggilan format.

**Selesai jika:** baseline dapat dipulihkan, perubahan lama teridentifikasi, dan kegagalan tes yang sudah ada dipisahkan dari kegagalan akibat implementasi.

## T01 — Tambahkan kontrol buka-ulang privasi

**Temuan audit:** #1. **Ukuran:** kecil. **Risiko:** kontrol tidak tampil atau mengganggu CTA/consent existing.

**File utama:** [landing.php](../wordpress/kk-grosir/templates/landing.php), [landing.css](../wordpress/kk-grosir/assets/landing.css), [landing.js](../wordpress/kk-grosir/assets/landing.js), [presentation.php](../wordpress/kk-grosir/includes/presentation.php), [browser-check.cjs](../scripts/browser-check.cjs).

**Langkah:**

1. Gunakan tombol `Pengaturan Privasi` dengan `data-kkg-settings` agar memakai `openChoices()` yang sudah tersedia.
2. Usulan penempatan: baris kecil di dalam section Final CTA, setelah supporting text, bersama tautan Privacy Policy bila tersedia. Ini tidak menambah footer atau section baru; tampilkan usulan pada preview untuk ditinjau.
3. Tampilkan kontrol pengaturan hanya ketika mode consent efektif standalone/external dan audit privasi mengizinkan. Pada mode disabled, jangan menampilkan tombol yang seolah-olah membuka pengaturan aktif.
4. Standalone membuka dialog existing; external mengirim event `kkg:open-consent` ke adapter CMP. Jangan memasang banner kedua atau menyatakan CMP berhasil dibuka hanya berdasarkan event terkirim.
5. Pertahankan akses keyboard, fokus terlihat, dan jarak aman dari sticky CTA.

**Pengujian:** terima → buka ulang → tolak; tolak → buka ulang → ubah pilihan; reload setelah pilihan tersimpan; navigasi keyboard; mode disabled; mode external tanpa banner tambahan. Intersep navigasi WhatsApp pada tes agar tidak mengirim pesan atau membuka layanan nyata.

**Kriteria selesai:** kontrol tetap dapat diakses setelah banner hilang, pencabutan izin membersihkan storage atribusi sesuai perilaku existing, dan WhatsApp tetap tersedia. Periksa pada 320, 375, 390 px, tablet, serta desktop.

**Rollback:** pulihkan hanya perubahan task ini. Bila kontrol buka-ulang belum berfungsi, consent terkait tetap menjadi blocker enablement.

## T02 — Tulis hasil sinkronisasi sekali per batch

**Temuan audit:** #2. **Ukuran:** menengah. **Risiko:** cursor mendahului data atau replay membuat duplikasi.

**File utama:** [Code.gs](../apps-script/Code.gs), [apps-script.test.cjs](../tests/apps-script.test.cjs).

**Langkah:**

1. Baca data existing sekali. Pisahkan cursor yang sedang ditelusuri dalam memori dari cursor yang sudah tersimpan di Script Properties.
2. Ambil dan validasi halaman secara berurutan, tetap maksimal 100 event per halaman dan 25 halaman per eksekusi. Kumpulkan perubahan dengan urutan `change_id` terjaga.
3. Hentikan pengambilan saat `has_more=false`, batas halaman tercapai, atau batas waktu lunak tercapai. Sisakan waktu untuk merge, write, flush, dan fase berikutnya; gunakan satu batas internal sederhana yang diverifikasi saat QA, tanpa menambah pengaturan admin baru.
4. Jalankan `kkUpsertPlan_()` sekali terhadap seluruh perubahan terkumpul. Untuk registry yang muncul berkali-kali, snapshot terakhir dalam urutan perubahan harus menang.
5. Jika ada perubahan: perluas kapasitas, format tiga rentang existing, tulis A:H sekali, flush, lalu commit cursor batch. Jika tidak ada perubahan, jangan melakukan write/format/commit yang tidak diperlukan.
6. Kebijakan kegagalan: API/validasi gagal sebelum write berarti buang batch dalam memori dan pertahankan cursor lama; write/flush gagal berarti cursor tetap lama. Jika data berhasil ditulis tetapi penyimpanan cursor gagal, replay harus menghasilkan baris yang sama tanpa duplikasi.
7. Pertahankan LockService dan perilaku pelaporan error. Jangan menandai keseluruhan sync/rekonsiliasi berhasil hanya karena fase penulisan Klik WA selesai.

**Pengujian:**

- 6.100 registry + 25 halaman perubahan satu registry: tepat **1 write, 48.800 sel, 3 pemanggilan format, dan 1 commit cursor**; hasil akhir memuat perubahan terakhir.
- Campuran registry baru/lama, kode atau ID konflik, cursor tidak berurutan, batch kosong, dan ekspansi melewati 5.000 baris.
- Kegagalan API pada halaman berikutnya, `setValues`, flush, serta penyimpanan cursor; retry tetap idempotent.
- Batas halaman/waktu berhenti dengan cursor terakhir yang benar-benar ditulis, lalu eksekusi berikutnya melanjutkan sisanya. Simulasikan waktu melalui jam tes; jangan memakai sleep panjang.

**Kriteria selesai:** output setara dengan aturan lama, cursor selalu mengikuti write, dan pengurangan operasi dibuktikan oleh penghitung mock. Kecepatan layanan Google hanya boleh dilaporkan setelah T08.

**Rollback:** pulihkan versi `Code.gs` sebelum task tanpa menghapus Klik WA atau mereset cursor secara sembarang. Saat penerapan eksternal kelak, hentikan trigger dahulu dan uji replay setelah pemulihan.

## T03 — Gunakan hasil pemeriksaan duplikat yang sama

**Temuan audit:** #3. **Ukuran:** menengah. **Risiko:** formula kosong/error dianggap aman sehingga Purchase duplikat masuk Upload.

**File utama:** [Code.gs](../apps-script/Code.gs), [apps-script.test.cjs](../tests/apps-script.test.cjs).

**Langkah:**

1. Pertahankan normalisasi Order ID dengan trim dan huruf besar serta pemeriksaan `counts` di JavaScript untuk rekonsiliasi awal.
2. Jadikan formula dinamis `Closing!I` satu sumber pemeriksaan duplikat setelah sumber diedit. Pertahankan pemindaian yang mencakup baris tambahan; jangan memperkenalkan kembali batas tetap 500 baris.
3. Ganti pemindaian duplikat tambahan di `Upload!B` dengan pemeriksaan hasil `Closing!I` pada baris terkait. Pertahankan fingerprint sumber, alasan hasil rekonsiliasi, pemeriksaan waktu, dan batas usia impor.
4. Bedakan hasil formula unik yang berupa teks kosong dari sel I yang benar-benar kosong karena dihapus, belum ditulis, atau dibersihkan `kkOnEdit`. Usulan penjaga: pemeriksaan keberadaan formula (`ISFORMULA`) dan hasil yang sesuai; error formula harus menghasilkan status tidak siap, bukan lolos.
5. Tulis serta flush kolom otomatis Closing yang dibutuhkan sebelum menerbitkan formula kesiapan Upload. Pertahankan pemblokiran output selama proses; bila penulisan gagal di tengah, Upload tidak boleh berstatus `Ya` dari hasil parsial.
6. Tinjau interaksi dengan `kkOnEdit`, yang saat ini menghapus H:I dan L. Penggunaan kembali hasil I tidak boleh melemahkan invalidasi ketika CS mengedit saat rekonsiliasi berjalan.

**Pengujian:** Order ID unik, duplikat, perbedaan kapital/spasi, ID kosong, duplikat baru di baris lain, perubahan kembali menjadi unik, penyisipan/penghapusan baris, I kosong/error, edit saat proses berjalan, dan write gagal setelah sebagian output tersimpan. Pastikan refund/belum LUNAS tidak siap; repeat dengan Order ID berbeda tetap Purchase bisnis.

**Kriteria selesai:** tidak ada pemindaian `SUMPRODUCT` duplikat tambahan di Upload; pada 550 baris berisi Order ID terdapat 550 formula pemindaian di Closing, bukan 1.100 di dua tab. Keputusan layak/tidak layak tidak berubah; evaluasi formula sebenarnya wajib dibuktikan di T08.

**Rollback:** hentikan trigger sebelum pemulihan eksternal, pulihkan script sebelumnya, lalu regenerasi kolom turunan melalui rekonsiliasi. Jangan menghapus atau memulihkan input CS A:G dan J:K dengan snapshot lama.

## T04 — Pisahkan kebutuhan preview dari kode produksi

**Temuan audit:** #4. **Ukuran:** kecil–menengah. **Risiko:** preview rusak atau deklarasi fungsi tes bertabrakan.

**File utama:** [seo.php](../wordpress/kk-grosir/includes/seo.php), [testimonials.php](../wordpress/kk-grosir/includes/testimonials.php), [wp-shim.php](../tests/wp-shim.php), [api.php tes](../tests/api.php), [domain.php tes](../tests/domain.php). Periksa pemakai lain di [render-preview.php](../scripts/render-preview.php) dan [browser-check.cjs](../scripts/browser-check.cjs).

**Langkah:**

1. Petakan fungsi WordPress yang benar-benar dijamin pada titik pemanggilan serta urutan pemuatan modul plugin.
2. Lengkapi shim untuk fungsi yang dipakai, termasuk `home_url`, `get_permalink`, dan URL attachment. Gunakan origin fixture yang konsisten; jangan mengarahkan fallback tes ke domain produksi.
3. Selaraskan `tests/api.php`, yang sudah mendeklarasikan `home_url`, agar tidak terjadi fatal error redeclare setelah fungsi dipindah ke shim bersama.
4. Hapus guard keberadaan fungsi yang redundan dan fallback domain hardcoded di modul produksi. Pertahankan pengecekan nilai kembali dan media/permalink yang tidak tersedia.
5. Wajib panggil `current_user_can('manage_options')` untuk keputusan testimoni staging; jangan menggantinya dengan asumsi pengguna berwenang ketika fungsi tidak tersedia.

**Pengujian:** preview dan tes API memakai host fixture yang sama; canonical/logo benar; attachment kosong tetap mendapat fallback aset; staging non-admin tidak melihat testimoni; placeholder tidak tampil di mode active; hook hanya memengaruhi halaman yang ditentukan.

**Kriteria selesai:** tes PHP/preview lulus, tidak ada fallback keberadaan fungsi yang ditargetkan, dan kontrol capability tetap berlaku. Jangan menghapus setiap `function_exists` dalam repo secara massal.

**Rollback:** pulihkan modul dan shim/tes terkait sebagai satu perubahan agar keduanya tetap kompatibel.

## T05 — Sederhanakan pemantauan Hero untuk sticky CTA

**Temuan audit:** #5. **Ukuran:** kecil. **Risiko:** sticky muncul terlambat, berkedip, atau menutupi konten.

**File utama:** [landing.js](../wordpress/kk-grosir/assets/landing.js), [browser-check.cjs](../scripts/browser-check.cjs).

**Langkah:**

1. Gunakan `IntersectionObserver` sebagai sumber perubahan `heroPassed`; hapus listener scroll yang menghitung kondisi sama.
2. Pastikan keadaan awal benar ketika halaman dibuka pada posisi scroll yang dipulihkan, lewat anchor, atau setelah reload. Pertahankan pemeriksaan awal jika memang diperlukan; hindari dua pemantau berkelanjutan.
3. Pertahankan observer akhir halaman, pemeriksaan banner/dialog, serta penyembunyian sticky di desktop. Tanpa dukungan observer, pertahankan CTA biasa yang dapat dipakai.

**Pengujian:** scroll turun/naik melewati Hero, lompatan anchor, reload di tengah halaman, resize mobile–desktop, banner/dialog terbuka, serta Final CTA terlihat. Jalankan pada 320, 375, 390 px, tablet, desktop, dan reduced motion.

**Kriteria selesai:** satu mekanisme memantau Hero dan perilaku sticky tetap sesuai aturan overlay. Jika observer tunggal belum memenuhi skenario nyata, dokumentasikan reproduksi sebelum memaksakan penghapusan mekanisme lama.

**Rollback:** pulihkan hanya perubahan detektor Hero; pertahankan hasil T01.

## T06 — Hapus token CSS yang tidak dipakai

**Temuan audit:** #6. **Ukuran:** sangat kecil. **Risiko:** rendah.

**File utama:** [landing.css](../wordpress/kk-grosir/assets/landing.css).

**Langkah:** cari ulang semua referensi `--kkg-target`; jika masih tidak memiliki pemakai, hapus dua deklarasi dan blok media query yang hanya mengaturnya. Pertahankan ukuran nyata tombol dan kontrol lain.

**Kriteria selesai:** tidak ada token tersebut tersisa dan tampilan/ukuran interaksi tidak berubah. Cukup diff serta pemeriksaan ukuran lewat browser suite existing; tidak perlu membuat tes baru khusus konstanta CSS mati.

**Rollback:** pulihkan deklarasi yang dihapus bila ditemukan pemakai aktual yang sebelumnya tidak terdeteksi.

## T07 — Jalankan regresi lokal dan catat bukti

**File terkait:** tes yang diperbarui, [QA_CHECKLIST.md](QA_CHECKLIST.md), [IMPLEMENTATION.md](IMPLEMENTATION.md), [AUDIT_AND_BLOCKERS.md](AUDIT_AND_BLOCKERS.md).

**Langkah:**

1. Jalankan `npm.cmd test`; catat jumlah tes dan hasil aktual setelah perubahan.
2. Jalankan preview melalui `npm.cmd run preview`, lalu `node scripts/browser-check.cjs` setelah server tersedia. Simpan bukti di lokasi artefak yang jelas agar baseline lama tidak hilang tanpa sengaja.
3. Catat metrik operasi T02 dan jumlah formula T03; bedakan hasil mock dari hasil layanan nyata.
4. Pastikan tidak ada perubahan kontrak API atau skema database. Uji database khusus hanya diperlukan bila perubahan akhirnya menyentuh storage/kontrak; harness database menghapus tabel database tes sehingga targetnya wajib diverifikasi lebih dahulu.
5. Perbarui dokumentasi status per task dengan hasil pass/fail/belum diuji dan lokasi bukti. Penambahan kontrol privasi perlu memperbarui catatan dampak penghapusan footer.
6. Jalankan `git diff --check`, tinjau diff terpilih, dan pastikan perubahan tidak membawa secret atau menimpa pekerjaan pengguna.

**Kriteria selesai:** seluruh tes relevan lulus, bukti dapat ditinjau, dan pekerjaan yang memerlukan staging masih dinyatakan belum diuji. Status proyek keseluruhan tidak dinyatakan selesai berdasarkan tes lokal.

## T08 — Verifikasi di WordPress staging dan Google Sheets native

**Prasyarat:** akses staging yang diotorisasi, backup/restore point, salinan Google Sheets native dengan akses sesuai, serta secret di backend/Script Properties. Jika belum tersedia, tandai task tertunda dan lanjutkan dokumentasi lokal yang memungkinkan.

**Langkah dan pengujian:**

- WordPress/Jupiter/WPBakery: kontrol privasi, CMP external bila dipilih, batas staging/admin, metadata, media, dan halaman lain di luar `/grosir/`. Tidak mengaktifkan tracking global atau memasang CMP kedua.
- Sheets: enam tab/kolom/layout tetap, Date asli dan WIB benar, lebih dari 500 Closing dan 5.000 Klik WA, replay sync, serta pemulihan kegagalan write/cursor.
- Jalankan kasus T03 pada mesin formula native: duplikat, I kosong/error, perubahan Order ID pada baris lain, perubahan saat proses berjalan, serta ekspansi/penyisipan baris. Hasil tidak boleh siap saat validasi hilang.
- Ukur durasi sync dan rekonsiliasi pada dataset uji yang sama sebelum/sesudah; catat ukuran data dan kondisi pengujian. Jangan menyimpulkan percepatan hanya dari jumlah pemanggilan mock.
- Verifikasi seluruh flow menggunakan data uji: handoff → registry → sync → Closing LUNAS → Upload prepared. Tidak mengaktifkan impor Google Ads.
- Uji stop trigger dan pemulihan script/plugin pada salinan staging; ledger input CS tetap utuh.

**Kriteria selesai:** kasus kritis lulus pada layanan sebenarnya, konfigurasi tercatat tanpa secret, dan blocker yang tersisa dinyatakan jelas. Kegagalan kritis mengembalikan task terkait ke status belum selesai.

## T09 — Siapkan release candidate dan panduan pemulihan

**File terkait:** [kk-grosir.php](../wordpress/kk-grosir/kk-grosir.php), [wp-shim.php](../tests/wp-shim.php), [domain.php tes](../tests/domain.php), [RUNBOOK.md](RUNBOOK.md), dokumentasi QA/implementasi, script aktif, dan paket plugin pada `deliverables/`.

**Langkah:**

1. Naikkan versi plugin/aset sekali untuk kumpulan perubahan final; selaraskan referensi versi pada shim dan tes existing yang mengunci angka versi.
2. Jalankan kembali pemeriksaan yang terdampak perubahan versi. Simpan paket lama sebagai kandidat rollback sebelum menjalankan `scripts/package-plugin.ps1`, karena script mengganti ZIP tujuan.
3. Bangun ZIP dari sumber final yang sudah diuji, periksa isinya, dan catat versi/hash sumber dan paket. Jangan menyatakan ZIP lama otomatis sesuai dengan working tree.
4. Serahkan Apps Script aktif dan petunjuk penerapan. Workbook tidak perlu dibangun ulang jika struktur dan formula baseline memang tidak diubah; catat kebutuhan regenerasi kolom turunan saat script diterapkan.
5. Runbook harus menjelaskan: backup → stop trigger → pasang script/plugin yang ditinjau → diagnostics → sync/rekonsiliasi uji → verifikasi → aktifkan kembali trigger yang diotorisasi. Jika gagal, hentikan trigger, pulihkan versi sebelumnya, dan verifikasi ulang data serta cursor tanpa mereset ledger.
6. Sajikan hasil QA, perubahan perilaku, konfigurasi tanpa secret, blocker, serta prosedur deploy/rollback sebagai paket yang dapat ditinjau sebelum meminta persetujuan go-live eksplisit.

**Kriteria selesai:** kandidat rilis lengkap dan dapat dipulihkan. Menyelesaikan task ini bukan izin publikasi; rilis live tetap mengikuti gate proyek.

## Cara mencatat penyelesaian setiap task

Gunakan catatan singkat berikut pada dokumen QA atau deskripsi perubahan:

```text
Task: Txx — judul
Status: belum dikerjakan / dikerjakan / selesai / tertunda
File berubah:
Perilaku sebelum → sesudah:
Pengujian dan hasil aktual:
Bukti:
Batas pengujian / blocker:
Versi atau checkpoint rollback:
```

Satu task dianggap selesai jika kriteria penerimaannya terpenuhi dan bukti tersedia. Pisahkan status selesai lokal dari selesai integrasi; jangan mencentang semua task hanya karena kode berhasil ditulis.
