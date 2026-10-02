param([switch]$Dev, [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$pythonExe = Join-Path $projectRoot '.venv\Scripts\python.exe'
$logRoot = Join-Path $projectRoot 'storage'
if (-not (Test-Path $pythonExe)) { throw 'Create .venv and install backend dependencies first.' }
if (-not (Test-Path (Join-Path $projectRoot 'backend\.env'))) { throw 'Configure backend/.env first.' }
Push-Location $projectRoot
try {
    & $pythonExe scripts/check_renderer.py
    if ($LASTEXITCODE -ne 0) { throw 'Playwright Chromium is not ready. Run .venv\Scripts\python.exe -m playwright install chromium and retry.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$statePath = Join-Path $logRoot 'processes.json'
if (Test-Path $statePath) {
    $saved = Get-Content $statePath | ConvertFrom-Json
    foreach ($entry in $saved) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($entry.pid)" -ErrorAction SilentlyContinue
        if ($proc -and $proc.ExecutablePath -eq $entry.executable) { throw 'CreatorHub is already running. Use scripts/stop.ps1 before restarting.' }
    }
}
if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 8000 is occupied. No process was stopped.' }
if (-not $SkipBuild) {
    Push-Location (Join-Path $projectRoot 'frontend')
    try { & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' } } finally { Pop-Location }
}
Push-Location (Join-Path $projectRoot 'backend')
try {
    & $pythonExe -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
    & $pythonExe -m app.seed
    if ($LASTEXITCODE -ne 0) { throw 'Catalog initialization failed.' }
} finally { Pop-Location }
$records = @()
function Start-CreatorProcess($label, $exe, $arguments, $directory) {
    $proc = Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory $directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot "$label.stdout.log") -RedirectStandardError (Join-Path $logRoot "$label.stderr.log")
    return @{ label = $label; pid = $proc.Id; executable = $exe; started = $proc.StartTime.ToUniversalTime().ToString('o') }
}
$records += Start-CreatorProcess 'api' $pythonExe '-m uvicorn app.main:app --host 127.0.0.1 --port 8000' (Join-Path $projectRoot 'backend')
$records += Start-CreatorProcess 'worker' $pythonExe '-m app.worker' (Join-Path $projectRoot 'backend')
if ($Dev) {
    $nodeExe = (Get-Command node.exe).Source
    $vitePath = Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'
    $records += Start-CreatorProcess 'vite' $nodeExe "`"$vitePath`" --host 127.0.0.1 --port 5173" (Join-Path $projectRoot 'frontend')
}
$records | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
Write-Output 'CreatorHub: http://127.0.0.1:8000'
if ($Dev) { Write-Output 'Frontend development: http://127.0.0.1:5173' }
