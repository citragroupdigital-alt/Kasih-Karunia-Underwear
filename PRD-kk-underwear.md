# PRD — Landing Page Grosir KK Underwear & WhatsApp Offline Attribution

**Dokumen:** `PRD.md`  
**Versi dokumen:** 1.0 — spesifikasi implementasi berdasarkan brainstorming sampai PRD v2.2  
**Tanggal:** 2026-11-11 (WIB)  
**Pemilik bisnis:** CV. Kasih Karunia / KK Underwear  
**URL final:** <https://kk-underwear.id/grosir/>  
**Platform existing:** WordPress + Jupiter + WPBakery Page Builder (Modified Version) 7.9  
**Pelaksana implementasi:** Google Antigravity, **setelah** file ini ditinjau dan pekerjaan diotorisasi  
**Status:** Siap sebagai spesifikasi pembangunan; sejumlah data operasional/aset dan audit website masih menjadi prasyarat publikasi.

> **BATAS SCOPE PENTING** — PRD ini **tidak** memuat strategi atau implementasi SEO, AEO, GEO, riset keyword B2B, struktur campaign Google Ads, bidding, anggaran, penulisan iklan, maupun *Google Ads Readiness*. Seluruhnya akan dibuat pada **dokumen terpisah**. PRD ini **tetap** mencakup sistem pengumpulan atribusi WhatsApp, pencatatan transaksi Purchase, struktur workbook, dan penyiapan dataset offline Purchase karena semuanya merupakan fitur teknis produk yang telah disepakati. Pembuatan/aktivasi campaign, conversion action, dan koneksi impor di akun Google Ads berada di luar scope dokumen ini.

---

## 1. Ringkasan proyek

Bangun satu landing page grosir profesional pada website WordPress existing `kk-underwear.id`, memakai desain custom yang terpisah dari tema global, dengan fokus mengubah calon reseller dan pemilik toko menjadi percakapan WhatsApp yang berpotensi menghasilkan pembelian grosir. Harga dan katalog lengkap **tidak** ditampilkan di halaman; pengunjung meminta keduanya melalui satu nomor WhatsApp CS.

Sistem wajib menghubungkan upaya pembukaan WhatsApp (*handoff*) dengan Reference Code, menyimpan identitas klik iklan **hanya bila tersedia dan pemrosesannya diizinkan**, menyinkronkan data ke Google Sheets enam tab yang sudah dipilih, serta menyiapkan catatan **Purchase untuk setiap order yang sudah dibayar, termasuk repeat order**. Klik WhatsApp bukan Purchase dan bukan bukti bahwa pesan benar-benar dikirim.

### 1.1 Sasaran produk

1. Memperkenalkan CV. Kasih Karunia sebagai pemasok produk grosir untuk reseller/pemilik toko.
2. Menjelaskan kategori, MOQ, cara pesan, pengiriman, dan kredibilitas bisnis dengan cepat.
3. Mengarahkan seluruh CTA ke **“Minta Katalog Grosir”** melalui satu nomor WhatsApp CS.
4. Menghasilkan Reference Code yang mudah dipakai CS dan menjaga riwayat handoff secara akurat.
5. Menghubungkan catatan Closing CS dengan data handoff untuk menyiapkan Purchase yang valid, tanpa mengubah sistem penjualan menjadi WooCommerce/CRM baru.
6. Menjaga website existing tidak terganggu serta menyediakan kemampuan rollback.

### 1.2 Target pengunjung

- Reseller baru yang ingin mulai kulakan.
- Pemilik toko, pedagang, dan pelanggan grosir yang membutuhkan stok untuk dijual kembali.
- **Tidak** membuat pemisahan funnel teknis berdasarkan jenis pengunjung; satu landing page, satu alur WhatsApp.

### 1.3 Aturan bisnis yang telah dikunci

| Item | Keputusan final |
|---|---|
| URL | `https://kk-underwear.id/grosir/` |
| MOQ | Mulai **1 lusin (12 pcs)** |
| Harga produk di landing page | **Tidak ditampilkan** |
| Katalog lengkap/SKU/cart/checkout | **Tidak ditampilkan**, diberikan melalui CS |
| Kategori | Bra Wanita, Celana Dalam Pria, Celana Dalam Wanita, Kaos Kaki, Handuk |
| CTA utama | **Minta Katalog Grosir** |
| Jalur CTA | **Satu nomor** WhatsApp CS untuk semua tombol |
| Purchase bisnis | Semua transaksi **sudah dibayar**, termasuk repeat order |
| Reference Code | `KK-GA` + `YY` + empat digit nomor urut; contoh `KK-GA260001` |
| Pemakaian ulang kode | Kode sama untuk browser/pengunjung yang dapat dikenali selama **24 jam** dari penerbitan pertama |
| Riwayat tombol WA | Setiap handoff tetap dicatat sebagai event terpisah |
| Spreadsheet | **Enam tab existing**: Upload, Closing, Klik WA, Panduan, Ringkasan, Pengaturan |
| Consent | Rancangan **Basic Consent Mode**, audit existing wajib sebelum diterapkan |
| Retensi yang direncanakan | Browser Click ID maksimal 90 hari; atribusi WordPress 180 hari; tunduk audit/validasi |

---

## 2. Scope dan non-scope

### 2.1 Termasuk dalam pembangunan ini

- Halaman `/grosir/` dengan **custom header/footer khusus halaman**, tanpa mengubah header/footer global Jupiter.
- Semua section, responsive layout, aset gambar terpilih, interaksi CTA, accordion FAQ, dan desain visual.
- Custom plugin WordPress untuk landing page shortcode/render, konfigurasi WA CS, Reference Code, database, REST API, logging, dan pengamanan.
- Integrasi Google Apps Script untuk sinkronisasi WordPress → tab `Klik WA`.
- Penyesuaian **rumus dan Apps Script** pada workbook enam tab dari PusatGrosir.id, **tanpa mengubah struktur enam sheet atau konsep visualnya**.
- Rekonsiliasi catatan CS dan data klik untuk menghasilkan baris yang layak disiapkan sebagai Purchase; dokumentasi persyaratan data ekspor.
- Audit awal read-only WordPress, consent, tracking, plugin, serta pengujian dan dokumentasi rollback.
- Dokumentasi pengoperasian untuk admin dan CS.

### 2.2 Tidak termasuk dalam dokumen/implementasi ini

- **SEO, AEO, GEO**, metadata Yoast, keyword research, schema/search appearance, Search Console, atau ranking.
- **Google Ads Readiness**, penyusunan/aktivasi iklan, campaign/ad group/keyword, conversion action baru di akun, koneksi Data Manager live, strategi bidding, budget, atau optimasi iklan.
- Integrasi penjualan WooCommerce, katalog e-commerce, checkout online, price list publik, CRM kompleks.
- Integrasi otomatis WhatsApp Business API, chatbot, pengiriman pesan proaktif, atau pembacaan isi chat tanpa sistem resmi.
- Pengambilan keputusan hukum final mengenai kebijakan privasi; implementasi harus mengikuti audit dan persetujuan pihak berwenang.
- Perubahan global pada theme/plugin website tanpa instruksi terpisah.

**Dependensi lintas dokumen:** Tab `Upload` harus siap menghasilkan data Purchase yang terstruktur dan dapat diuji. **Pemetaan, pengaktifan, dan pembuktian penerimaan Purchase oleh Google Ads live** ditangani dalam dokumen terpisah.

---

## 3. Referensi desain dan aset

