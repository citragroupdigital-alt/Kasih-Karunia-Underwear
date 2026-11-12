# Audit Overengineering — KK Underwear

**Tanggal:** 12 November 2026\
**Panduan:** [Ponytail Audit](../ponytail/skills/ponytail-audit/SKILL.md)\
**Objek audit:** working tree lokal, termasuk perubahan yang belum di-commit; HEAD saat pemeriksaan `de2c1e3`.\
**Jenis pekerjaan:** audit dan laporan. Tidak mengubah kode aplikasi, workbook, konfigurasi, atau deployment.

## Fungsi proyek dan kesimpulan

Proyek ini merender landing page WordPress `/grosir/`, mencatat handoff WhatsApp dan riwayat atribusi, lalu menyinkronkan data ke Google Sheets untuk rekonsiliasi Purchase. Asumsi beban mengikuti PRD: satu bisnis, kemungkinan request bersamaan, sinkronisasi setiap 15 menit, maksimal 9.999 kode baru per tahun, serta data yang dapat melewati 500 baris Closing dan 5.000 baris Klik WA. Jumlah pengunjung dan latensi produksi belum diukur.

**Ada kompleksitas dan pekerjaan berulang yang bisa dikurangi, tetapi arsitektur inti tidak menunjukkan overengineering besar.** Ditemukan lima peluang penyederhanaan lokal: penulisan ulang spreadsheet, formula duplikat, cabang kompatibilitas yang tidak diperlukan pada runtime WordPress, dua pendeteksi posisi Hero, dan token CSS yang tidak digunakan. Satu gap fungsional consent dicatat terpisah karena perlu diselesaikan sebelum fitur tersebut diaktifkan.

Overengineering dalam laporan ini berarti cabang, mekanisme, atau konfigurasi tambahan yang tidak diperlukan untuk menghasilkan perilaku yang sama. Pekerjaan komputasi berulang diberi label tersendiri; tidak semua masalah performa merupakan overengineering.

## Wajib diselesaikan sebelum enablement

### 1. Kontrol membuka kembali consent hilang setelah banner ditutup

**Kategori:** gap fungsional, bukan overengineering. **Status bukti:** HTML hasil render dan penelusuran handler; belum diuji ulang di browser.

Lokasi: [landing.php](../wordpress/kk-grosir/templates/landing.php), baris 180–183; [landing.js](../wordpress/kk-grosir/assets/landing.js), baris 42–53 dan 86–112.

- **Fungsi:** pengguna memilih izin melalui banner dan dialog; `openChoices()` membuka pengaturan.
- **Masalah:** setelah Terima Semua atau Tolak Opsional, banner disembunyikan beserta satu-satunya tombol `data-kkg-choices`; HTML hasil render memiliki **0** tombol `data-kkg-settings`. Pada mode standalone, pengguna yang sudah memilih tidak memiliki kontrol halaman untuk membuka kembali pengaturan.
- **Perbaikan terkecil:** tempatkan satu tombol pengaturan privasi yang tetap dapat diakses, menggunakan handler yang sudah ada dan penempatan yang disepakati. Pertahankan keputusan menghapus footer; tidak perlu membangun dialog baru.
- **Jika dibiarkan:** fitur consent standalone belum memenuhi kebutuhan buka-ulang pada AGENTS.md bagian 10. Dampak ini sudah dicatat dalam `docs/IMPLEMENTATION.md`; temuan ini mengonfirmasi blocker yang diketahui, bukan klaim masalah baru di produksi.

## Sebaiknya diperbaiki

### 2. Sinkronisasi menulis ulang seluruh tab pada setiap halaman API

**Kategori:** pekerjaan berlebihan; prioritas penyederhanaan tertinggi. **Status bukti:** simulasi fungsi aktual melalui Node VM, tanpa Google Sheets live.

Lokasi: [Code.gs](../apps-script/Code.gs), `kkUpsertPlan_()` baris 80–99 dan `kkSync_()` baris 100–118.

