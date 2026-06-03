$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting TradeBul Dev Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  -> http://localhost:3000" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host ""

# Start backend in a new window
$backendProcess = Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root'; `$env:API_ONLY='true'; `$env:PORT='3000'; Write-Host '[Backend] Starting on http://localhost:3000' -ForegroundColor Green; & '.\node_modules\.bin\tsx.cmd' 'server.ts'"
) -PassThru

Write-Host "[Launcher] Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green

# Give backend a moment to start
Start-Sleep -Seconds 2

# Start frontend in a new window
$frontendProcess = Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root'; Write-Host '[Frontend] Starting on http://localhost:5173' -ForegroundColor Green; & '.\node_modules\.bin\vite.cmd' '--host' '0.0.0.0'"
) -PassThru

Write-Host "[Launcher] Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green
Write-Host ""
Write-Host "Both servers are running in separate windows." -ForegroundColor Cyan
Write-Host "Open http://localhost:5173 in your browser." -ForegroundColor Cyan
Write-Host ""
Write-Host "This window will wait. Close it or press Ctrl+C to stop both servers." -ForegroundColor Yellow

try {
  # Wait for either process to exit
  while (-not $backendProcess.HasExited -and -not $frontendProcess.HasExited) {
    Start-Sleep -Milliseconds 500
  }
} finally {
  Write-Host "[Launcher] Stopping servers..." -ForegroundColor Red
  if (-not $backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue }
  if (-not $frontendProcess.HasExited) { Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue }
  Write-Host "[Launcher] Done." -ForegroundColor Red
}