| Sumber | Penggunaan |
|---|---|
| `KK Meta Ads - Okt 26.jpg.jpeg` | Referensi identitas warna, suasana brand, logo, dan gradien CV. Kasih Karunia; **bukan** layout mentah website |
| `image(2).png` | **Copywriting Company Profile**: deskripsi Kasih Karunia, Visi, Misi |
| `image(3).png` | **Layout Company Profile**: dua kolom teks kiri, visual besar kanan |
| Gambar referensi statistik dan USP dari percakapan | Tiga statistik pada satu bar biru dan empat kartu USP di bawahnya |
| Foto produk asli CV. Kasih Karunia (belum disediakan) | Hero dan lima kartu kategori; **wajib** menggunakan produk asli dan tidak mengubah bentuk produk |
| Logo master resolusi memadai (belum disediakan) | Header, footer, identitas visual; tidak gunakan potongan poster berkualitas rendah sebagai logo final |

Aset yang belum tersedia diperlakukan sebagai **placeholder selama staging**, bukan alasan untuk mengarang foto gudang, staf, atau produk yang seolah-olah asli. Foto profil kanan dapat menggunakan dokumentasi toko/gudang/staf asli sesuai persetujuan bisnis. Jangan menggunakan foto PusatGrosir.id sebagai foto CV. Kasih Karunia.

### 3.1 Brand color tokens — acuan poster

Kode ini merupakan **estimasi visual dari poster JPEG**, bukan file panduan merek resmi.

| Token | HEX | Penggunaan utama |
|---|---|---|
| Royal Blue | `#0454D9` | Identitas utama, statistik, link/aksen |
| Hot Pink | `#F00688` | CTA utama, penekanan |
| Vibrant Purple | `#873FE8` | Aksen dan gradien |
| Sky Blue | `#49BDF5` | Highlight lembut |
| Soft Lavender | `#F8F1FB` | Background section |
| Deep Navy | `#151B33` | Heading dan teks utama |
| White | `#FFFFFF` | Background dan kartu |

Gradien utama: `Royal Blue → Vibrant Purple → Hot Pink`. Gradien CTA: `Hot Pink → Vibrant Purple`. Hero menggunakan campuran **putih + lavender + biru sangat muda**. Hindari elemen 3D dan ornamen berlebihan dari poster; landing page harus lebih clean dan mudah dipakai daripada desain poster iklan.

### 3.2 Prinsip UI

- Gaya **clean, modern, profesional**, margin lega, simetris, card rounded secukupnya, shadow halus, tidak penuh ornamen.
- Mobile-first, gambar rasio proporsional, teks terbaca, tombol WA tidak tertutup cookie banner.
- Kontras teks dan tombol cukup jelas; focus keyboard terlihat; semua interaksi dapat digunakan dengan keyboard dan pembaca layar.
- Hindari animasi berat, *layout shift*, *autoplay* mengganggu, dan carousels yang menyembunyikan penawaran utama.
- Elemen konten utama dibuat dalam HTML hasil render server; JS dipakai untuk interaksi/WA, bukan syarat agar halaman tampil.

---

## 4. Arsitektur informasi dan copywriting landing page

**Urutan section disetujui:**

1. Custom Header
2. Hero
3. Company Statistics
4. USP — empat kartu
5. Lima Kategori Produk
6. Tentang CV. Kasih Karunia
7. Cara Pemesanan
8. FAQ
9. Final CTA WhatsApp
10. Custom Footer

### 4.1 Custom Header

- Header khusus `/grosir/`, **tidak mewarisi navigasi lengkap yang mengalihkan traffic** dari landing page.
- Kiri: logo CV. Kasih Karunia / KK Underwear yang disetujui.
- Navigasi anchor: `Produk Grosir`, `Keunggulan`, `Tentang Kami`, `FAQ`.
- Kanan: tombol **Minta Katalog Grosir** menuju handler WhatsApp yang sama.
- Desktop: horizontal; mobile: ringkas, menu accessible bila diperlukan, CTA tetap terlihat.
- Sticky ringan hanya jika tidak mengganggu visual/ruang baca dan berfungsi dengan cookie banner.

### 4.2 Hero — konsep A: Foto Produk + Headline

**Desktop:** dua kolom, informasi di kiri, foto produk representatif di kanan.  
**Mobile:** heading → deskripsi → CTA → supporting text → gambar; jangan membuat CTA berada terlalu jauh di bawah fold.

**Konten:**

- Eyebrow: **SUPPLIER PAKAIAN DALAM & KAOS KAKI**
- H1: **Kulakan Grosir Mulai 1 Lusin!**
- Deskripsi: **Temukan pilihan bra wanita, celana dalam pria dan wanita, kaos kaki, serta handuk untuk kebutuhan reseller dan pemilik toko. Dapatkan katalog dan informasi harga grosir langsung dari tim CV. Kasih Karunia.**
- Tombol: **Minta Katalog Grosir**
- Supporting text: **Melayani Pengiriman ke Seluruh Indonesia**

**Foto hero:** foto produk asli (tidak mengubah bentuk, merek, dan rasio produk), penataan komersial rapi, tidak menggunakan SKU/harga. Foto harus mendapat persetujuan bisnis sebelum produksi.

### 4.3 Company Statistics

Bar biru horizontal penuh dengan tiga kolom sama besar, angka putih dominan. **Tiga angka dikonfirmasi pengguna sebagai data nyata:**

- **70.000+** — PRODUK TERJUAL
- **2.000+** — MITRA RESELLER
- **40.000+** — PELANGGAN PUAS

Pada mobile, boleh menjadi tiga baris/kolom bertumpuk tanpa mengubah urutan dan makna angka. Tidak membuat animasi counter palsu atau mengubah angka tanpa sumber bisnis.

### 4.4 USP — empat kartu

Ditempatkan **tepat di bawah statistik**; empat kartu putih rounded dengan border halus, ikon sederhana dalam bidang biru muda. Desktop empat kolom; mobile satu/dua kolom sesuai lebar.

| Judul | Copy referensi yang diminta | Status klaim |
|---|---|---|
| Kualitas Premium | Bahan kain katun organik pilihan terbaik untuk kenyamanan luar biasa pelanggan Anda. | **Wajib validasi**: tidak semua kategori otomatis katun organik |
| Harga Grosir | Harga tangan pertama langsung dari pabrik. Maksimalkan margin profit reseller Anda. | **Wajib validasi** status sumber pabrik dan janji margin |
| Kargo Termurah | Logistik andal dengan pilihan kargo volume besar memastikan biaya kirim tetap hemat. | **Wajib validasi** kata komparatif “Termurah” |
| Layanan CS | Tim Customer Service profesional siap membantu kebutuhan order mitra setiap hari. | **Wajib validasi** jam dan hari layanan |

**Gate copy:** Jika klaim yang dipilih belum bisa dibuktikan sebelum go-live, pemilik bisnis harus menyetujui revisi faktual yang tidak membuat janji berlebihan; Antigravity **tidak boleh mengarang** bukti maupun mengubah klaim sepihak.

### 4.5 Lima Kategori Produk Grosir

Lima kartu kategori, masing-masing menampilkan foto kategori asli, nama kategori, dan tautan CTA yang memanggil handler WhatsApp sama (boleh mengisi konteks kategori, tetapi **tetap satu nomor dan tanpa funnel terpisah**):

1. **Bra Wanita**
2. **Celana Dalam Pria**
3. **Celana Dalam Wanita**
4. **Kaos Kaki**
5. **Handuk**

Tidak membuat halaman SKU, harga, diskon fiktif, label stok, add-to-cart, atau tautan checkout. Nama kategori harus konsisten pada hero, FAQ, dan section lainnya.

### 4.6 Tentang CV. Kasih Karunia

**Layout wajib mencontoh `image(3).png`**, dengan copy dari `image(2).png`:

