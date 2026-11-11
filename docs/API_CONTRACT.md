# Kontrak REST API dan Skema Data — KK Grosir

Dokumen ini menetapkan kontrak final antarmuka HTTP dan skema basis data pada plugin [kk-grosir.php](../wordpress/kk-grosir/kk-grosir.php) (`namespace`: `kk-offline/v1`) serta sinkronisasi ke [Code.gs](../apps-script/Code.gs).

## 1. Aturan Keamanan Lintas Endpoint

- **Mode gating**: seluruh endpoint mengembalikan HTTP `503` (`kk_off`) ketika `mode = off`. Pada `mode = staging`, endpoint publik hanya mengizinkan admin WordPress (`manage_options`).
- **HTTPS wajib**: non-HTTPS ditolak dengan HTTP `403` (`kk_https`), kecuali bila `WP_ENVIRONMENT_TYPE` bernilai `local`.
- **Header cache**: seluruh respons `/kk-offline/v1/*` selalu mengirim `Cache-Control: private, no-store, max-age=0` dan `Pragma: no-cache`.
- **Rate limiting**: dibatasi per IP (`REMOTE_ADDR`) dalam jendela 60 detik melalui tabel `{prefix}kkg_limits` — `30` permintaan/menit untuk endpoint publik dan `120` permintaan/menit untuk endpoint privat. Melebihi batas mengembalikan HTTP `429` (`kk_rate`).
- **Tidak ada nomor tujuan/kode dari klien**: endpoint publik tidak menerima `reference_code`, nomor WhatsApp tujuan, nominal transaksi, ataupun status Purchase dari browser.

---

## 2. Endpoint Publik — `POST /wp-json/kk-offline/v1/handoff`

Dipanggil oleh [landing.js](../wordpress/kk-grosir/assets/landing.js) saat pengunjung mengklik tombol **Minta Katalog Grosir**.

### Persyaratan Request

- Header wajib:
  - `Origin`: harus persis sama dengan origin `home_url()` WordPress.
  - `Content-Type`: harus diawali `application/json`.
  - Ukuran body maksimal `8192` byte.
  - `X-WP-Nonce`: dikirim hanya untuk admin saat uji `staging`.
- Body JSON (hanya 6 field berikut yang diizinkan; field tambahan ditolak HTTP `400`):

| Field | Tipe | Validasi |
|---|---|---|
| `request_id` | string | Wajib, panjang 36–64 karakter hex/tanda hubung (`^[a-f0-9-]{36,64}$`), kunci idempotency retry |
| `token` | string | Opsional (`""` atau 64 karakter hex `^[a-f0-9]{64}$`); diabaikan bila `privacy_reviewed = 0` atau `consent.storage !== true` |
| `cta_context` | string | Whitelist: `header`, `hero`, `category`, `sticky`, `final_cta`, `footer` |
| `landing_path` | string | Wajib persis `"/grosir/"` |
| `consent` | object | Wajib memuat `version` yang persis sama dengan `policy_version` pengaturan plugin, serta boolean `storage` dan `advertising` |
| `click` | object | Opsional; hanya membaca `gclid`, `gbraid`, `wbraid` (`^[A-Za-z0-9_-]{1,512}$`) dan hanya disimpan bila `privacy_reviewed = 1` dan `consent.advertising === true` |

### Respons Sukses (`200 OK`)

```json
{
  "reference_code": "KK-GA260001",
  "expires_at": "2026-11-12T04:00:00Z",
  "wa_url": "https://wa.me/628xxxxxxxxxx?text=..."
}
```

- Tidak pernah mengembalikan `token`, `token_hash`, `gclid`, `gbraid`, atau `wbraid`.
- Jika `token` valid dikirim kembali dalam 24 jam sejak penerbitan pertama (`expires_at > now_utc`), backend mengembalikan `reference_code` dan `expires_at` yang sama tanpa memperpanjang masa aktif, lalu menambahkan baris event handoff baru di `{prefix}kkg_events`.

### Respons Gagal

| HTTP | Kode | Kondisi & Perilaku Frontend |
|---|---|---|
| `400` | `kk_invalid` | Payload/konteks/consent tidak valid; frontend membuka `wa_url` fallback tanpa kode |
| `403` | `kk_https` / `kk_staging` / `kk_request` | Bukan HTTPS, akses staging non-admin, atau Origin/Content-Type salah; frontend fallback tanpa kode |
| `429` | `kk_rate` | Melebihi 30 permintaan/menit; frontend fallback tanpa kode |
| `503` | `kk_off` / `kk_phone` / `kk_unavailable` | Integrasi `off`, nomor WA CS belum valid, kapasitas `9999` habis, atau DB error; jika nomor tersedia frontend tetap membuka WA tanpa kode |

---

## 3. Endpoint Privat Sinkronisasi — `GET /wp-json/kk-offline/v1/handoffs`

Dipanggil oleh Apps Script (`kkSync_`) setiap 15 menit.

