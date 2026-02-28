@echo off
set ROOT=C:\dev\projects\claude projects\eden claude
start "EDEN-SERVER" powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%ROOT%\run-server.ps1"
start "EDEN-CLIENT" powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%ROOT%\run-client.ps1"
echo Started Eden server + client as independent processes.
