# Playbook SEO, AEO, GEO & Kesiapan Google Ads — KK Underwear (`/grosir/`)

Dokumen ini menjadi panduan eksekusi dan operasional untuk pemanfaatan 17 kata kunci terverifikasi pada halaman `https://kk-underwear.id/grosir/` sesuai panduan Marketingskill ([`.agents/product-marketing.md`](../.agents/product-marketing.md)).

---

## 1. Pemetaan Kata Kunci & Lokasi Implementasi di `/grosir/`

Seluruh 17 kata kunci telah ditempatkan secara natural tanpa *keyword stuffing* (catatan: `"supplier pakaian dalam untuk took"` diperbaiki ejaannya menjadi **`supplier pakaian dalam untuk toko`** pada seluruh teks publik):

| Kata Kunci | Slot Utama On-Page, AEO/GEO, & Schema |
|---|---|
| `grosir pakaian dalam` | `<title>`, `H1`, Hero Intro, FAQ #1/#2/#6/#7 |
| `grosir pakaian dalam wanita` | `<meta name="description">`, Hero Intro |
| `supplier pakaian dalam` | `<title>`, Hero Badge, Hero Intro, About Location, FAQ #2/#3 |
| `supplier pakaian dalam wanita` | Deskripsi kategori `Celana Dalam Wanita` |
| `distributor pakaian dalam` | `<meta name="description">`, Hero Badge, Visi `Tentang Kami`, About Location, FAQ #3 |
| `kulakan pakaian dalam` | Deskripsi `Celana Dalam Pria`, FAQ #1, #6, #8 (`H1`: `Kulakan Grosir Pakaian Dalam`) |
| `supplier pakaian dalam untuk toko` | Hero Intro (`agen pakaian dalam, reseller, dan pemilik toko`), About Location, FAQ #3 |
| `agen pakaian dalam` | `<meta name="description">`, Hero Intro, Deskripsi `Bra Wanita`, About Location, FAQ #1/#3 |
| `grosir bra` | `<meta name="description">`, Deskripsi `Bra Wanita`, FAQ #2/#5 |
| `grosir bh wanita` | `<meta name="description">`, Hero Intro (`bra (BH) wanita`), Deskripsi `Bra Wanita` (`grosir bra dan BH wanita`), FAQ #1/#2/#6 |
| `supplier bra` | FAQ #2 (`supplier bra (BH) wanita`) |
| `grosir celana dalam` | Deskripsi `Celana Dalam Pria` & `Celana Dalam Wanita`, FAQ #2/#5/#6 |
| `grosir celana dalam wanita` | Deskripsi `Celana Dalam Wanita`, FAQ #1/#2 |
| `supplier celana dalam` | FAQ #2 (`supplier celana dalam pria dan wanita`) |
| `grosir pakaian dalam Surabaya` | `<title>`, About Location, FAQ #4/#7, `BreadcrumbList` & Schema |
| `distributor pakaian dalam Surabaya` | About Location, FAQ #4 |
| `supplier pakaian dalam Surabaya` | `<meta description>`/`<title>`, About Location, FAQ #4 |

---

## 2. Arsitektur Teknis SEO, AEO, GEO & Schema ([`includes/seo.php`](../wordpress/kk-grosir/includes/seo.php))

- **Metadata terisolasi:** Hanya aktif ketika `kkg_is_page()` bernilai benar (`/grosir/`), tanpa memengaruhi beranda, katalog WooCommerce, atau pengaturan global tema Jupiter.
- **Anti-duplikasi Yoast/RankMath:** Hook `kkg_seo_page_isolation()` menonaktifkan `<title>`, meta description, canonical, robots, OG, dan JSON-LD dari plugin SEO lain *khusus pada page ID `/grosir/`*. Tetap lakukan verifikasi view-source di staging setelah diaktifkan.
- **Proteksi Staging:** `kkg_seo_robots()` otomatis memancarkan `noindex, nofollow` selama `mode !== 'active'` atau selama blocker rilis masih tersisa. Ketika `mode = active` tanpa blocker, otomatis beralih menjadi `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`.
- **Single Source of Truth:** `kkg_catalog_items()` dan `kkg_faq_items()` menjadi satu-satunya sumber data untuk HTML server-side (`templates/landing.php`) maupun JSON-LD `@graph` (`Organization`/`WholesaleStore`, `WebPage`, `BreadcrumbList`, `OfferCatalog`, `FAQPage`).
- **`/llms.txt` Opsional:** Template siap pakai tersedia di [`deliverables/llms.txt`](../deliverables/llms.txt) untuk diunggah ke root domain apabila pemilik menginginkan file penemuan AI non-Google (`ChatGPT`, `Perplexity`, `Claude`). File ini berada di luar cakupan paket plugin `kk-grosir.zip`.

