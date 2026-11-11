# Panduan Agen — KK Underwear

## 1. Tujuan dan sumber acuan

File ini berlaku untuk seluruh proyek. Baca sebelum membuat atau mengubah kode, aset, workbook, Apps Script, maupun konfigurasi proyek.

Sumber persyaratan utama adalah [PRD-kk-underwear.md](PRD-kk-underwear.md). AGENTS.md merangkum aturan kerja; detail copy, kontrak data, dan acceptance criteria tetap mengikuti PRD. Jangan mengganti PRD dengan asumsi dari ringkasan ini.

- Ikuti instruksi terbaru pengguna apabila mengubah keputusan proyek. Catat dampaknya pada dokumen dan implementasi yang terkait.
- Jika ada konflik yang memengaruhi keputusan bisnis, privasi, atau sistem produksi, jelaskan konflik secara spesifik sebelum menjalankan bagian yang bergantung padanya. Lanjutkan pekerjaan independen yang sudah diotorisasi.
- Bedakan keputusan final, usulan teknis, dan hal yang belum diverifikasi. Jangan menganggap usulan sebagai konfigurasi produksi yang telah disetujui.
- Gunakan bahasa Indonesia untuk komunikasi dan dokumentasi operasional. Identifier kode boleh memakai bahasa Inggris secara konsisten.
- Permintaan membaca dokumen atau membuat panduan tidak otomatis mengotorisasi pembangunan kode maupun deployment.

## 2. Konteks proyek dan cakupan

Bangun landing page grosir pada `https://kk-underwear.id/grosir/` di WordPress existing, menggunakan Jupiter, WPBakery 7.9 (Modified Version), dan MySQL/MariaDB existing. Versi dan kompatibilitas aktual harus diaudit sebelum integrasi.

Cakupan implementasi:

- Landing page dengan header khusus halaman dan sembilan bagian aktif sesuai revisi pengguna (footer dihapus atas instruksi pengguna 11 November 2026).
- Custom plugin WordPress untuk render halaman, pengaturan, metadata SEO/AEO/GEO & JSON-LD Schema khusus `/grosir/`, atribusi WhatsApp, Reference Code, database, dan REST API.
- Sinkronisasi WordPress ke Google Sheets melalui Apps Script.
- Rekonsiliasi pembayaran dan penyiapan dataset Purchase offline.
- Blueprint keselarasan Google Ads (`docs/SEO_AEO_GEO_ADS_PLAYBOOK.md`), audit, pengujian, panduan admin/CS, backup, dan rollback.

Di luar cakupan:

- Perubahan SEO global situs (Yoast/RankMath pada halaman lain di luar `/grosir/`) serta aktivasi Search Console tanpa instruksi tambahan.
- Perubahan langsung pada akun Google Ads live (campaign, bidding, budget, conversion action, aktivasi impor).
- Katalog e-commerce, cart, checkout, CRM baru, dan integrasi penjualan WooCommerce.
- WhatsApp Business API, chatbot, pembacaan chat, dan pengiriman pesan proaktif.
- Perubahan global tema, plugin vendor, atau tracking existing tanpa instruksi terpisah.

Jangan mengganti target implementasi menjadi Next.js, React SPA, website hosting terpisah, atau platform baru tanpa keputusan pengguna.

## 3. Aturan bisnis yang wajib dipertahankan

| Item | Aturan |
| --- | --- |
| MOQ | Mulai 1 lusin, yaitu 12 pcs |
| Kategori | Bra Wanita, Celana Dalam Pria, Celana Dalam Wanita, Kaos Kaki, Handuk |
| Harga dan katalog lengkap | Diberikan melalui CS; tidak ditampilkan di landing page |
| CTA utama | Minta Katalog Grosir |
| Tujuan seluruh CTA | Satu nomor WhatsApp CS resmi |
| Purchase bisnis | Setiap transaksi LUNAS, termasuk repeat order |
| Identitas transaksi | Order ID wajib dan unik; satu kode referensi boleh terkait beberapa order |
| Statistik | 70.000+ produk terjual; 2.000+ mitra reseller; 40.000+ pelanggan puas |

Klik WhatsApp adalah upaya handoff. Klik bukan bukti pesan terkirim, percakapan terverifikasi, atau Purchase. Transaksi tanpa atribusi iklan tetap dicatat sebagai Purchase bisnis bila memenuhi syarat pembayaran.

## 4. Pemeriksaan sebelum implementasi

