# Playbook SEO, AEO, GEO & Kesiapan Google Ads — KK Underwear (`/grosir/`)

Dokumen ini menjadi panduan eksekusi dan operasional untuk pemanfaatan 17 kata kunci terverifikasi pada halaman `https://kk-underwear.id/grosir/` sesuai panduan Marketingskill ([`.agents/product-marketing.md`](../.agents/product-marketing.md)).

---

## 1. Pemetaan Kata Kunci & Lokasi Implementasi di `/grosir/`

Seluruh 17 kata kunci telah ditempatkan secara natural tanpa *keyword stuffing* (catatan: `"supplier pakaian dalam untuk took"` diperbaiki ejaannya menjadi **`supplier pakaian dalam untuk toko`** pada seluruh teks publik):

| Kata Kunci | Slot Utama On-Page, AEO/GEO, & Schema |
|---|---|
| `grosir pakaian dalam` | `<title>`, `H1`, Hero Intro, FAQ #1/#3/#6/#8/#9 |
| `grosir pakaian dalam wanita` | Hero Intro (`bra (BH) dan celana dalam`), Deskripsi `Celana Dalam Wanita`, FAQ #3 |
| `supplier pakaian dalam` | `<title>`, `<meta name="description">`, Hero Badge, Hero Intro, About Location, FAQ #3/#4 |
| `supplier pakaian dalam wanita` | Deskripsi kategori `Celana Dalam Wanita` |
| `distributor pakaian dalam` | `<meta name="description">`, Hero Badge, Visi `Tentang Kami`, About Location, FAQ #4 |
| `grosir pakaian dalam 50 lusin` *(pengganti positioning `kulakan kecil`)* | `H1` (`Mulai 50 Lusin!`), Hero Intro, MOQ Badge (`50 LUSIN`), Deskripsi `Handuk`, Step 2, FAQ #1/#2/#3/#4/#6/#9, Sticky CTA & Final CTA |
| `supplier pakaian dalam untuk toko` | Hero Intro (`pemilik toko, agen, dan distributor`), Deskripsi `Bra Wanita`/`Celana Dalam Pria`/`Kaos Kaki`, About Location, FAQ #1/#4 |
| `agen pakaian dalam` | `<meta name="description">`, Hero Intro, Deskripsi `Bra Wanita`/`Celana Dalam Pria`/`Kaos Kaki`, About Location, FAQ #1/#4 |
| `grosir bra` | `<meta name="description">`, Deskripsi `Bra Wanita`, FAQ #3/#6/#7 |
| `grosir bh wanita` | Hero Intro (`bra (BH)`), Deskripsi `Bra Wanita` (`grosir bra dan BH wanita`), FAQ #3/#7 |
| `supplier bra` | Deskripsi `Bra Wanita`, FAQ #3 (`supplier bra (BH) wanita`) |
| `grosir celana dalam` | `<meta name="description">`, Deskripsi `Celana Dalam Pria` & `Celana Dalam Wanita`, FAQ #3/#6/#7 |
| `grosir celana dalam wanita` | Deskripsi `Celana Dalam Wanita`, FAQ #3 |
| `supplier celana dalam` | Deskripsi `Celana Dalam Pria` & `Celana Dalam Wanita`, FAQ #3 (`supplier celana dalam pria dan wanita`) |
| `grosir pakaian dalam Surabaya` | `<title>`, `<meta name="description">`, About Location, FAQ #5/#8, `BreadcrumbList` & Schema |
| `distributor pakaian dalam Surabaya` | About Location, FAQ #5 |
| `supplier pakaian dalam Surabaya` | `<meta name="description">`/`<title>`, About Location, FAQ #5 |

---

## 2. Arsitektur Teknis SEO, AEO, GEO & Schema ([`includes/seo.php`](../wordpress/kk-grosir/includes/seo.php))

