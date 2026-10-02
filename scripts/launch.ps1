param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$siteUrl = 'http://127.0.0.1:8000'

function Test-CreatorHubReady {
    try {
        $schema = Invoke-RestMethod "$siteUrl/openapi.json" -TimeoutSec 2
        if ($schema.info.title -ne 'CreatorHub') { return $false }
        $health = Invoke-RestMethod "$siteUrl/api/v1/health/ready" -TimeoutSec 2
        return ($health.status -eq 'ok' -and $health.database -and $health.worker -and $health.renderer)
    } catch { return $false }
}

try {
    if (Test-CreatorHubReady) {
        Write-Host 'CreatorHub is already running.'
    } else {
        Write-Host 'Starting CreatorHub (building frontend and preparing database)...'
        & (Join-Path $PSScriptRoot 'start.ps1')
        $deadline = (Get-Date).AddSeconds(60)
        $ready = $false
        do {
            if (Test-CreatorHubReady) { $ready = $true; break }
            Start-Sleep -Seconds 1
        } while ((Get-Date) -lt $deadline)
        if (-not $ready) { throw 'Services are not ready. Check storage/api.stderr.log and storage/worker.stderr.log. Verify the local PostgreSQL service is running.' }
    }
    Write-Host "CreatorHub is ready: $siteUrl"
    if (-not $NoBrowser) { Start-Process $siteUrl }
    exit 0
} catch {
    Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'If a previous start was incomplete, run scripts/stop.ps1 and try again.'
    exit 1
}
