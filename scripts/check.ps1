param([switch]$E2E)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$pythonExe = Join-Path $projectRoot '.venv\Scripts\python.exe'
Push-Location (Join-Path $projectRoot 'backend')
try {
    & $pythonExe -m ruff check app
    if ($LASTEXITCODE -ne 0) { throw 'Backend lint failed.' }
    & $pythonExe -m ruff format --check app
    if ($LASTEXITCODE -ne 0) { throw 'Backend formatting failed.' }
    & $pythonExe -m pytest -q
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
} finally { Pop-Location }
Push-Location (Join-Path $projectRoot 'frontend')
try {
    & npm.cmd run format:check
    if ($LASTEXITCODE -ne 0) { throw 'Frontend formatting failed.' }
    & npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'Frontend typecheck failed.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed.' }
    if ($E2E) {
        & npm.cmd run test:e2e
        if ($LASTEXITCODE -ne 0) { throw 'End-to-end tests failed.' }
    }
} finally { Pop-Location }
Write-Output 'CreatorHub checks passed.'