- **Metadata terisolasi:** Hanya aktif ketika `kkg_is_page()` bernilai benar (`/grosir/`), tanpa memengaruhi beranda, katalog WooCommerce, atau pengaturan global tema Jupiter. Termasuk filter `kkg_seo_language_attributes()` yang mengunci `lang="id-ID"` khusus halaman `/grosir/` tanpa mengubah bahasa global WordPress.
- **Anti-duplikasi Yoast/RankMath & WordPress core:** Hook `kkg_seo_page_isolation()` menonaktifkan `_wp_render_title_tag` (agar `<title>` tidak ganda pada tema yang mendukung `title-tag`), serta `<title>`, meta description, canonical, robots, OG, dan JSON-LD dari Yoast/RankMath *khusus pada page ID `/grosir/`*. Tetap lakukan verifikasi view-source di staging setelah diaktifkan.
- **Proteksi Staging:** `kkg_seo_robots()` otomatis memancarkan `noindex, nofollow` selama `mode !== 'active'` atau selama blocker rilis masih tersisa. Ketika `mode = active` tanpa blocker, otomatis beralih menjadi `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`.
- **Single Source of Truth:** `kkg_catalog_items()` dan `kkg_faq_items()` (9 pertanyaan termasuk MOQ 50 lusin & volume besar 100 lusin+) menjadi satu-satunya sumber data untuk HTML server-side (`templates/landing.php`) maupun JSON-LD `@graph` (`Organization`/`WholesaleStore`, `WebPage` + `publisher` `@id`, `WebSite` + `publisher` `@id`, `BreadcrumbList`, `OfferCatalog`, `FAQPage`).
- **`/llms.txt` Opsional:** Template siap pakai tersedia di [`deliverables/llms.txt`](../deliverables/llms.txt) untuk diunggah ke root domain apabila pemilik menginginkan file penemuan AI non-Google (`ChatGPT`, `Perplexity`, `Claude`). File ini berada di luar cakupan paket plugin `kk-grosir.zip`.

---

## 3. Blueprint Kesiapan Google Ads Search (Pra-Tayang — Tanpa Ubah Akun Live)

Berdasarkan panduan `ads/references/google-search-playbook.md` & `ad-creative`:

### 3.1 Pembagian Ad Group Bertema (Seluruhnya menuju `/grosir/` + `GCLID`/`GBRAID`/`WBRAID`)

| Ad Group | Kata Kunci (Mulai `Phrase` + `Exact` Match) | Sudut Headline RSA (Mirroring Landing Page) |
|---|---|---|
| **1. Grosir & Supplier Toko/Agen** | `grosir pakaian dalam`, `supplier pakaian dalam`, `distributor pakaian dalam`, `grosir pakaian dalam 50 lusin`, `supplier pakaian dalam untuk toko`, `agen pakaian dalam` | *Grosir Pakaian Dalam Min. 50 Lusin* · *Supplier Resmi Toko & Agen* · *Minta Katalog Grosir via WA* |
| **2. Pakaian Dalam Wanita (Bra/BH & CD)** | `grosir pakaian dalam wanita`, `supplier pakaian dalam wanita`, `grosir bra`, `grosir bh wanita`, `supplier bra`, `grosir celana dalam`, `grosir celana dalam wanita`, `supplier celana dalam` | *Grosir Bra (BH) & CD Wanita 50 Lusin* · *Supplier Pakaian Dalam Surabaya* · *Katalog Lengkap via WhatsApp* |
| **3. Geo Surabaya** | `grosir pakaian dalam surabaya`, `distributor pakaian dalam surabaya`, `supplier pakaian dalam surabaya` | *Grosir Pakaian Dalam Surabaya* · *Toko & Gudang Surabaya · Kirim Se-RI* · *Order Volume Besar 100+ Lusin* |

### 3.2 Checklist Teknis & Guardrails Sebelum Kampanye Berjalan

1. **Location Targeting:** Set ke **"Presence"** (*People in or regularly in your targeted locations*), jangan *"Presence or interest"*, terutama untuk kampanye nasional vs kampanye khusus Surabaya.
2. **Search Partners & Display Network:** Matikan di awal pada kampanye Search agar anggaran terkonsentrasi pada kueri niat beli tinggi.
3. **Negative Keyword Starter List:** `eceran`, `satuan`, `beli 1`, `1 lusin`, `12 pcs`, `kulakan kecil`, `second`, `bekas`, `preloved`, `loker`, `lowongan`, `gaji`, `cara menjahit`, `pola jahit`, `jasa maklon` *(kecuali bisnis menerima jasa maklon)*. Pantau laporan Search Terms setiap pekan (*Waste / Winners / Drift*).
4. **Kepatuhan Ejaan `took` vs `toko`:** Jangan menulis `took` pada iklan maupun landing page; di Google Search, biarkan *close variant* Exact/Phrase atau pantau apakah muncul kueri salah ketik pada laporan Search Terms.
5. **Audit Tag & Consent Mode:** Sebelum mengaktifkan `consent_mode` (`standalone`/`external`), selesaikan audit `Site Kit`, `PixelYourSite`, Privacy Policy, dan CMP di staging agar `GCLID/GBRAID/WBRAID` tersimpan sah sebelum handoff `KK-GA{YY}{NNNN}`.
6. **Impor Konversi Offline:** Tab `Upload` hanya diaktifkan setelah konversi transaksi `LUNAS` pada tab `Closing` diverifikasi bersama aturan conversion window Google Ads (`KK_IMPORT_RULES_VERIFIED`).