- Eyebrow kiri: **TENTANG KAMI**
- Headline kiri: **CV. KASIH KARUNIA**
- Kiri: deskripsi perusahaan, lalu subblok **VISI** dan **MISI** dengan hierarki visual jelas.
- Kanan: satu foto asli besar dalam frame rounded dan bayangan soft; jika belum ada, placeholder di staging.
- Mobile: 1 kolom; urutan teks dan gambar harus mempertahankan keterbacaan deskripsi serta misi.

**Deskripsi perusahaan (mengikuti gambar 1):**

> Kasih Karunia merupakan perusahaan yang bergerak di bidang daily needs. Kami berkomitmen memberikan produk-produk berkualitas tinggi dan terpercaya dengan harga yang terjangkau untuk kebutuhan konsumen Indonesia. Semua produk Kasih Karunia memiliki bahan-bahan berkualitas terbaik dari proses produksi hingga produk jadi yang disesuaikan dengan pasar konsumen Indonesia. Kami terus berkomitmen menyediakan model dan warna terbaru sesuai dengan tren terkini.

**VISI:**

> Menjadi distributor pakaian dalam dan daily needs berkualitas dengan pelayanan terbaik se-Indonesia.

**MISI:**

1. Selalu berinovasi mengikuti tren fashion masyarakat.
2. Mengutamakan kepuasan dan pelayanan terbaik untuk pelanggan.
3. Membangun tempat kerja yang sehat, bertumbuh dan berkembang untuk karyawan.
4. Berinovasi menciptakan terobosan teknologi baru dalam segi fashion.
5. Menciptakan sistem pelayanan yang efisien dan memberikan pengalaman yang menyenangkan.

Salinan di atas mengikuti referensi pengguna. Koreksi bahasa/copy baru hanya dilakukan dengan persetujuan pengguna.

### 4.7 Cara Pemesanan — empat langkah

1. **Minta Katalog Grosir:** Hubungi Customer Service melalui WhatsApp.
2. **Pilih Produk:** Lihat katalog, informasi harga, dan minimum pembelian 1 lusin.
3. **Konfirmasi Pesanan:** CS membantu memastikan detail pesanan dan pembayaran.
4. **Pengiriman Barang:** Pesanan diproses untuk dikirim sesuai ketentuan pengiriman.

Desktop: empat kartu horizontal berikon; mobile: kartu bertumpuk. Hindari elemen yang memberi kesan pembayaran di website.

### 4.8 FAQ — accordion

Teks jawaban harus tetap tersedia pada HTML, termasuk ketika panel sedang tertutup. Kontrol accordion dapat digunakan keyboard dan memiliki `aria-expanded`/hubungan panel yang benar.

| Pertanyaan | Jawaban |
|---|---|
| Berapa minimum pembelian grosir? | Minimum pembelian mulai dari 1 lusin (12 pcs). |
| Bagaimana cara mendapatkan katalog grosir? | Klik tombol Minta Katalog Grosir untuk menghubungi CS melalui WhatsApp. |
| Apakah harga grosir tersedia di website? | Informasi katalog dan harga grosir dapat diperoleh langsung melalui WhatsApp CS. |
| Apa saja produk yang tersedia? | Bra wanita, celana dalam pria, celana dalam wanita, kaos kaki, dan handuk. |
| Apakah reseller baru boleh melakukan pembelian? | Ya, KK Underwear melayani reseller baru dan pemilik toko. |
| Apakah melayani pengiriman ke seluruh Indonesia? | Ya, KK Underwear melayani pengiriman ke seluruh Indonesia. Ongkir dan pilihan ekspedisi dikonfirmasi melalui CS. |
| Bagaimana cara melakukan pemesanan? | Hubungi CS, pilih produk, konfirmasi pesanan dan pembayaran, kemudian barang diproses untuk pengiriman. |

### 4.9 Final CTA

- Background gradien brand **biru–purple–pink**, teks kontras, satu CTA utama.
- Heading: **Siap Kulakan untuk Usaha Anda?**
- Body: **Mulai grosir dari 1 lusin. Dapatkan katalog produk dan informasi harga langsung dari tim KK Underwear.**
- Tombol: **Minta Katalog Grosir**
- Pendukung: **Melayani Pengiriman Seluruh Indonesia**
- Mobile boleh memiliki **sticky CTA**; wajib menghindari tumpang tindih dengan banner consent, dialog, dan navigasi perangkat.

### 4.10 Custom Footer

- Logo dan nama perusahaan.
- Kontak WA CS yang sama dengan semua CTA.
- Identitas/alamat usaha **hanya setelah diverifikasi**; jangan mengarang alamat.
- Tautan ke Privacy Policy serta kontrol membuka kembali pengaturan cookie.
- Copyright.
- Tidak menampilkan navigasi penuh toko utama tanpa keputusan baru.

---

## 5. Customer journey dan perilaku CTA

1. Pengunjung membuka `/grosir/` melalui browser desktop/mobile.
2. Pengunjung melihat informasi MOQ/kategori/keunggulan dan menekan salah satu tombol **Minta Katalog Grosir**.
3. Jika diperbolehkan, plugin mencatat Click ID yang tersedia. Sistem menerbitkan atau menggunakan ulang Reference Code berlaku.
4. Plugin mencatat **event handoff** terpisah untuk setiap upaya klik CTA.
5. Browser diarahkan ke satu nomor WhatsApp CS dengan pesan permintaan katalog dan kode referensi jika berhasil.
6. CS mengirim katalog dan informasi harga, lalu mencatat transaksi jika pelanggan membayar.
7. Record Closing di spreadsheet dicocokkan dengan riwayat handoff untuk menyiapkan Purchase offline.

**Template pesan WA:**

> Halo CS CV. Kasih Karunia, saya ingin meminta katalog dan informasi harga grosir pakaian dalam, kaos kaki, serta handuk.  
> Kode Referensi: KK-GA260001  
> Terima kasih.

Contoh kode di atas bersifat ilustratif. Pada operasi nyata, kode harus dihasilkan backend. **Jangan pernah menampilkan atau menyalin GCLID/GBRAID/WBRAID ke pesan WhatsApp.**

### 5.1 Kegagalan yang harus ditangani

- API gagal/timeout: WhatsApp tetap terbuka dengan pesan tanpa kode, tanpa membuat kode palsu.
- Pengunjung menolak tracking opsional: WhatsApp tetap terbuka; tidak boleh mengumpulkan identitas iklan tanpa dasar yang sesuai.
- Browser memblokir popup setelah request async: gunakan pola navigasi yang tetap terpicu oleh aksi pengguna dan fallback tombol yang bisa diklik ulang.
- Nomor CS belum dikonfigurasi: **blokir go-live**, bukan mengarahkan ke nomor contoh.
- Klik CTA ganda sangat cepat: tidak membuat Reference Code berbeda dalam periode aktif; event tetap bisa diaudit tanpa membanjiri database.
- Halaman di-cache: respons API penerbitan kode dan data pengunjung **tidak boleh ter-cache sebagai respons bersama**.

---

## 6. Arsitektur WordPress

### 6.1 Batas integrasi existing

- Gunakan **WordPress existing**, tema **Jupiter**, **WPBakery 7.9 (Modified Version)**, MySQL/MariaDB existing.
- Halaman WordPress `/grosir/` berisi satu **shortcode** dari custom plugin; WPBakery hanya menjadi wadah/container.
- HTML section dirender dari template/plugin (server-side); CSS dan JavaScript adalah asset terpisah dengan enqueue bersyarat.
- Buat **plugin khusus** (nama usulan: `KK Grosir Landing & Offline Attribution`) yang menjaga UI dan tracking sebagai modul terpisah secara internal, tetapi dapat dikelola melalui satu paket plugin bila lebih sederhana.
- **Jangan** menempelkan seluruh CSS/JS di WPBakery Raw HTML, mengubah core, mengedit plugin vendor, atau membuat child-theme wajib tanpa alasan jelas.
- Header/footer default Jupiter disembunyikan/diganti **hanya** pada `/grosir/`, menggunakan pendekatan yang aman dan reversibel.
- CSS wajib scoped (`kkg-*` atau namespace sejenis) agar tidak menimpa styling halaman lain.
- Script, endpoint, dan database plugin tidak boleh berdampak pada WooCommerce atau halaman yang tidak menggunakan landing page.

