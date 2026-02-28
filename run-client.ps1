$ErrorActionPreference = 'Continue'
Set-Location "C:\dev\projects\claude projects\eden claude\client"
while ($true) {
  try {
    npm run dev
  } catch {
    Write-Host "[client] crashed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 3
}
