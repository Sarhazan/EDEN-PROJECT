$ErrorActionPreference = 'Continue'
Set-Location "C:\dev\projects\claude projects\eden claude\server"
while ($true) {
  try {
    node index.js
  } catch {
    Write-Host "[server] crashed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 3
}
