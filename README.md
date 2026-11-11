# Kasih-Karunia-Underwear

Implementasi staging landing page grosir `https://kk-underwear.id/grosir/`, sistem atribusi offline WhatsApp (`KK-GA{YY}{NNNN}`), serta sinkronisasi Google Sheets enam tab untuk **CV. Kasih Karunia / KK Underwear**.

## Struktur Direktori

- [PRD-kk-underwear.md](PRD-kk-underwear.md) — Spesifikasi persyaratan utama dan 40 acceptance criteria.
- [AGENTS.md](AGENTS.md) — Panduan kerja, batasan scope, dan aturan bisnis.
- [wordpress/kk-grosir/](wordpress/kk-grosir/kk-grosir.php) — Source plugin WordPress (`KK Grosir Landing & Offline Attribution`).
- [apps-script/](apps-script/Code.gs) — Google Apps Script sinkronisasi upsert `Klik WA` dan rekonsiliasi historis `Closing`/`Upload`.
- [deliverables/](deliverables/) — Paket plugin siap unggah (`kk-grosir.zip`) dan workbook enam tab final (`KK_Underwear_Offline_Conversion_Purchase_v1.xlsx`).
- [config/wp-config.example.php](config/wp-config.example.php) — Contoh konfigurasi `KKG_SYNC_SECRET` tanpa secret asli.
- [docs/](docs/RUNBOOK.md) — Kontrak API, rencana teknis, audit & daftar blocker produksi, matriks QA 40 kriteria, serta runbook Admin & CS.
- [scripts/](scripts/) & [tests/](tests/) — Skrip verifikasi lokal (PHP domain/API, MariaDB concurrency/retention, browser Playwright, XML workbook, dan pengemasan ZIP).

## Verifikasi Lokal

```powershell
npm.cmd test
node scripts/database-check.cjs
node scripts/browser-check.cjs
& ([scriptblock]::Create((Get-Content -LiteralPath scripts/verify-workbook.ps1 -Raw)))
& ([scriptblock]::Create((Get-Content -LiteralPath scripts/package-plugin.ps1 -Raw)))
```

> **Catatan:** Rilis produksi (`mode = active`) diblokir secara teknis sampai seluruh item pada [docs/AUDIT_AND_BLOCKERS.md](docs/AUDIT_AND_BLOCKERS.md) dilengkapi dan QA staging WordPress/Jupiter serta uji Google Sheets native disetujui pemilik bisnis.
