@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" %*
if errorlevel 1 (
    echo.
    echo CreatorHub failed to start. Please check the message above.
    pause
    exit /b 1
)
endlocal
