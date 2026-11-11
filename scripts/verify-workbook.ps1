$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$original=[IO.Compression.ZipFile]::OpenRead((Join-Path (Get-Location) 'KK_Underwear_Offline_Conversion_Purchase.xlsx'))
$revised=[IO.Compression.ZipFile]::OpenRead((Join-Path (Get-Location) 'deliverables/KK_Underwear_Offline_Conversion_Purchase_v1.xlsx'))
function Read-Entry($zip,$name) {
    $reader=[IO.StreamReader]::new($zip.GetEntry($name).Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}
try {
    [xml]$book=Read-Entry $revised 'xl/workbook.xml'
    if ((@($book.workbook.sheets.sheet | ForEach-Object name) -join '|') -ne 'Upload|Closing|Klik WA|Panduan|Ringkasan|Pengaturan') {throw 'Sheet order mismatch'}
    if ((Read-Entry $original 'xl/styles.xml') -ne (Read-Entry $revised 'xl/styles.xml')) {throw 'Styles changed'}
    for($i=1;$i -le 6;$i++) {
        [xml]$a=Read-Entry $original "xl/worksheets/sheet$i.xml"
        [xml]$b=Read-Entry $revised "xl/worksheets/sheet$i.xml"
        foreach($node in @('cols','mergeCells','sheetViews','sheetFormatPr')) {
            if ($a.worksheet.$node.OuterXml -ne $b.worksheet.$node.OuterXml) {throw "Layout $node changed in sheet $i"}
        }
    }
    foreach($entry in $revised.Entries | Where-Object FullName -Like '*.xml') {
        $text=Read-Entry $revised $entry.FullName
        [xml]$parsed=$text
        if($text -match 'KK-GA2601(?!\d)') {throw "Old code in $($entry.FullName)"}
    }
    [xml]$upload=Read-Entry $revised 'xl/worksheets/sheet1.xml'
    if($upload.OuterXml -match 'INDEX\(') {throw 'Unsafe snapshot formulas remain'}
    if($revised.GetEntry('xl/calcChain.xml')) {throw 'Review stale calcChain'}
    Write-Output 'Workbook checks passed: six tabs, original styles/layout, valid XML, no stale code or snapshot formulas.'
} finally {$original.Dispose();$revised.Dispose()}
