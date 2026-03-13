# restart-server.ps1 — safely restart only the EDEN server on port 3002
$port = 3002
$conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($conn) {
    $edenPid = $conn.OwningProcess | Select-Object -Unique
    Write-Host "Stopping EDEN server (PID $edenPid) on port $port..."
    Stop-Process -Id $edenPid -Force
    Start-Sleep 1
}
Write-Host "Starting EDEN server..."
Start-Process node -ArgumentList "server/index.js" -WorkingDirectory $PSScriptRoot -WindowStyle Normal
Write-Host "Done."