1. Baca seluruh PRD, khususnya Bab 6–10, acceptance criteria Bab 14, dan tahapan Bab 15.
2. Periksa file yang tersedia dan perubahan pengguna. Jangan menimpa atau menghapus pekerjaan yang tidak terkait.
3. Periksa workbook dan Apps Script baseline sebelum mengadaptasinya. Jangan menganggap integrasi produksi sudah berjalan.
4. Untuk integrasi WordPress, audit secara read-only versi runtime, hooks tema, plugin, cache, Privacy Policy, CMP, cookies/storage, serta tag tracking existing.
5. Siapkan rencana perubahan file, kontrak API, migrasi database, pengujian, dan rollback sesuai pekerjaan yang diotorisasi.
6. Gunakan staging dan backup/restore point untuk integrasi. Jika akses atau aset belum tersedia, lanjutkan bagian lokal yang memungkinkan dan catat bagian yang belum bisa diverifikasi.

File baseline yang tersedia saat panduan ini dibuat:

- `PRD-kk-underwear.md`
- `KK_Underwear_Apps_Script_Code.gs`
- `KK_Underwear_Offline_Conversion_Purchase.xlsx`

Referensi gambar, logo, foto asli, dan repository PusatGrosir.id yang disebut di PRD harus diperiksa ketersediaannya. Jangan mengklaim telah membaca referensi yang belum diakses. Repository PusatGrosir.id hanya referensi arsitektur; jangan menyalin identitas, data pelanggan, atau kredensialnya.

## 5. Aturan frontend dan desain

Urutan bagian wajib:

1. Custom Header
2. Hero
3. Company Statistics
4. Empat kartu USP
5. Lima Kategori Produk
6. Tentang CV. Kasih Karunia
7. Cara Pemesanan
8. FAQ
9. Final CTA WhatsApp

*(Catatan revisi pengguna 11 November 2026: section 10 Custom Footer dihapus.)*

- Gunakan copy inti Bab 4 PRD yang diperbarui atas persetujuan pengguna 11 November 2026: H1 diperkaya menjadi `Kulakan Grosir Pakaian Dalam Mulai 1 Lusin!`, CTA utama `Minta Katalog Grosir`, CTA kartu kategori dihapus, catatan disclaimer USP & footer dihapus, serta konteks lokasi terverifikasi Surabaya (`toko dan gudang di Surabaya`) dan mitra `agen pakaian dalam` ditambahkan untuk SEO/AEO/GEO/Google Ads.
- About mengikuti copy `image(2).png` dan layout `image(3).png` sesuai pemetaan aset PRD. Jika penyebutan nomor gambar di bagian lain ambigu, cocokkan nama file sebelum implementasi.
- Palet acuan: Royal Blue `#0454D9`, Hot Pink `#F00688`, Purple `#873FE8`, Sky Blue `#49BDF5`, Lavender `#F8F1FB`, Navy `#151B33`, dan putih. Nilai ini estimasi poster, bukan panduan merek resmi.
- Gunakan desain bersih, responsif, jarak lega, dan animasi ringan. Hindari ornamen berlebihan, autoplay, serta layout shift.
- Gunakan foto produk asli tanpa mengubah bentuk, merek, dan rasio produk. Aset yang belum tersedia memakai placeholder yang jelas di staging.
- Jangan mengarang foto gudang/staf, alamat, nomor WA, testimoni, harga, diskon, stok, atau bukti klaim bisnis.
- Klaim USP mengenai katun organik, harga langsung pabrik, kargo termurah, serta layanan setiap hari harus divalidasi atau mendapat persetujuan revisi sebelum publikasi.
- Konten utama dan jawaban FAQ harus tersedia dalam HTML server-side. JavaScript hanya melengkapi interaksi.
- Pastikan menu, accordion, dan CTA dapat dipakai dengan keyboard; sediakan label, fokus terlihat, kontras, alt text, dan dukungan reduced motion.
- Sticky CTA tidak boleh menutupi consent banner, dialog, navigasi perangkat, atau akhir konten.

## 6. Arsitektur dan keamanan WordPress

- Gunakan custom plugin; halaman WPBakery berisi satu shortcode sebagai wadah.
- Pisahkan modul presentation, settings, attribution capture, reference registry, event log, sync API, dan maintenance.
- Pisahkan template, CSS, dan JavaScript. Muat aset hanya pada halaman yang membutuhkan.
- Scope CSS dengan namespace seperti `kkg-*`. Header/footer khusus hanya berlaku pada `/grosir/`.
- Jangan mengedit WordPress core, plugin vendor, atau `functions.php` tema aktif untuk fitur inti. Jangan menempelkan seluruh CSS/JS ke WPBakery Raw HTML.
- Gunakan hooks/API WordPress, sanitasi input, escape output sesuai konteks, prepared queries, serta pemeriksaan capability untuk administrasi.
- Gunakan `$wpdb->prefix` aktual. Migrasi harus idempotent dan hasilnya diperiksa.
- Jangan menghapus tabel produksi saat uninstall atau rollback tanpa persetujuan terpisah.
- Simpan secret di backend atau Script Properties. Jangan memasukkannya ke source control, browser, HTML, sheet publik, maupun log umum.
- Mode integrasi default `off`; konfigurasi staging/active mengikuti QA dan otorisasi yang berlaku.