- **Fungsi:** membaca perubahan maksimal 100 event per halaman, menggabungkannya berdasarkan ID registry, lalu menyimpan tab Klik WA dan cursor.
- **Masalah:** setiap halaman menyalin serta mengindeks ulang data lama, memformat seluruh rentang, dan menulis seluruh tab meskipun hanya satu registry berubah. Simulasi 6.100 baris dan 25 halaman menghasilkan **25 penulisan, 1.220.000 sel yang dikirim ke `setValues`, dan 75 pemanggilan format**.
- **Perbaikan terkecil:** kumpulkan halaman yang berhasil dibaca dalam batas waktu/batch, gabungkan perubahan sekali, lalu tulis dan format sekali; simpan cursor terakhir hanya setelah write dan flush berhasil. Kegagalan sebelum commit harus tetap aman untuk replay, tanpa menambah antrean atau framework sinkronisasi.
- **Jika dibiarkan:** pekerjaan pada data yang sama berulang setiap batch dan memakai waktu yang juga dibutuhkan rekonsiliasi. Ini bukti volume operasi berlebih, bukan pengukuran bahwa Google Sheets produksi sudah lambat atau mengalami timeout.

Dalam skenario tersebut, satu penulisan akhir seluruh tab membutuhkan **48.800 sel**, dibandingkan 1.220.000 sel saat ini. Perbandingan ini menghitung payload penulisan; bukan estimasi percepatan 25 kali pada layanan Google.

### 3. Pemeriksaan duplikat Order ID memakai formula pemindaian yang berulang

**Kategori:** duplikasi logika dan perhitungan. **Status bukti:** inspeksi formula yang dibangun kode; performa kalkulasi Sheets belum diukur.

Lokasi: [Code.gs](../apps-script/Code.gs), `kkUploadRow_()` baris 182–200, serta penulisan `Closing!I` baris 253–257.

- **Fungsi:** memastikan Order ID tetap unik setelah CS mengedit spreadsheet, termasuk setelah rekonsiliasi selesai.
- **Masalah:** `Upload!B` dan `Closing!I` masing-masing membangun `ARRAYFORMULA(SUMPRODUCT(...UPPER(TRIM(J$2:J))...))` untuk Order ID yang sama. Pada 550 baris berisi Order ID, kode menghasilkan 1.100 formula pemindaian duplikat di dua lokasi yang harus tetap konsisten.
- **Perbaikan terkecil:** jadikan `Closing!I` hasil pemeriksaan duplikat dinamis yang dipakai ulang oleh penjaga kesiapan Upload, dengan syarat kosong/tidak valid tetap diblokir. Pertahankan pemeriksaan snapshot, normalisasi trim/huruf besar, serta uji perubahan Order ID dan penyisipan baris.
- **Jika dibiarkan:** perubahan aturan duplikat perlu diselaraskan di beberapa lokasi dan menambah formula berulang. Jangan menghapus pemeriksaan duplikat dalam JavaScript atau seluruh penjaga formula: keduanya melindungi fase pemrosesan yang berbeda.

### 4. Kode produksi menangani ketiadaan fungsi yang wajib tersedia di WordPress

**Kategori:** cabang defensif berlebihan dan tanggung jawab preview yang bercampur. **Status bukti:** penelusuran bootstrap, modul, dan shim pengujian.

Lokasi: [seo.php](../wordpress/kk-grosir/includes/seo.php), baris 78–102 dan 231–243; [testimonials.php](../wordpress/kk-grosir/includes/testimonials.php), baris 59–60; [wp-shim.php](../tests/wp-shim.php).

- **Fungsi:** modul SEO dan testimoni dipakai oleh plugin serta preview lokal yang meniru sebagian fungsi WordPress.
- **Masalah:** modul memeriksa keberadaan `home_url`, `get_permalink`, `current_user_can`, dan `kkg_is_page`, padahal runtime plugin dan bootstrap menjamin dependensi tersebut. Contoh konkretnya, saat `home_url` tidak disediakan shim, preview memakai domain produksi hardcoded; testimoni bahkan menganggap pemeriksaan capability lolos jika fungsi pemeriksa tidak tersedia.
- **Perbaikan terkecil:** lengkapi fungsi tiruan yang diperlukan di shim, lalu panggil API WordPress dan fungsi internal secara langsung dari modul produksi. Tetap pertahankan validasi nilai kembali, media yang tidak ditemukan, dan pemeriksaan capability sebenarnya.
- **Jika dibiarkan:** preview bisa menutupi dependensi yang belum lengkap, sementara kode produksi memelihara jalur alternatif yang tidak diperlukan. Ini bukan bukti bypass otorisasi pada instalasi WordPress normal; fungsi capability tersedia di sana.