### 6.2 Struktur modul yang diharapkan (konseptual, bukan kode)

- **Presentation:** shortcode, templates section, assets CSS/JS, image asset mapping.
- **Settings:** satu nomor CS, template pesan, opsi consent/retensi yang telah disetujui, secret integrasi, status koneksi.
- **Attribution Capture:** pemeriksaan izin, Click ID, URL/path, CTA context, timestamp.
- **Reference Registry:** alokasi kode server-side dan aturan pemakaian ulang 24 jam.
- **Handoff Event Log:** mencatat setiap upaya membuka WhatsApp.
- **Read-only Sync API:** menyediakan perubahan untuk Apps Script dengan autentikasi.
- **Maintenance:** rotasi secret, pembersihan data sesuai retensi, logging aman, pemantauan kesehatan.

### 6.3 Pengaturan WordPress Admin

- `Nomor WhatsApp CS` (satu nomor, input angka format internasional `62...`, tervalidasi).
- `Template pesan WhatsApp` (editable, mendukung placeholder kode dan konteks opsional).
- `Mode integrasi` (off / staging / active, default **off** sampai QA dan persetujuan).
- `Secret API sinkronisasi` (disimpan aman, tidak dipantulkan sebagai teks terbuka).
- `Status sinkronisasi` dan waktu terakhir (bila ada), tanpa data pelanggan sensitif.
- `Kebijakan retensi` (setelah audit disetujui).
- `Audit log` terbatas untuk admin berwenang.

Hak akses hanya untuk admin/role yang secara eksplisit diotorisasi. Setelan tidak boleh membocorkan secret ke browser/HTML.

---

## 7. Reference Code: aturan final

### 7.1 Format

- Pola: **`KK-GA{YY}{NNNN}`**.
- Contoh: **`KK-GA260001`** untuk kode tahun 2026, nomor 0001.
- Nomor urut **empat digit**; tidak ada `KK-GA2601` sebagai format final.
- Sequence dimulai `0001` setiap **tahun kalender Asia/Jakarta**.
- Kapasitas **9.999 kode baru per tahun**. Sistem memberi peringatan sebelum kapasitas habis; bila habis tidak boleh mengulang kode atau membuat kode invalid. WhatsApp tetap berjalan tanpa kode, dan admin mendapat alert.
- Kode unik secara **global** untuk seluruh CTA pada domain yang menggunakan fitur ini; jangan generate dari waktu/client random saja.
- Alokasi harus **atomik/transaction-safe** agar dua request paralel tidak menghasilkan kode sama; constraint UNIQUE pada database menjadi pengaman terakhir.

### 7.2 Aturan reuse 24 jam

- Kode berlaku 24 jam **sejak penerbitan pertama** (masa berlaku tidak digeser oleh klik berikutnya).
- Jika browser yang sama dapat dikenali secara sah, klik ulang selama masa aktif memakai **kode yang sama**.
- Setiap upaya CTA menciptakan **event handoff baru** dengan timestamp dan CTA context.
- Setelah 24 jam berakhir, upaya berikutnya mendapatkan kode baru menurut sequence tahun saat itu.
- Melintasi pergantian tahun: kode yang masih aktif tetap dipakai hingga 24 jamnya habis; kode baru setelah expiry menggunakan sequence tahun baru.
- Penggunaan ulang lintas perangkat/browser tidak dijanjikan. Jika izin penyimpanan anonim yang diperlukan tidak tersedia, kode reuse hanya *best effort*; jangan membuat fingerprint perangkat tersembunyi.
- Gunakan idempotency untuk retry permintaan yang sama agar masalah jaringan tidak menghasilkan event/kode ganda di luar aturan yang diinginkan.

### 7.3 Pembaruan Click ID pada kode aktif

- Jika browser kembali melalui klik iklan baru saat Reference Code masih aktif, simpan **riwayat Click ID dan waktunya**, jangan menimpa sejarah tanpa jejak.
- Rekomendasi pemilihan lokal: **last eligible Google Ads click** dari data yang sah, sebelum waktu transaksi yang hendak dicocokkan.
- **Larangan penting:** Click ID yang baru terjadi **setelah** suatu Purchase tidak boleh retroaktif mengatribusikan Purchase lama.
- Satu Reference Code bisa dipakai untuk beberapa Purchase; **satu Order ID hanya untuk satu Purchase bisnis**.
- Validitas impor dan jendela atribusi tetap menjadi ketergantungan konfigurasi Google Ads yang dikelola dalam dokumen terpisah.

---

## 8. Model data WordPress

Gunakan custom table dengan prefix WordPress aktual (`$wpdb->prefix`), bukan asumsi bahwa prefix pasti `wp_`.

### 8.1 Reference registry — contoh nama konseptual `{prefix}kk_wa_references`

| Field | Keterangan |
|---|---|
| `id` | ID internal, integer unik; dipakai sebagai identitas stabil satu Reference Code |
| `reference_code` | Unik; format KK-GA + YY + 4 digit |
| `anonymous_token_hash` | Identitas pseudonim 24 jam bila dasar pemrosesan memungkinkan; jangan menyimpan fingerprint invasif |
| `issued_at_utc` | Waktu terbit dalam UTC |
| `expires_at_utc` | Waktu kedaluwarsa terbit + 24 jam |
| `last_eligible_click_*` | Snapshot opsional untuk tampilan ringkas; sejarah lengkap tetap di event log |
| `last_handoff_at_utc` | Waktu handoff terakhir |
| `status` | Active / expired / invalid, jika diperlukan |
| `created_at_utc`, `updated_at_utc` | Audit timestamps |

**Catatan:** Anonim token/hash dan Click ID adalah data yang berpotensi terkait identitas pengunjung; aturan consent/retensi wajib diterapkan.

### 8.2 Handoff/event history — contoh nama `{prefix}kk_wa_events`

| Field | Keterangan |
|---|---|
| `id` | Event ID autoincrement; juga bisa menjadi *change cursor* untuk sinkronisasi |
| `reference_id` | FK/logical reference ke registry, boleh null pada fallback yang gagal menerbitkan kode |
| `event_type` | Handoff / attribution_update / fallback / error, seperlunya |
| `cta_context` | Enum/whitelist: header, hero, category, sticky, final_cta, dll. |
| `landing_path` | Path relatif, misalnya `/grosir/` |
| `gclid`, `gbraid`, `wbraid` | Click ID yang tersedia **dan boleh disimpan** |
| `click_observed_at_utc` | Waktu klik iklan/penerimaan identitas sesuai data tersedia; beri nama yang tidak mengklaim timestamp iklan asli jika tidak diketahui |
| `handoff_at_utc` | Waktu upaya membuka WhatsApp |
| `result` | Attempted/open initiated/fallback/error; **bukan** chat terkirim |
| `consent_state` | Kategori izin/snapshot kebijakan yang relevan, tanpa menyimpan data berlebihan |
| `idempotency_key_hash` | Untuk mencegah pemrosesan retry yang sama berkali-kali |

Index minimal pada reference code, event time, reference ID, Click ID yang benar-benar digunakan untuk pencarian, dan cursor sinkronisasi. Pilih skema efisien; tidak boleh bergantung pada tabel WooCommerce.

### 8.3 Sequence dan concurrency