## 7. Reference Code dan handoff WhatsApp

- Format kode: `KK-GA{YY}{NNNN}`, contoh `KK-GA260001`. Sequence empat digit dimulai `0001` setiap tahun kalender Asia/Jakarta.
- Kapasitas maksimum 9.999 kode baru per tahun. Beri peringatan sebelum habis; jangan mengulang nomor atau memperpanjang digit secara sepihak.
- Alokasi kode dilakukan backend secara atomik dengan constraint UNIQUE. Jangan memakai `MAX(...)+1` tanpa locking atau kode buatan browser.
- Kode digunakan ulang selama 24 jam sejak penerbitan pertama untuk browser yang dapat dikenali secara sah. Klik berikutnya tidak memperpanjang expiry.
- Kode aktif tetap dipakai saat melewati pergantian tahun. Setelah expiry, gunakan sequence tahun baru.
- Setiap handoff nyata dicatat sebagai event terpisah. Retry request yang sama harus idempotent; cegah duplikasi akibat jaringan.
- Simpan riwayat perubahan Click ID beserta waktunya. Snapshot terkini tidak menggantikan sejarah.
- Atribusi Purchase hanya boleh menggunakan klik yang layak sebelum waktu pembayaran. Klik sesudah pembayaran tidak boleh mengatribusikan Purchase sebelumnya.
- Jangan memasukkan GCLID, GBRAID, atau WBRAID ke pesan WhatsApp.
- API gagal, timeout, kapasitas kode habis, atau consent ditolak: jalur WhatsApp tetap tersedia tanpa kode atau data iklan yang tidak diizinkan.
- Tangani popup blocker setelah request async dan sediakan fallback yang dapat diklik pengguna.
- Nomor CS resmi yang belum tersedia adalah blocker produksi. Jangan memakai nomor karangan sebagai fallback.

## 8. Kontrak API dan data

Ikuti detail Bab 8–9 PRD. Endpoint yang diusulkan:

- `POST /wp-json/kk-offline/v1/handoff`: endpoint publik dengan validasi, rate limit, idempotency, dan respons `no-store`. Jangan menerima kode referensi, nomor tujuan arbitrer, nilai transaksi, atau status Purchase buatan client.
- `GET /wp-json/kk-offline/v1/handoffs`: endpoint sinkronisasi HTTPS dengan Bearer Token backend, pagination, batas request, dan cursor perubahan.

Gunakan registry berkode unik, event history, serta sequence tahunan. Timestamp server disimpan dalam UTC; tampilan operasional menggunakan Asia/Jakarta.

Kontrak sinkronisasi memakai `after_change_id`, `change_id`, dan ID registry `id` yang stabil. Pertahankan field PRD, termasuk `reference_code`, Click ID yang diizinkan, `created_at` ISO 8601 UTC, `landing_page`, `wa_context`, `last_change_id`, dan `has_more`. Finalisasikan detail kontrak sebelum mengimplementasikan kedua sisi.

Respons publik tidak boleh membocorkan Click ID atau secret. Validasi context dengan whitelist, batasi panjang/karakter input, cegah enumerasi dan formula injection ke Sheets, serta hindari log data sensitif berlebihan.

## 9. Workbook dan Apps Script

Pertahankan nama, urutan, layout, identitas visual, dan alur enam tab:

1. Upload
2. Closing
3. Klik WA
4. Panduan
5. Ringkasan
6. Pengaturan

- Pertahankan kontrak kolom Bab 10 PRD: `Klik WA` A:H, `Closing` A:L, dan `Upload` A:P.
- Gunakan Google Sheets native sebagai target sinkronisasi; file `.xlsx` lokal adalah baseline.
- Sinkronisasi terjadwal 15 menit memakai upsert berdasarkan ID registry di `Klik WA!H`, bukan append-only per klik.
- Simpan cursor hanya setelah penulisan berhasil. Gunakan LockService atau pengunci setara; retry tidak boleh menggandakan baris.
- Perbarui format kode lama `KK-GA2601` dan regex panjang variabel. Format final `^KK-GA\d{6}$` tetap memerlukan validasi bagian sequence `0001`–`9999`.
- Sediakan historical lookup atau rekonsiliasi as-of pembayaran. Nilai Click ID terakhir di `Klik WA` saja tidak cukup untuk seluruh transaksi historis.
- Purchase siap diproses memerlukan status LUNAS, waktu valid, nilai positif, Order ID unik, dan atribusi yang memenuhi syarat. Baru/Repeat tidak memfilter Purchase bisnis.
- Jangan menghapus baris refund/pembatalan tanpa jejak audit; dokumentasikan rekonsiliasinya.
- Gunakan sel Date asli dan tampilan WIB. Uji formula kembali setelah konversi Excel ke Google Sheets.
- Tangani ekspansi melewati batas awal 500 baris Closing dan 5.000 baris Klik WA agar data tidak terlewat.
- Sediakan diagnostics, pengelolaan trigger, retry, dan logging non-sensitif. Jangan menimpa koreksi Closing CS yang telah disetujui.
- Tab Upload menyiapkan dataset; tidak otomatis mengirim atau mengaktifkan impor Google Ads live.