### Autentikasi & Query

- Header wajib: `Authorization: Bearer <KKG_SYNC_SECRET>` (konstanta PHP di `wp-config.php`, minimal 32 karakter, dibandingkan dengan `hash_equals`).
- Query parameter:
  - `after_change_id`: integer non-negatif (`>= 0`, default `0`, maksimal 15 digit).
  - `limit`: integer `1`–`100` (default `100`).

### Respons Sukses (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "change_id": 42,
      "id": 15,
      "reference_code": "KK-GA260001",
      "gclid": "EAIaIQobChMI...",
      "gbraid": "",
      "wbraid": "",
      "created_at": "2026-11-11T04:00:00Z",
      "handoff_at": "2026-11-11T04:00:00Z",
      "landing_page": "/grosir/",
      "wa_context": "hero"
    }
  ],
  "last_change_id": 42,
  "has_more": false
}
```

- `change_id`: ID event monotonik dari `{prefix}kkg_events` (kunci incremental cursor).
- `id`: ID stabil registry `{prefix}kkg_references` (dipetakan ke `Klik WA!H`).
- `created_at`: timestamp UTC ISO 8601 (`click_observed_at` jika tersedia, selain itu `handoff_at`).
- HTTP `410` (`kk_cursor_expired`): dikembalikan bila `after_change_id > 0` dan lebih kecil dari `kkg_retention_cursor` akibat pembersihan data retensi. Admin perlu meninjau sebelum mereset cursor.

---

## 4. Endpoint Privat Rekonsiliasi Historis — `POST /wp-json/kk-offline/v1/reconcile`

Dipanggil oleh Apps Script (`kkReconcile_`) untuk menentukan *last eligible click* **sebelum atau tepat pada waktu pembayaran (`as-of paid_at`)**.

### Autentikasi & Request Body

- Autentikasi Bearer Token sama dengan `/handoffs`; batas body `32768` byte, maksimal `100` item per batch.

```json
{
  "purchases": [
    {
      "key": 2,
      "reference_code": "KK-GA260001",
      "paid_at": "2026-11-11T06:45:00Z"
    }
  ]
}
```

- `key`: nomor baris tab `Closing` (`integer >= 2`).
- `reference_code`: format wajib `^KK-GA\d{2}(?!0000)\d{4}$`.
- `paid_at`: waktu pembayaran UTC format `YYYY-MM-DDTHH:MM:SSZ` yang tidak boleh di masa depan (`> time()`).

### Respons Sukses (`200 OK`)

Status per item `data[]`:
- `matched`: mengembalikan `key`, `event_id`, `reference_id`, `gclid`, `gbraid`, `wbraid`, `click_observed_at` (ISO UTC) untuk event terakhir yang memenuhi `handoff_at <= paid_at AND click_observed_at <= paid_at` dan memiliki minimal satu Click ID.
- `no_eligible_click`: kode ditemukan di registry, tetapi tidak ada klik ber-Click ID sebelum atau pada `paid_at` (termasuk klik yang terjadi setelah pembayaran, tanpa klik iklan, atau setelah `kkg_erase_reference`).
- `not_found`: kode tidak ada di registry (belum pernah terbit atau sudah dibersihkan setelah masa retensi).

---

## 5. Skema Database WordPress (InnoDB)

Semua tabel memakai prefix WordPress aktual (`$wpdb->prefix . 'kkg_'`) dan engine wajib `InnoDB`.

| Tabel | Fungsi | Kolom Utama |
|---|---|---|
| `{prefix}kkg_references` | Registry kode unik & masa reuse 24 jam | `id`, `reference_code` (UNIQUE), `token_hash`, `issued_at`, `expires_at`, `updated_at` |
| `{prefix}kkg_events` | Log immutable tiap upaya handoff & sejarah Click ID | `id` (cursor), `reference_id`, `request_hash` (UNIQUE), `cta_context`, `handoff_at`, `click_observed_at`, `gclid`, `gbraid`, `wbraid`, `consent_state` |
| `{prefix}kkg_sequences` | Counter tahunan kalender `Asia/Jakarta` (1..9999) | `year` (PK), `value` |
| `{prefix}kkg_limits` | Bucket rate-limiting jendela 60 detik | `bucket` (PK), `expires_at`, `hits` |

- Penguncian transaksi memakai named DB lock (`GET_LOCK`) dan `FOR UPDATE` pada `{prefix}kkg_sequences` agar alokasi nomor urut dan urutan `change_id` aman terhadap konkurensi.
- Retensi database default `180` hari hanya menghapus data jika `privacy_reviewed = 1` dan `cleanup_enabled = 1`; tabel `{prefix}kkg_sequences` tidak pernah dihapus atau direset agar nomor urut tahun berjalan tidak pernah terpakai ulang.
- Deaktivasi plugin hanya menghapus cron `kkg_cleanup`; seluruh tabel dipertahankan untuk menghindari kehilangan data.

