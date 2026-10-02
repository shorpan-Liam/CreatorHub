$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$statePath = Join-Path $projectRoot 'storage\processes.json'
if (-not (Test-Path $statePath)) { Write-Output 'No CreatorHub process record.'; exit }
$records = Get-Content -LiteralPath $statePath | ConvertFrom-Json
foreach ($entry in $records) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($entry.pid)" -ErrorAction SilentlyContinue
    if ($process -and $process.ExecutablePath -eq $entry.executable) {
        $start = (Get-Process -Id $entry.pid).StartTime.ToUniversalTime()
        if ([Math]::Abs(($start - ([datetimeoffset]$entry.started).UtcDateTime).TotalSeconds) -lt 2) {
            # Python venv launchers can have a Python child. Only stop descendants of this verified process.
            $children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $entry.pid -and $_.Name -eq 'python.exe' }
            foreach ($child in $children) { Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue }
            Stop-Process -Id $entry.pid -Force -ErrorAction SilentlyContinue
        } else {
            throw "Process identity changed for $($entry.label); record retained, process not stopped."
        }
    }
}
Remove-Item -LiteralPath $statePath
Write-Output 'CreatorHub application processes stopped. PostgreSQL service was not stopped.'