## Perapian opsional

### 5. Posisi Hero dipantau oleh dua mekanisme sekaligus

**Kategori:** duplikasi mekanisme kecil. **Status bukti:** inspeksi alur event; belum dibenchmark di browser.

Lokasi: [landing.js](../wordpress/kk-grosir/assets/landing.js), baris 130–145.

- **Fungsi:** menentukan kapan CTA sticky boleh tampil setelah Hero CTA melewati viewport.
- **Masalah:** `IntersectionObserver` menulis `heroPassed`, sementara listener `scroll` juga membaca `getBoundingClientRect()` dan menulis status yang sama. Ketika halaman digulir, kedua jalur aktif; listener bukan fallback untuk browser tanpa observer karena berada dalam guard yang sama.
- **Perbaikan terkecil:** gunakan satu mekanisme untuk status Hero, dengan pemeriksaan awal yang sesuai dan pengujian saat scroll melewati batas viewport. Observer penjaga akhir halaman dan pemeriksaan banner/dialog tetap diperlukan.
- **Jika dibiarkan:** dua jalur perlu dirawat untuk satu kondisi dan pembacaan geometri tetap dilakukan pada scroll. Dampaknya kecil; bukan alasan merombak seluruh interaksi halaman.

### 6. Token ukuran target sentuh tidak pernah dipakai

**Kategori:** konfigurasi mati. **Status bukti:** pencarian referensi pada kode, skrip, tes, dan dokumentasi proyek.

Lokasi: [landing.css](../wordpress/kk-grosir/assets/landing.css), baris 27 dan 35–39.

- **Fungsi:** `--kkg-target` dideklarasikan sebagai 24 px dan diubah menjadi 44 px pada pointer coarse.
- **Masalah:** tidak ada pembacaan `var(--kkg-target)`; mengubah nilai ini tidak mengubah ukuran tombol mana pun. Ukuran interaksi ditentukan oleh deklarasi lain.
- **Perbaikan terkecil:** hapus deklarasi dan media query yang hanya mengatur token tersebut. Pertahankan ukuran nyata tombol, fokus keyboard, dan pemeriksaan target sentuh.
- **Jika dibiarkan:** pengembang dapat salah mengira satu token ini mengendalikan aksesibilitas target sentuh. Ini hanya perapian kecil, bukan masalah arsitektur.

## Kompleksitas yang layak dipertahankan

| Bagian | Alasan bukan overengineering |
| --- | --- |
| Custom plugin dengan modul presentation, settings, API, dan store | Sesuai platform dan pemisahan tanggung jawab yang diminta; tidak ada framework aplikasi baru. |
| Registry, event history, sequence, dan rate limit | Menjawab kebutuhan reuse, riwayat atribusi, alokasi unik, serta pengamanan endpoint publik. |
| Named DB lock, transaksi, dan constraint unik | Lock juga mengurutkan commit terhadap cursor perubahan. Jangan menghapusnya hanya karena terlihat bertumpuk tanpa membuktikan jaminan penggantinya. |
| Rekonsiliasi historis as-of pembayaran | Snapshot Click ID terbaru tidak cukup untuk Purchase sebelum klik berikutnya. |
| Validasi input PHP, JavaScript, dan Apps Script | Masing-masing melindungi batas data berbeda; kesamaan regex lintas runtime tidak otomatis berarti duplikasi yang harus dihapus. |
| Snapshot guard, invalidasi edit, dan pemisahan input CS | Mencegah hasil rekonsiliasi lama dianggap cocok setelah sumber pembayaran berubah. Penyederhanaan wajib mempertahankan jaminan tersebut. |
| Mode off/staging/active, gate rilis, dan consent | Persyaratan proyek; bukan feature flag spekulatif. |
| Carousel bersama untuk produk dan testimoni | Dokumentasi implementasi mencatat revisi pengguna dan ada dua pemakai nyata. Panjang mesin carousel atau penggunaan CSS modern saja bukan bukti overengineering. |
| Baseline `.gs` dan `.xlsx` di root | Sumber audit yang sengaja dipertahankan; bukan kode aktif duplikat yang harus langsung dihapus. |
| Playwright sebagai devDependency | Dipakai pemeriksaan browser; tidak menjadi dependensi frontend produksi. |

