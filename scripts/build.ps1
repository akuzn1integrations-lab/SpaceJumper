$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $root 'build\spacejumper'
$zip = Join-Path $root 'build\spacejumper.zip'
$files = @('index.html','style.css','engine.js','music.js','i18n.js','platform.js','backdrop.js','chibi.js','sprites.js','app.js')

Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $zip -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $stage -Force | Out-Null

foreach ($file in $files) {
    $source = Join-Path $root $file
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing required file: $file"
    }
    Copy-Item -LiteralPath $source -Destination $stage
}

$assets = Join-Path $root 'assets'
if (Test-Path -LiteralPath $assets) {
    Copy-Item -LiteralPath $assets -Destination $stage -Recurse
}

Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force

$entries = tar -tf $zip
if ($entries -notcontains 'index.html') {
    throw 'index.html must be at the archive root'
}

$sizeMb = (Get-ChildItem $stage -Recurse | Measure-Object Length -Sum).Sum / 1MB
Write-Output "Archive: $zip"
Write-Output ("Uncompressed size: {0:N2} MB" -f $sizeMb)
Write-Output 'Archive root:'
$entries | Select-Object -First 20
