@echo off
for /f "tokens=2 delims=," %%p in ('tasklist /v /fo csv ^| findstr /i "EDEN-SERVER EDEN-CLIENT"') do taskkill /PID %%~p /F >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and ($_.CommandLine -match 'run-server.ps1' -or $_.CommandLine -match 'run-client.ps1') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Stopped Eden independent processes.
