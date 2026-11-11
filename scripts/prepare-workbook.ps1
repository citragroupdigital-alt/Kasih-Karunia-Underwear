param(
    [string]$Source = 'KK_Underwear_Offline_Conversion_Purchase.xlsx',
    [string]$Destination = 'deliverables/KK_Underwear_Offline_Conversion_Purchase_v1.xlsx'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [IO.Path]::GetFullPath((Join-Path (Get-Location) $Destination))
if ($sourcePath -eq $destinationPath) { throw 'Baseline tidak boleh ditimpa.' }
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
$zip = [IO.Compression.ZipFile]::Open($destinationPath, [IO.Compression.ZipArchiveMode]::Update)
$ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
function Read-XmlEntry([string]$name) {
    $reader = [IO.StreamReader]::new($zip.GetEntry($name).Open())
    try { $doc = [xml]::new(); $doc.PreserveWhitespace = $true; $doc.LoadXml($reader.ReadToEnd()); return ,$doc }
    finally { $reader.Dispose() }
}
function Write-XmlEntry([string]$name, [xml]$doc) {
    $zip.GetEntry($name).Delete()
    $entry = $zip.CreateEntry($name)
    $stream = $entry.Open()
    $settings = [Xml.XmlWriterSettings]::new()
    $settings.Encoding = [Text.UTF8Encoding]::new($false)
    $writer = [Xml.XmlWriter]::Create($stream, $settings)
    try { $doc.Save($writer) } finally { $writer.Dispose(); $stream.Dispose() }
}
function Set-Cell([xml]$doc, [string]$address, [string]$value, [bool]$formula = $false) {
    $cell = $doc.SelectSingleNode("//*[local-name()='c' and @r='$address']")
    if (!$cell) {
        $rowNumber = $address -replace '\D',''
        $row = $doc.SelectSingleNode("//*[local-name()='row' and @r='$rowNumber']")
        if (!$row) { throw "Row $rowNumber tidak tersedia." }
        $cell = $doc.CreateElement('c', $ns); $cell.SetAttribute('r', $address); $row.AppendChild($cell) | Out-Null
    }
    while ($cell.HasChildNodes) { $cell.RemoveChild($cell.FirstChild) | Out-Null }
    $cell.RemoveAttribute('t')
    if ($formula) {
        $f = $doc.CreateElement('f', $ns); $f.InnerText = $value; $cell.AppendChild($f) | Out-Null
    } else {
        $cell.SetAttribute('t', 'inlineStr')
        $inline = $doc.CreateElement('is', $ns); $t = $doc.CreateElement('t', $ns)
        $t.InnerText = $value; $inline.AppendChild($t) | Out-Null; $cell.AppendChild($inline) | Out-Null
    }
}
try {
    $book = Read-XmlEntry 'xl/workbook.xml'
    $names = @($book.workbook.sheets.sheet | ForEach-Object name)
    if (($names -join '|') -ne 'Upload|Closing|Klik WA|Panduan|Ringkasan|Pengaturan') { throw 'Urutan tab baseline berbeda.' }
    $upload = Read-XmlEntry 'xl/worksheets/sheet1.xml'
    # Historical results are produced by Apps Script; snapshot formulas must never mark a row ready.
    foreach ($row in @($upload.worksheet.sheetData.row)) {
        $n = [int]$row.r
        if ($n -lt 2) { continue }
        foreach ($cell in @($row.c)) {
            if ($cell.r -match '^[A-P]\d+$') {
                while ($cell.HasChildNodes) { $cell.RemoveChild($cell.FirstChild) | Out-Null }
                $cell.RemoveAttribute('t')
            }
        }
        if ($n -le 1000) {
            Set-Cell $upload "A$n" ('IF(COUNTA(Closing!A{0}:G{0},Closing!J{0}:K{0})=0,"","Tidak")' -f $n) $true
            Set-Cell $upload "B$n" ('IF(A{0}="","","Jalankan rekonsiliasi historis melalui Apps Script")' -f $n) $true
        }
    }
    Write-XmlEntry 'xl/worksheets/sheet1.xml' $upload
    $closing = Read-XmlEntry 'xl/worksheets/sheet2.xml'
    foreach ($row in @($closing.worksheet.sheetData.row)) {
        $n = [int]$row.r
        if ($n -lt 2) { continue }
        foreach ($column in @('H','I','L')) { Set-Cell $closing "$column$n" '' }
        Set-Cell $closing "L$n" ('IF(COUNTA(A{0}:G{0},J{0}:K{0})=0,"","Menunggu rekonsiliasi")' -f $n) $true
    }
    Write-XmlEntry 'xl/worksheets/sheet2.xml' $closing
    $guide = Read-XmlEntry 'xl/worksheets/sheet4.xml'
    $guideUpdates = @{
        B5='1. Setiap upaya handoff disimpan di WordPress. Klik WA memuat satu snapshot per Reference Code, diperbarui Apps Script setiap 15 menit.';
        B6='2. Format final KK-GA{YY}{NNNN}, contoh KK-GA260001. Reuse 24 jam sejak terbit, tiap handoff tetap event terpisah. WhatsApp tetap tersedia bila kode gagal.';
        B8='4. Apps Script mencocokkan riwayat klik SEBELUM pembayaran dan menyiapkan Upload. Perubahan Closing memblokir kesiapan sampai rekonsiliasi ulang.';
        B9='5. Upload adalah dataset persiapan. Tidak ada pengiriman otomatis Google Ads. Mapping, conversion action dan koneksi impor memerlukan dokumen serta otorisasi terpisah.';
        B14='Closing: CS mengisi A-G, J, K. H, I, L dihitung Apps Script. Setiap order LUNAS, termasuk Repeat, memakai Order ID unik.';
        B15='Upload: hasil rekonsiliasi Apps Script dan formula penjaga perubahan. Bukan bukti impor. Tanpa verifikasi aturan impor, Siap Upload tetap Tidak.';
        B16='Ringkasan: jumlah kode unik, Purchase bisnis, atribusi historis, dan nilai transaksi. Jumlah kode tidak sama dengan jumlah event atau chat terkirim.';
        B23='- Transaksi LUNAS tanpa kode/Click ID tetap Purchase bisnis. Klik WA tidak sama dengan chat terkirim atau Purchase.';
        B26='- Nama konversi dan aturan impor diperiksa pada pekerjaan Google Ads terpisah. KK_IMPORT_RULES_VERIFIED default false.';
        B27='- Order ID unik untuk setiap pembayaran; satu Reference Code boleh memiliki beberapa Order ID. Jangan aktifkan koneksi impor melalui template ini.';
        B28='- Duplikat diblokir. Refund/pembatalan dicatat pada Catatan, status diperbarui dengan audit/version history; jangan menghapus transaksi tanpa jejak.';
        B31='- Waktu pembayaran WIB; server UTC. Sel tanggal/jam berupa Date. Uji hasil konversi Excel ke Google Sheets native sebelum penggunaan.';
        B32='- Usia klik dan conversion window di B7/B8 adalah usulan, wajib diverifikasi. Kesiapan kedaluwarsa setelah satu hari tanpa rekonsiliasi.';
        B34='- Hanya pembayaran LUNAS dihitung Purchase bisnis, termasuk Baru/Repeat. Handoff bukan Purchase. Aktivasi Google Ads di luar scope.';
        B35='- GCLID/GBRAID/WBRAID hanya bila tersedia dan diizinkan. Pilihan identifier impor memerlukan validasi terpisah.';
    }
    foreach ($key in $guideUpdates.Keys) { Set-Cell $guide $key $guideUpdates[$key] }
    Write-XmlEntry 'xl/worksheets/sheet4.xml' $guide
    $summary = Read-XmlEntry 'xl/worksheets/sheet5.xml'
    $summaryText = @{
        A2='Reference Code unik tersinkron'; C2='Satu baris per kode; bukan jumlah handoff atau chat. Riwayat event lengkap ada di WordPress.';
        A3='Kode dengan snapshot Click ID'; C3='Snapshot terbaru; atribusi Purchase harus diperiksa as-of pembayaran.';
        C4='Semua LUNAS dengan Order ID unik, waktu valid dan nilai positif. Baru/Repeat opsional.';
        C5='Belum LUNAS atau data pembayaran invalid; periksa Closing.';
        C6='Klik yang diamati server sebelum pembayaran. Bukan bukti konversi diterima Google Ads.';
        C10='Purchase cocok ke iklan dibagi semua Purchase bisnis valid.';
        C12='Belum ada sinkronisasi; jalankan diagnostics.';
        C20='Dataset persiapan; tidak otomatis dikirim ke Google Ads.';
        C22='Jangan menghapus pembayaran/refund tanpa jejak audit.';
    }
    foreach ($key in $summaryText.Keys) { Set-Cell $summary $key $summaryText[$key] }
    $summaryFormulas = @{
        B2="COUNT('Klik WA'!H:H)";
        B3="COUNTIF('Klik WA'!B:B,""?*"")+COUNTIFS('Klik WA'!B:B,"""",'Klik WA'!C:C,""?*"")+COUNTIFS('Klik WA'!B:B,"""",'Klik WA'!C:C,"""",'Klik WA'!D:D,""?*"")-1";
        B4='COUNTIF(Closing!L:L,"Valid")'; B5='COUNTIF(Closing!L:L,"Belum lengkap")';
        B6='COUNTIFS(Closing!H:H,"Terlacak",Closing!L:L,"Valid")';
        B7='COUNTIFS(Closing!H:H,"Non-iklan",Closing!L:L,"Valid")';
        B8='COUNTIFS(Closing!H:H,"Tanpa kode",Closing!L:L,"Valid")';
        B9='COUNTIFS(Closing!H:H,"Kode tidak ditemukan",Closing!L:L,"Valid")';
        B10='IFERROR(B6/B4,0)'; B11='IFERROR(B6/B3,0)';
        B12='IF(B4=0,"Belum ada Purchase",IF(B10>=Pengaturan!B6,"Periksa hasil rekonsiliasi","Perlu pemeriksaan atribusi"))';
        B14='COUNTIFS(Closing!F:F,"Baru",Closing!L:L,"Valid")';
        B15='COUNTIFS(Closing!F:F,"Repeat",Closing!L:L,"Valid")';
        B16='SUMIF(Closing!L:L,"Valid",Closing!D:D)';
        B17='SUMIFS(Closing!D:D,Closing!H:H,"Terlacak",Closing!L:L,"Valid")';
        B18='IFERROR(B16/B4,0)'; B20='COUNTIF(Upload!A:A,"Ya")'; B21='COUNTIF(Upload!A:A,"Tidak")';
        B22='COUNTIF(Closing!I:I,"Order ID duplikat")'
    }
    foreach ($key in $summaryFormulas.Keys) { Set-Cell $summary $key $summaryFormulas[$key] $true }
    Write-XmlEntry 'xl/worksheets/sheet5.xml' $summary
    $settings = Read-XmlEntry 'xl/worksheets/sheet6.xml'
    Set-Cell $settings 'C2' 'Nama dataset persiapan; mapping conversion action dikerjakan terpisah.'
    Set-Cell $settings 'C7' '90 hanya contoh awal. KK_IMPORT_RULES_VERIFIED harus false sampai aturan impor divalidasi.'
    Set-Cell $settings 'C8' '90 hanya contoh awal. Wajib validasi conversion window terpisah dari retensi database.'
    Write-XmlEntry 'xl/worksheets/sheet6.xml' $settings
    $calc = $book.workbook.calcPr
    if ($calc) { $calc.SetAttribute('fullCalcOnLoad','1'); $calc.SetAttribute('forceFullCalc','1') }
    Write-XmlEntry 'xl/workbook.xml' $book
    # Replace stale examples in the shared string table as well as displayed cells.
    $strings = Read-XmlEntry 'xl/sharedStrings.xml'
    foreach ($t in $strings.SelectNodes("//*[local-name()='t']")) {
        $t.InnerText = $t.InnerText.Replace('KK-GA2601','KK-GA260001').Replace('KK-GA{YY}{SEQUENCE}','KK-GA{YY}{NNNN}')
    }
    Write-XmlEntry 'xl/sharedStrings.xml' $strings
} finally { $zip.Dispose() }
Write-Output "Workbook staging dibuat: $destinationPath"