---

## 3. Blueprint Kesiapan Google Ads Search (Pra-Tayang — Tanpa Ubah Akun Live)

Berdasarkan panduan `ads/references/google-search-playbook.md` & `ad-creative`:

### 3.1 Pembagian Ad Group Bertema (Seluruhnya menuju `/grosir/` + `GCLID`/`GBRAID`/`WBRAID`)

| Ad Group | Kata Kunci (Mulai `Phrase` + `Exact` Match) | Sudut Headline RSA (Mirroring Landing Page) |
|---|---|---|
| **1. Grosir & Supplier Toko/Agen** | `grosir pakaian dalam`, `supplier pakaian dalam`, `distributor pakaian dalam`, `kulakan pakaian dalam`, `supplier pakaian dalam untuk toko`, `agen pakaian dalam` | *Kulakan Pakaian Dalam Mulai 1 Lusin* · *Supplier Resmi Toko & Agen* · *Minta Katalog Grosir via WA* |
| **2. Pakaian Dalam Wanita (Bra/BH & CD)** | `grosir pakaian dalam wanita`, `supplier pakaian dalam wanita`, `grosir bra`, `grosir bh wanita`, `supplier bra`, `grosir celana dalam`, `grosir celana dalam wanita`, `supplier celana dalam` | *Grosir Bra (BH) & CD Wanita 1 Lusin* · *Supplier Tangan Pertama Surabaya* · *Katalog Lengkap via WhatsApp* |
| **3. Geo Surabaya** | `grosir pakaian dalam surabaya`, `distributor pakaian dalam surabaya`, `supplier pakaian dalam surabaya` | *Grosir Pakaian Dalam Surabaya* · *Toko & Gudang Surabaya · Kirim Se-RI* · *Kulakan Mulai 12 Pcs* |

### 3.2 Checklist Teknis & Guardrails Sebelum Kampanye Berjalan

1. **Location Targeting:** Set ke **"Presence"** (*People in or regularly in your targeted locations*), jangan *"Presence or interest"*, terutama untuk kampanye nasional vs kampanye khusus Surabaya.
2. **Search Partners & Display Network:** Matikan di awal pada kampanye Search agar anggaran terkonsentrasi pada kueri niat beli tinggi.
3. **Negative Keyword Starter List:** `eceran`, `satuan`, `beli 1`, `second`, `bekas`, `preloved`, `loker`, `lowongan`, `gaji`, `cara menjahit`, `pola jahit`, `jasa maklon` *(kecuali bisnis menerima jasa maklon)*. Pantau laporan Search Terms setiap pekan (*Waste / Winners / Drift*).
4. **Kepatuhan Ejaan `took` vs `toko`:** Jangan menulis `took` pada iklan maupun landing page; di Google Search, biarkan *close variant* Exact/Phrase atau pantau apakah muncul kueri salah ketik pada laporan Search Terms.
5. **Audit Tag & Consent Mode:** Sebelum mengaktifkan `consent_mode` (`standalone`/`external`), selesaikan audit `Site Kit`, `PixelYourSite`, Privacy Policy, dan CMP di staging agar `GCLID/GBRAID/WBRAID` tersimpan sah sebelum handoff `KK-GA{YY}{NNNN}`.
6. **Impor Konversi Offline:** Tab `Upload` hanya diaktifkan setelah konversi transaksi `LUNAS` pada tab `Closing` diverifikasi bersama aturan conversion window Google Ads (`KK_IMPORT_RULES_VERIFIED`).