## Verifikasi yang dilakukan

| Pemeriksaan | Hasil dan batas bukti |
| --- | --- |
| Membaca AGENTS.md dan seluruh PRD | Selesai; juga membaca dokumentasi implementasi, kontrak API, runbook, dan matriks QA. |
| Penelusuran kode utama | Bootstrap plugin, semua modul PHP, template, CSS/JS, Apps Script aktif, serta skrip dan tes utama diperiksa. |
| `npm.cmd test` | **14 tes lulus, 0 gagal**; mencakup 55 pemeriksaan domain PHP, 15 pemeriksaan izin/validasi API, syntax check PHP distributable, serta logika Apps Script dalam mock VM. |
| Simulasi `kkSync_` aktual | **25 write / 1.220.000 sel / 75 format / 25 commit cursor** untuk 6.100 baris dan 25 halaman perubahan satu registry; tidak mengakses Sheets atau API live. |
| Render PHP lokal untuk kontrol consent | **0** `data-kkg-settings`, **1** `data-kkg-choices`; tombol pilihan berada di banner. |
| Pencarian token CSS | **2** deklarasi `--kkg-target`, **0** pembacaan `var(--kkg-target)`. |
| Perubahan sumber | Audit tidak memodifikasi sumber aplikasi atau perubahan pengguna yang sudah ada. |

Tes yang lulus tidak membuktikan seluruh 40 acceptance criteria PRD sudah terpenuhi. Tes Apps Script menggunakan objek tiruan dan tidak menjalankan mesin formula Google Sheets; tes PHP lokal juga bukan integrasi WordPress lengkap.

## Urutan tindak lanjut

1. Selesaikan kontrol buka-ulang consent sebelum mengaktifkan consent pada rilis.
2. Sederhanakan penulisan sinkronisasi dan formula duplikat; uji replay, write gagal, edit bersamaan, serta ekspansi baris.
3. Pindahkan penanganan runtime tiruan ke shim dan rapikan pendeteksi Hero serta token CSS.
4. Verifikasi hasil perubahan di WordPress staging dan Google Sheets native sebelum publikasi.

**Verdict:** arsitektur inti proporsional; perbaikan terpenting untuk efisiensi adalah pekerjaan berulang di spreadsheet. Tidak perlu rewrite atau menambah framework.

**Lean:** perkiraan konservatif **15–30 baris bersih** dapat dikurangi dari cabang redundan, pendeteksi Hero, dan token CSS; **0 dependensi** perlu dihapus. Angka baris adalah estimasi sebelum refactor, bukan hasil pengurangan terukur; manfaat utama temuan spreadsheet adalah pengurangan operasi, bukan jumlah baris kode.

**Belum diperiksa/dijalankan:** WordPress/Jupiter/WPBakery dan CMP aktual, database concurrency pada sesi audit ini, browser suite lengkap, Google Sheets native dan evaluasi formulanya, isi workbook secara menyeluruh, seluruh Apps Script baseline lama, kesamaan ZIP distribusi dengan working tree, keamanan seluruh dependency/vendor, serta load test produksi. Hasil pengujian lama dalam `docs/QA_CHECKLIST.md` tidak diklaim sebagai pengujian ulang audit ini.

**Catatan acuan:** PRD di disk masih memuat beberapa keputusan lama, termasuk footer dan batas scope SEO. AGENTS.md serta `docs/IMPLEMENTATION.md` mencatat revisi lebih baru; audit tidak menyebut SEO, penghapusan footer, atau carousel sebagai fitur spekulatif hanya karena perbedaan dokumen tersebut. Laporan ini tidak mengubah keputusan bisnis maupun menandakan proyek siap rilis.