Desain sequence per tahun WIB yang aman terhadap proses paralel, misalnya tabel counter khusus ber-UNIQUE tahun atau mekanisme transaksi DB setara. Jangan bergantung pada `MAX(reference_code)+1` tanpa locking. Berikan migrasi skema yang idempotent, cek hasil migrasi, dan rollback plan. **Jangan menghapus tabel berisi data produksi saat uninstall tanpa persetujuan terpisah.**

---

## 9. REST API: kontrak implementasi

### 9.1 Public handoff endpoint

**Endpoint usulan:** `POST /wp-json/kk-offline/v1/handoff`

**Input yang diperbolehkan (konseptual):** `cta_context`, path landing, client request/idempotency key, token reuse bila sah, Click ID yang dapat diproses sesuai consent. Jangan menerima nomor tujuan WhatsApp arbitrer, `reference_code` buatan browser, nominal transaksi, atau status Purchase dari client.

**Tugas server:** validasi origin/context/input, autentikasi ringan berbasis request constraints sesuai endpoint publik, rate limiting, resolve/create Reference Code, catat event, kembalikan kode dan data aman untuk membentuk link WhatsApp. Periksa HTTPS, nonces sesuai kebutuhan (nonce publik bukan pengganti rate limiting), dan cegah abuse enumerasi kode.

**Respons sukses:** informasi `reference_code`, `expires_at` dan pesan/URL WA yang aman; tidak mengandung token rahasia/Click ID. **Respons wajib no-store**.

**Respons gagal:** kode kesalahan non-sensitif. Frontend langsung memberi jalur buka WhatsApp fallback tanpa kode.

### 9.2 Authenticated sync endpoint

**Endpoint usulan:** `GET /wp-json/kk-offline/v1/handoffs`

- Autentikasi memakai secret **Bearer Token** yang hanya disimpan di backend/plugin dan Apps Script Properties.
- HTTPS wajib, token dapat dirotasi, endpoint memiliki rate limit, pagination, dan server-side bounds.
- Sinkronisasi harus tahan re-run dan mengembalikan perubahan terhadap Reference Code yang sudah ada.
- Output merupakan **satu snapshot terkini per Reference Code per change event**, diurutkan berdasarkan cursor perubahan, bukan setiap klik ditambahkan menjadi baris berbeda dengan kode sama.

**Kontrak v1 yang diminta untuk perbaikan Apps Script (sengaja berbeda dari script baseline):**

| Field | Makna |
|---|---|
| `change_id` | ID perubahan monotonik dari event log; kunci incremental cursor |
| `id` | ID **registry** Reference Code yang stabil; cocok ke `Klik WA!H` |
| `reference_code` | Format `KK-GA{YY}{NNNN}` |
| `gclid`, `gbraid`, `wbraid` | Identitas terakhir yang layak untuk tampilan ringkas, bila tersedia |
| `created_at` | Waktu handoff/atribusi terkait dalam ISO 8601 UTC; jangan campur dengan WIB string |
| `landing_page` | Path relatif |
| `wa_context` | Konteks CTA |
| `last_change_id` | Cursor akhir batch hasil respons |
| `has_more` | Boolean halaman berikutnya masih ada |

Query usulan: `after_change_id` + `limit` (default maksimum yang divalidasi). Cursor baru hanya disimpan Apps Script **setelah** perubahan baris berhasil ditulis. Respon yang kedaluwarsa/error tidak boleh mengubah cursor.

**Penting:** Pencocokan Purchase dengan beberapa Click ID dalam satu reference tetap memerlukan riwayat event dan pemeriksaan **as-of waktu pembayaran**. Nilai terakhir di tab `Klik WA` saja **tidak cukup** untuk membenarkan atribusi seluruh Purchase historis. Antigravity harus menambahkan proses rekonsiliasi/historical lookup yang aman tanpa mengubah jumlah tab yang disepakati.

### 9.3 Keamanan API

- Batasi permission WordPress Admin hanya untuk role berwenang.
- Sanitasi semua input; `cta_context` whitelist, `landing_page` relative path, Click ID dibatasi panjang/karakter.
- Jangan log token, nomor pribadi, full URL yang memuat ID sensitif, atau data pelanggan secara terbuka.
- Pertimbangkan formula injection ketika data jaringan ditulis ke Google Sheets.
- Pertahankan audit event, tetapi tetapkan pembersihan data sesuai retensi.
- API tidak boleh dapat menghasilkan Purchase oleh visitor.

---

## 10. Google Sheets / Excel: workbook enam tab wajib dipertahankan

**Template utama dan tampilan:** `KK_Underwear_Offline_Conversion_Purchase.xlsx`, yang merupakan adaptasi workbook `Offline Conversion Google Ads - PusatGrosir (8).xlsx` milik pengguna. Jangan mengganti dengan template empat tab alternatif atau mendesain workbook baru.

**Nama dan urutan tab existing:**

1. **Upload**
2. **Closing**
3. **Klik WA**
4. **Panduan**
5. **Ringkasan**
6. **Pengaturan**

### 10.1 Kontrak kolom existing yang harus dipertahankan

**Tab `Klik WA` (A:H):**

| Kolom | Header |
|---|---|
| A | Kode Ref |
| B | GCLID |
| C | GBRAID |
| D | WBRAID |
| E | Waktu Klik (WIB) |
| F | Halaman Landing |
| G | Catatan |
| H | (bantu) Lead ID |

**Tab `Closing` (A:L):**

| Kolom | Header / pemilik |
|---|---|
| A | Kode Ref (dari chat) — CS |
| B | Tanggal Closing — CS; secara operasional berarti **tanggal pembayaran terverifikasi** |
| C | Jam Closing — CS; secara operasional berarti **jam pembayaran terverifikasi** |
| D | Nilai Order (IDR) — CS; **nilai Purchase dibayar** |
| E | Nomor WA Pembeli (opsional, internal) — CS |
| F | Jenis Pembeli (Baru/Repeat) — CS, **tidak memfilter Purchase** |
| G | Catatan — CS |
| H | Status Pelacakan (otomatis) |
| I | Peringatan Duplikat (otomatis) |
| J | Order ID — CS, wajib dan unik |
| K | Status Pembayaran — CS; nilai **LUNAS** untuk Purchase eligible |
| L | Status Closing (otomatis) |

**Tab `Upload` (A:P), tetap tab pertama:**

`Siap Upload`, `Alasan Belum Siap`, `GCLID`, `GBRAID`, `WBRAID`, `Nama Konversi`, `Waktu Konversi`, `Nilai Konversi`, `Mata Uang`, `Order ID`, `Jenis Pembeli`, kolom bantuan baris/waktu klik/waktu closing/duplikat/kunci duplikat.

`Panduan`, `Ringkasan`, dan `Pengaturan` tetap ada, dengan perbaruan isi/fungsi yang diperlukan namun **layout, identitas visual, nama tab, dan alur penggunaan dipertahankan**.

### 10.2 Aturan Closing dan Purchase

- CS mengisi **satu baris per transaksi pembayaran** yang benar-benar selesai; repeat order juga satu baris baru.
- **Order ID unik global** per transaksi. Satu Reference Code boleh berhubungan dengan lebih dari satu Order ID.
- Hanya `LUNAS` dengan tanggal + jam valid, nominal positif, Order ID unik, dan data atribusi yang memenuhi syarat boleh ditandai siap untuk pipeline upload.
- Data bisnis yang lunas tetapi tidak memiliki Click ID tetap tercatat dalam `Closing`/`Ringkasan`; **tidak** dipaksa menjadi Purchase teratribusi iklan.
- `Baru` / `Repeat` untuk analisis; keduanya dapat menjadi Purchase yang valid.
- Refund/pembatalan sesudah pembayaran perlu prosedur rekonsiliasi dan penyesuaian data, tidak cukup menghapus baris tanpa audit.
- Pencocokan Reference Code **case-consistent**, trim whitespace, validasi pola final `^KK-GA\d{6}$` dengan pemisahan 2 digit tahun + 4 digit nomor urut.
- Sel tanggal waktu pada Google Sheets harus **tipe Date**, bukan string yang kebetulan mirip timestamp.
- Zona tampilan: **Asia/Jakarta**. Data server: **UTC**.

