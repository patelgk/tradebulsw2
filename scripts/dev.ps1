$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $root "node_modules\.bin\tsx.cmd"
$frontendScript = Join-Path $root "node_modules\.bin\vite.cmd"

function Start-DevJob {
  param(
    [string]$Name,
    [scriptblock]$Script
  )

  Start-Job -Name $Name -ScriptBlock $Script -ArgumentList $root
}

Write-Host "Starting backend on http://localhost:3000"
$backend = Start-DevJob "backend" {
  param($root)
  Set-Location $root
  $env:API_ONLY = "true"
  
  if (-not $env:PORT) { $env:PORT = "3000" }
  & ".\node_modules\.bin\tsx.cmd" "server.ts" 2>&1
}

Write-Host "Starting frontend on http://localhost:5173"
$frontend = Start-DevJob "frontend" {
  param($root)
  Set-Location $root
  & ".\node_modules\.bin\vite.cmd" "--host" "0.0.0.0" 2>&1
}

$jobs = @($backend, $frontend)

try {
  while ($true) {
    foreach ($job in $jobs) {
      Receive-Job $job | ForEach-Object {
        Write-Host "[$($job.Name)] $_"
      }

      if ($job.State -in @("Failed", "Stopped", "Completed")) {
        Receive-Job $job | ForEach-Object {
          Write-Host "[$($job.Name)] $_"
        }
        throw "$($job.Name) exited with state $($job.State)"
      }
    }

    Start-Sleep -Milliseconds 250
  }
}
finally {
  $jobs | Stop-Job -ErrorAction SilentlyContinue
  $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
}