## 10. Consent dan retensi

- Audit Privacy Policy, CMP, Site Kit, PixelYourSite, WooCommerce, cookies/storage, cache, dan duplikasi tag sebelum enablement.
- Basic Consent Mode v2 adalah rancangan awal yang tunduk hasil audit. Jangan memasang banner kedua jika CMP existing dapat digunakan.
- Pemrosesan Click ID dan storage mengikuti izin/dasar pemrosesan yang sesuai. Menolak tracking opsional tidak boleh memblokir WhatsApp.
- Sediakan Tolak Opsional, Atur Pilihan, Terima Semua, tautan privasi, dan kontrol membuka kembali pengaturan.
- Rancangan retensi: token reuse maksimal 24 jam, Click ID browser maksimal 90 hari bila diizinkan, atribusi WordPress 180 hari. Angka 90/180 hari belum merupakan validasi hukum atau conversion window Google Ads.
- Cleanup harus dapat diuji dan tidak merusak ledger transaksi. Retensi Closing dan consent mengikuti kebijakan yang disetujui.
- Jangan menyimpan nomor WA pembeli dalam URL/UTM, menggunakan fingerprint tersembunyi, atau mengubah consent global tanpa audit.

## 11. Pengujian dan bukti penyelesaian

Gunakan 40 acceptance criteria Bab 14 PRD sebagai checklist utama. Catat hasil pass/fail/belum diuji beserta bukti dan keterbatasan environment. Jangan mengklaim lulus berdasarkan pembacaan kode saja.

Pengujian minimal yang relevan dengan implementasi:

- UI pada 320, 375, 390 px, tablet, dan desktop; keyboard, FAQ, CTA, consent, dan halaman existing di luar `/grosir/`.
- Kode unik saat request bersamaan, reuse, expiry, pergantian tahun, kapasitas 9.999, retry, dan fallback API.
- Consent ditolak, riwayat beberapa Click ID, serta klik setelah pembayaran.
- Upsert dan pemulihan sync gagal, data melewati batas baris awal, tipe Date, repeat order, Order ID duplikat, status belum LUNAS, transaksi tanpa atribusi, serta refund.
- Endpoint tanpa autentikasi, kebocoran secret, migrasi, penghentian trigger, backup/restore, dan rollback.

Pilih lint, syntax check, dan test runner sesuai stack yang benar-benar tersedia. Jangan mengarang perintah atau hasil tes. Perubahan dokumentasi cukup diperiksa isi, konsistensi, tautan lokal, dan diff bila tersedia.

## 12. Tahapan dan syarat rilis

Ikuti urutan kerja PRD: audit/persiapan → UI staging → backend atribusi → Sheets/Apps Script → integrasi dan QA → go-live setelah persetujuan eksplisit.

Sebelum meminta persetujuan rilis, siapkan release candidate yang dapat diperiksa, hasil pengujian, konfigurasi tanpa secret, daftar blocker, serta prosedur deploy dan rollback. Jangan meminta ulang izin untuk pekerjaan lokal atau staging yang sudah diotorisasi.

Blocker produksi yang harus diselesaikan:

- Nomor WA CS resmi, foto hero/kategori/profil asli, logo master, serta alamat/kontak yang terverifikasi.
- Validasi klaim USP atau copy revisi yang disetujui pemilik.
- Audit tracking/privasi dan keputusan retensi.
- Google Sheets native beserta akses yang sesuai dan secret integrasi yang dibuat secara aman.
- QA, backup, rollback, dan panduan admin/CS.

Serahkan source plugin, aset, workbook final, Apps Script, contoh konfigurasi tanpa secret, bukti pengujian, runbook, dan daftar keterbatasan. Laporan penyelesaian harus menyebut apa yang berubah, apa yang sudah diuji, serta pekerjaan yang masih tertunda. Jangan menyatakan proyek selesai apabila gate Definition of Done Bab 17 PRD belum terpenuhi.