### 10.3 Kondisi nyata file baseline yang perlu diperbaiki

**Ditemukan saat pemeriksaan file terlampir:**

1. `KK_Underwear_Apps_Script_Code.gs` saat ini menampilkan contoh kode lama `KK-GA2601`, dan regex saat ini menerima panjang variabel `KK-GA\d{4,}`. **Harus diganti** sesuai format final `KK-GA260001`.
2. Script saat ini menerapkan **append-only** berdasarkan `Lead ID` dan `after_id`, belum menangani perubahan atribusi pada kode yang digunakan ulang. **Harus diubah menjadi upsert** dengan cursor perubahan sebagaimana bagian 9.2.
3. File `Panduan` pada workbook masih memiliki contoh `KK-GA2601`; **perbarui** tanpa mengubah layout.
4. Formula pada `Upload` saat ini menggunakan satu baris `Klik WA` per kode. Untuk kondisi *last eligible click* berubah atau Purchase terjadi sebelum perubahan Click ID, formula saja dapat kehilangan kronologi. **Tambahkan pemeriksaan riwayat as-of pembayaran** atau enrichment hasil rekonsiliasi melalui Apps Script/backend; jangan mengatribusikan transaksi ke klik yang datang setelah transaksi.
5. Workbook saat ini mengasumsikan batas rentang (mis. `Klik WA` sampai 5.000 baris, `Closing` sampai 500 baris); **rancang strategi ekspansi yang tetap mempertahankan tata letak** dan tidak diam-diam berhenti memproses data setelah limit tercapai.
6. `Pengaturan` memiliki nilai contoh jendela konversi/usia klik 90 hari. Jangan menjadikannya aturan tetap tanpa verifikasi pada sistem impor yang dikelola melalui dokumen terpisah.

**Instruksi untuk Antigravity:** file XLSX dan `.gs` yang sudah disiapkan adalah **baseline/referensi**, **bukan bukti integrasi produksi telah berjalan**. Wajib uji rumus setelah dikonversi ke Google Sheets; Excel dan Google Sheets dapat berbeda dalam format/tanggal/fungsi.

### 10.4 Sync Apps Script

- Gunakan Apps Script dalam **Spreadsheet Google Sheets versi native**, bukan `.xlsx` lokal sebagai target langsung.
- Script Properties: URL API KK, Bearer secret, Spreadsheet ID, cursor sinkronisasi; jangan hardcode secret di source code.
- Sinkronisasi terjadwal **15 menit**.
- Panggil endpoint WordPress terautentikasi melalui HTTPS.
- Upsert baris `Klik WA` menurut ID registry stabil di **kolom H**. Jangan membuat dua baris dengan Reference Code sama hanya karena dua klik CTA.
- History semua klik tetap ada di database WordPress, bukan dengan menggandakan `Klik WA`.
- Gunakan Apps Script `LockService` atau mekanisme setara untuk mencegah sinkronisasi tumpang tindih.
- Cursor commit **setelah write berhasil**; retry setelah gagal tidak menggandakan baris.
- Update baris yang sama jika snapshot Click ID/CTA berubah, dengan prinsip tidak merusak koreksi data Closing yang sudah disetujui.
- Berikan `Run Diagnostics`, instal trigger, stop trigger, retry, dan logging error non-sensitif.
- Jangan membuat pengiriman Purchase otomatis ke Google Ads dalam script sinkronisasi ini; sambungan Google Ads live termasuk dokumen implementasi terpisah.

### 10.5 Dashboard dan Panduan

`Ringkasan` minimal mencatat:

- Jumlah Reference Code/handoff, dipisahkan dari jumlah percakapan WA terverifikasi.
- Jumlah Purchase bisnis LUNAS.
- Purchase yang memiliki hubungan atribusi sah.
- Purchase non-iklan/tanpa kode/kode tidak ditemukan.
- Total nilai transaksi tercatat, bila memungkinkan tanpa mengubah susunan utama.
- Penanda `Baru` dan `Repeat` bila diisi oleh CS.
- Kualitas data: duplikat, tanggal invalid, kode invalid, pembayaran belum LUNAS, error sinkronisasi.

`Panduan` harus menjelaskan bahwa **klik WA ≠ chat terkirim ≠ Purchase**, kolom mana yang boleh diedit CS, cara mencari kode, cara menangani repeat order dan refund, serta bahwa hanya tim berwenang yang boleh mengaktifkan impor eksternal.

---

## 11. Privasi, consent, dan retensi

### 11.1 Keputusan bersyarat audit

- Kondisi Privacy Policy dan Cookie Consent website saat ini: **belum diverifikasi**.
- **Wajib audit read-only** sebelum implementasi: halaman policy, cookies/storage yang dipakai tema/plugin, Google Site Kit, PixelYourSite, WooCommerce, tag/consent yang sudah aktif, potensi duplikasi, serta dampak cache.
- **Rancangan awal:** Google Consent Mode v2 **Basic** untuk komponen yang memang digunakan, dengan default pengukuran opsional tidak berjalan sebelum izin sesuai kebutuhan hukum/kebijakan.
- Jangan menambahkan banner kedua bila website existing sudah memiliki CMP yang kompatibel dan dapat dipakai.
- Pengunjung yang menolak tracking tetap bisa menekan WA dan meminta katalog.

### 11.2 UX cookie consent

- Banner minimalis bottom screen, mengikuti warna merek.
- Opsi jelas: **Tolak Opsional**, **Atur Pilihan**, **Terima Semua**.
- Tautan **Kebijakan Privasi** dan cara membuka kembali pengaturan.
- Kategori: Necessary, Analytics, Advertising/Attribution; Personalization hanya jika benar-benar diperlukan.
- Jangan menggunakan desain yang mempersulit penolakan atau menutupi CTA di mobile.
- Status izin dan versi teks informasi dapat diaudit sesuai dasar hukum yang berlaku.

### 11.3 Kebijakan retensi rancangan

| Data | Usulan |
|---|---|
| Token reuse anonim | Maksimal **24 jam** |
| Click ID browser | Maksimal **90 hari**, bila diizinkan |
| Data atribusi di database WordPress | **180 hari** sebelum cleanup, kecuali pengecualian yang disetujui |
| Data Closing/penjualan | Mengikuti kebijakan administrasi/pembukuan dan kewajiban hukum perusahaan |
| Data persetujuan | Ikuti kebijakan retensi yang ditetapkan setelah audit; 180 hari hanya usulan awal |

Retention ini **bukan** pengaturan otomatis atas Google Ads conversion window. Aturan impor Google Ads diverifikasi di dokumen terpisah. Harus ada mekanisme penghapusan/cleanup yang dapat diuji, tidak merusak ledger transaksi, serta mekanisme menghapus data ketika sah diminta sesuai kebijakan.

**Larangan:** menyimpan nomor WA pembeli di query URL/UTM, menyimpan secret di browser, memakai fingerprint tanpa pemberitahuan, atau mengganti pengaturan consent global tanpa audit.

---

## 12. Performa, responsivitas, aksesibilitas, dan kualitas

### 12.1 Responsivitas

- Desktop lebar: header horizontal, hero dua kolom, statistik tiga kolom, USP empat kolom, profil dua kolom.
- Tablet: susunan menyesuaikan ruang; tidak memotong foto produk atau teks.
- Mobile: semua komponen satu kolom/dua kolom adaptif, tombol WA terlihat, sticky CTA tidak menutupi akhir halaman maupun consent.
- Uji ukuran minimum setara 320 px, 375 px, 390 px, tablet, dan desktop lebar.

