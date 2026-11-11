param(
    [string]$Source = 'wordpress/kk-grosir',
    [string]$Destination = 'deliverables/kk-grosir.zip'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destPath = [IO.Path]::GetFullPath((Join-Path (Get-Location) $Destination))
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destPath)) | Out-Null
if (Test-Path -LiteralPath $destPath) { Remove-Item -LiteralPath $destPath -Force }
$allowedExt = @('.php', '.css', '.js', '.webp', '.woff2', '.txt')
$textExt = @('.php', '.css', '.js')
$zip = [IO.Compression.ZipFile]::Open($destPath, [IO.Compression.ZipArchiveMode]::Create)
$count = 0
try {
    foreach ($file in Get-ChildItem -LiteralPath $sourcePath -File -Recurse | Sort-Object FullName) {
        $ext = $file.Extension.ToLowerInvariant()
        if ($allowedExt -notcontains $ext) {
            throw "Ekstensi file tidak diizinkan dalam paket plugin: $($file.FullName)"
        }
        if ($textExt -contains $ext) {
            $content = Get-Content -LiteralPath $file.FullName -Raw
            if ($content -match "wp-shim|define\s*\(\s*['""]KKG_LOCAL_PREVIEW|PusatGrosir") {
                throw "Konten uji/referensi terlarang terdeteksi pada: $($file.FullName)"
            }
        }
        $rel = $file.FullName.Substring($sourcePath.Length).TrimStart('\', '/').Replace('\', '/')
        $entryName = "kk-grosir/$rel"
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        $count++
    }
} finally {
    $zip.Dispose()
}
Write-Output "Paket plugin dibuat: $destPath ($count file)"