### 12.2 Performa

- Prioritaskan ukuran dan format gambar yang efisien, `srcset`/sizing tepat, lazy-load untuk konten di bawah fold.
- Hero image boleh diprioritaskan; hindari semua gambar dimuat full-resolution secara bersamaan.
- CSS/JS hanya dimuat pada landing page; minimalkan dependensi pihak ketiga.
- Endpoint handoff tidak menghambat tampilan halaman.
- Animasi dan shadow tidak mengorbankan kelancaran mobile.
- Verifikasi dengan pengujian browser nyata dan catat baseline dibanding halaman existing.

### 12.3 Aksesibilitas

- Kontrol menu/accordion/tab dapat digunakan dengan keyboard dan memiliki label yang jelas.
- Fokus keyboard, target sentuh cukup besar, kontras tombol/teks, serta alt text sesuai gambar.
- Tidak mengandalkan warna saja untuk menyampaikan informasi.
- Dukungan `prefers-reduced-motion` untuk animasi opsional.

---

## 13. Keamanan dan operasional

- Staging terlebih dahulu; backup database/files sebelum deployment.
- Gunakan WordPress hooks/API standar; jangan mengedit `functions.php` tema aktif secara langsung untuk fitur inti.
- Query DB melalui API aman (`$wpdb` dengan prepared queries saat diperlukan); input/output disanitasi/di-escape.
- Autentikasi dan otorisasi endpoint dengan kemampuan yang sesuai; public endpoint diberi rate limit dan abuse controls.
- Logging tidak berisi secret/PII berlebihan; admin memiliki status kesehatan sinkronisasi.
- Perubahan schema harus idempotent dan tidak menghapus data tanpa persetujuan.
- Bila plugin dinonaktifkan: halaman lama WordPress tidak rusak, fitur tracking berhenti, backup data tetap dapat dipulihkan.
- Sediakan prosedur rotasi token, stop Apps Script trigger, pemutusan endpoint sinkronisasi, dan rollback versi plugin.
- Tidak mengaktifkan proses impor yang mengubah data akun Google Ads live tanpa persetujuan terpisah.

---

## 14. Acceptance criteria / test cases wajib

### 14.1 Frontend

1. `/grosir/` menampilkan urutan 10 bagian sesuai Bab 4.
2. Hanya kategori yang disetujui ditampilkan; **tidak ada harga, SKU, cart, checkout, form kualifikasi**.
3. Hero memakai foto produk asli dan H1/CTA disetujui.
4. Statistik persis `70.000+`, `2.000+`, `40.000+`; tidak hilang pada mobile.
5. Copy About mengikuti referensi gambar 1, layout mengikuti gambar 2.
6. FAQ accordion berfungsi dengan keyboard dan konten tetap terbaca.
7. Header/footer khusus `/grosir/`; halaman lain tetap menggunakan Jupiter tanpa perubahan visual.
8. Semua CTA mengarah ke **satu nomor** WA yang dikonfigurasi.
9. Sticky CTA, popup WA, dan consent banner tidak saling menutupi.
10. Hero/foto/konten tidak pecah di desktop/tablet/mobile.

### 14.2 Reference Code dan handoff

11. Klik pertama memberi `KK-GA260001` (sesuai sequence tahun/lingkungan test) dan tercatat di DB.
12. Dua pengunjung bersamaan tidak menerima kode yang sama.
13. Klik berulang dalam 24 jam memakai **kode sama** dan masing-masing event dicatat.
14. Klik setelah expiry mendapatkan kode baru, bukan memperpanjang masa kode lama.
15. Jika ada klik iklan baru selama reuse, histori Click ID tetap ada dan sinkronisasi dapat memperbarui ringkasan.
16. Jika klik baru terjadi setelah pembayaran, Purchase sebelumnya tidak diatribusikan ke klik baru tersebut.
17. Tidak ada kode lebih dari empat digit tanpa penanganan kapasitas 9.999/tahun; nomor tidak diulang.
18. Tanpa Click ID/izin pelacakan, WA tetap terbuka tanpa data iklan yang dilarang.
19. Jika REST gagal/timeout, fallback WA tanpa kode tetap bisa dipakai.
20. Klik tombol WA tidak tercatat sebagai Purchase maupun chat benar-benar terkirim.

### 14.3 Sheets dan Closing

21. Enam nama/urutan sheet dan layout visual tetap seperti template yang dipilih.
22. Apps Script bisa memasukkan satu baris `Klik WA` per kode dan memperbarui baris bila ada perubahan, tanpa duplikasi.
23. Idempotent sync: menjalankan ulang setelah gagal tidak menggandakan Lead ID/kode.
24. Date/time `Klik WA!E` adalah Date asli yang benar ditampilkan WIB.
25. Closing LUNAS dengan Order ID unik, nilai >0 dan waktu valid masuk perhitungan Purchase bisnis.
26. Pembayaran belum LUNAS tidak menjadi Purchase.
27. Dua Order ID berbeda dengan satu Reference Code termasuk dua Purchase bisnis bila keduanya LUNAS.
28. Order ID duplikat tidak menghasilkan dua Purchase.
29. Kode tidak ditemukan/tanpa Click ID tetap tercatat sebagai transaksi bisnis tetapi tidak dipaksakan menjadi data konversi beratribusi.
30. Formula/reconciliation untuk beberapa klik tidak menganggap klik **sesudah** Purchase sebagai atribusi valid.
31. Semua contoh kode format lama diganti menjadi `KK-GA{YY}{NNNN}`.
32. Data di luar batas baris awal 500/5.000 tidak hilang diam-diam.
33. `Upload` tidak otomatis mengaktifkan unggahan ke Google Ads live dalam scope ini.

### 14.4 Privasi, keamanan, operasi

34. Audit privacy/tracking existing terdokumentasi sebelum enablement.
35. Penolakan consent opsional tidak menghalangi WhatsApp.
36. Token API tidak terlihat pada frontend, respons publik, sheet publik, atau log umum.
37. API sync yang tidak terautentikasi ditolak tanpa membocorkan isi database.
38. Trigger sinkronisasi dapat dimatikan tanpa mematikan website.
39. Tidak ada benturan CSS/JS, error PHP, atau perubahan global di Jupiter/WPBakery/WooCommerce.
40. Backup, rollback, dan panduan CS/admin selesai diuji sebelum publikasi.

---

## 15. Rencana kerja untuk Google Antigravity

Setiap fase memiliki **deliverable** dan **gate** yang bisa diperiksa. Jangan melakukan deployment live otomatis hanya karena tugas pengembangan selesai.

### Fase 0 — Audit read-only & persiapan

1. Periksa versi WordPress/PHP/MySQL, Jupiter, WPBakery, WooCommerce, Site Kit, PixelYourSite, caching, existing theme hooks.
2. Audit Privacy Policy, consent banner/CMP, penempatan tag/duplikasi dan kondisi website, **tanpa mengubah setting**.
3. Inventaris foto asli, logo, dan aset yang telah diberi izin.
4. Buat staging + backup/restore point. Dokumentasikan risiko konflik dan pendekatan penggantian header/footer khusus halaman.
5. Bandingkan workbook `.xlsx` serta `.gs` baseline dengan keputusan PRD, catat gap format kode dan upsert.

**Output:** laporan audit, daftar risiko dan keputusan teknis, checklist aset yang belum tersedia.

### Fase 1 — UI landing page di staging

1. Bangun plugin/template shortcode, CSS scoped, JS modular.
2. Buat 10 section beserta responsive styling sesuai referensi.
3. Masukkan copy yang sudah dikunci; tandai USP belum diverifikasi sebagai blok yang tidak boleh dipublikasikan.
4. Buat custom header/footer khusus landing.
5. Uji desktop/mobile/keyboard/CTA dengan nomor sandbox atau nomor uji resmi, bukan nomor karangan.

**Output:** preview staging landing page, screenshot multi-device, hasil QA UI.

### Fase 2 — Backend WA attribution

1. Buat skema Reference Registry, Event Log, sequence atomik.
2. Implementasi reuse 24 jam, idempotency, rate limit, fail-open to WhatsApp.
3. Implementasi admin settings dan REST endpoint publik/privat.
4. Implementasi consent gating berdasarkan hasil audit yang disetujui.
5. Uji concurrency, retry, expiry, rollover tahun, limit 9.999.

**Output:** plugin backend di staging, API contract final dan hasil pengujian.

### Fase 3 — Spreadsheet & Apps Script

1. Jadikan workbook enam tab terpilih sebagai template utama; pertahankan styling/urutan/tab.
2. Perbaiki contoh/regex Reference Code, formula dan validasi pembayaran serta deduplikasi.
3. Adaptasi Apps Script menjadi sync **upsert** dengan *change cursor* dan update data yang aman.
4. Pastikan pemilihan Click ID historis tidak melanggar kronologi Purchase.
5. Konversi workbook ke Google Sheets native dan uji rumus setelah konversi.
6. Uji data dummy lengkap, termasuk repeat, tanpa kode, refund, concurrent click, error API, dan retry.

**Output:** workbook Google Sheets/Excel final, Apps Script final, dokumentasi Script Properties, panduan admin/CS, matriks tes dan hasil.

### Fase 4 — Integrasi, QA, dan persetujuan rilis

1. End-to-end staging: klik CTA → Reference Code → WA → API → tab Klik WA → Closing LUNAS → Upload prepared.
2. Audit ulang keamanan dan privacy; cek tidak ada data PusatGrosir.id atau token test terikut.
3. Review copy USP dan aset asli oleh pemilik bisnis.
4. Verifikasi WordPress existing tidak berubah di halaman lain.
5. Minta persetujuan rilis **eksplisit** dan jadwalkan cutover/rollback.

**Output:** release candidate, checklist pass/fail dengan bukti, instruksi rollback dan runbook.

### Fase 5 — Go-live setelah persetujuan

- Deploy plugin/halaman yang telah diuji, aktifkan nomor CS resmi dan integrasi yang sudah diotorisasi.
- Pantau error API/Apps Script dan seluruh jalur WA selama masa hypercare.
- Jika gagal, hentikan sinkronisasi/rollback plugin tanpa mengubah data Closing.
- **Tidak** mengaktifkan pengaturan campaign atau impor Google Ads live melalui PRD ini.

---

## 16. Data/keputusan yang masih harus dilengkapi sebelum produksi

| Item | Status sekarang | Penanggung jawab / gate |
|---|---|---|
| Nomor WhatsApp CS resmi (format `62...`) | **Belum diberikan** | Owner menyediakan sebelum QA link final |
| Foto produk asli untuk Hero + 5 kategori | **Belum diberikan** | Owner/Creative menyetujui aset |
| Foto asli untuk profil perusahaan | **Belum dipilih** | Owner/Creative memilih aset |
| Logo master resolusi tinggi | **Belum diberikan** | Owner/Creative |
| Alamat usaha/kontak di footer | **Belum diverifikasi** | Owner |
| Copy klaim 4 USP | Sebagian klaim **belum diverifikasi** | Owner menyetujui bukti atau copy revisi |
| Privacy Policy/CMP/tag existing | **Belum diaudit** | Dev/Admin audit read-only; pemilik menyetujui tindakan |
| Persetujuan retensi 90/180 hari | Disepakati sebagai **rancangan awal**, bukan verifikasi hukum | Owner + admin/privacy review |
| Identitas Google Sheets native + owner akses | **Belum tersedia** | Owner/Admin membuat salinan dari workbook final |
| Token API WP ↔ Apps Script | **Belum dibuat** | Dev membuat secara aman pada environment target |
| Mechanism upload Purchase ke Google Ads | **Di luar scope PRD ini** | Dokumen terpisah |

**Prinsip:** Jika input belum tersedia, bangun dengan placeholder/konfigurasi dan tandai blocker produksi. Jangan mengisi nomor, alamat, foto, atau bukti bisnis fiktif.

---

## 17. Definition of Done (DoD)

Proyek ini dianggap **selesai untuk scope PRD ini** ketika:

- Landing page sesuai desain/copy yang dikunci, mobile responsif, dan bekerja di WordPress existing tanpa mengganggu halaman lain.
- Satu nomor CS digunakan konsisten untuk semua CTA; WA tetap dapat diakses saat tracking gagal/ditolak.
- Reference Code empat digit, reuse 24 jam, event log, update atribusi historis, concurrency, dan capacity guard diuji.
- Workbook enam tab tetap sesuai referensi; rumus, Apps Script, deduplikasi, Closing, dan tab Upload diuji dengan transaksi simulasi.
- Semua transaksi LUNAS termasuk repeat tercatat sebagai Purchase **bisnis**, dengan pemisahan jelas terhadap Purchase yang dapat diatribusi ke klik iklan.
- Privasi, keamanan, backup, admin/CS runbook, dan rollback lolos review.
- Semua aset/klaim dan nomor WA yang masih blocker telah disetujui; hasil audit dilampirkan.
- Tidak ada activation akun Google Ads live, campaign, atau konfigurasi SEO yang dilakukan berdasarkan dokumen ini.

---

## 18. Instruksi ringkas untuk pelaksana (Antigravity)

1. Baca PRD ini sepenuhnya, beserta file sumber di bawah, sebelum mengubah WordPress.
2. Buat rencana perubahan file-by-file dan DB migration; tampilkan temuan audit, risiko, serta rollback **sebelum** perubahan live.
3. Bangun dan uji pada **staging**; jangan mengubah WordPress live, tema global, atau tracking existing tanpa persetujuan.
4. Perlakukan keputusan berlabel **final/disetujui** sebagai persyaratan. Perlakukan bagian **rekomendasi/belum diverifikasi** sebagai gate review.
5. Adaptasi repo PusatGrosir.id sebagai **referensi arsitektur**, bukan copy-paste kode frontend atau kredensial; domain, prefix, contract, format kode, retention, dan sheet harus khusus KK Underwear.
6. Serahkan source plugin, file asset, workbook enam tab final, Apps Script final, konfigurasi contoh tanpa secret, pengujian, panduan deploy dan rollback.
7. Jangan melakukan tindakan di Google Ads live atau pekerjaan SEO/keyword; akan ada **file PRD terpisah** untuk area itu.

### 18.1 Lampiran referensi yang perlu disediakan bersama PRD

- `SKILL-Gads.md` — kerangka evaluasi tracking/B2B; **keputusan percakapan yang lebih baru mengungguli rekomendasi skill umum**, terutama definisi Purchase semua order LUNAS.
- `KK Meta Ads - Okt 26.jpg.jpeg` — palet visual.
- `image(2).png` — copy Company Profile.
- `image(3).png` — layout Company Profile.
- `Offline Conversion Google Ads - PusatGrosir (8).xlsx` — workbook sumber dari pengguna.
- `KK_Underwear_Offline_Conversion_Purchase.xlsx` — workbook KK yang sudah disesuaikan secara awal; **butuh revisi Bab 10.3**.
- `KK_Underwear_Apps_Script_Code.gs` — Apps Script baseline; **butuh revisi upsert/format dan contract Bab 9–10**.
- Repository referensi: `https://github.com/citragroupdigital-alt/PusatGrosir.id.git` (jika akses private diberikan ke pelaksana), terutama spesifikasi WA Offline Conversion dan modul reference code/handoff/Apps Script.

**Akhir PRD.**
