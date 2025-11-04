<#
Simple one-command launcher for Binance Analytics App (Windows PowerShell)
- Creates/uses backend/.venv and installs backend/frontend deps (unless -SkipInstall)
- Starts backend (http://localhost:8000) and frontend (http://localhost:5173) as background jobs
- Press Ctrl+C to stop both
#>

param([switch]$SkipInstall = $false)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$Venv = Join-Path $Backend '.venv'
$Req = Join-Path $Backend 'requirements.txt'

# Resolve a Python 3 command (prefer 'python', fallback to 'py -3')
$pyExe = $null
$pyPreArgs = @()
if (Get-Command python -ErrorAction SilentlyContinue) {
  $pyExe = 'python'
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  $pyExe = 'py'
  $pyPreArgs = @('-3')
} else {
  throw 'Python 3 is required but was not found in PATH. Install from https://www.python.org/downloads/ and retry.'
}

# Ensure venv
if (-not (Test-Path $Venv)) {
  Push-Location $Backend
  & $pyExe @($pyPreArgs + @('-m','venv','.venv'))
  Pop-Location
}
$venvPy = Join-Path $Venv 'Scripts/python.exe'
if (-not (Test-Path $venvPy)) { throw "Virtual environment missing/corrupted: $venvPy" }

# Install backend/frontend deps
if (-not $SkipInstall) {
  Push-Location $Backend
  & $venvPy -m pip install --upgrade pip
  & $venvPy -m pip install -r $Req
  Pop-Location

  Push-Location $Frontend
  if (Test-Path (Join-Path $Frontend 'package-lock.json')) { npm ci } else { npm install }
  Pop-Location
}
else {
  # Quick sanity check: ensure uvicorn is available in the venv when skipping installs
  & $venvPy -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('uvicorn') else 1)"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend dependencies not found (uvicorn missing) in $Venv. Re-run without -SkipInstall to install dependencies." -ForegroundColor Red
    exit 1
  }
}

# Start backend and frontend as jobs
$backendJob = Start-Job -Name 'backend' -ScriptBlock {
  Set-Location $using:Backend
  & $using:venvPy -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
}
$frontendJob = Start-Job -Name 'frontend' -ScriptBlock {
  Set-Location $using:Frontend
  npm run dev
}

Write-Host "Backend:  http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both services..." -ForegroundColor Yellow

# Brief health check: if backend job fails immediately, surface logs
Start-Sleep -Seconds 3
$bj = Get-Job -Name 'backend' -ErrorAction SilentlyContinue
if ($bj -and $bj.State -ne 'Running') {
  Write-Host "Backend failed to start. Details:" -ForegroundColor Red
  Receive-Job -Job $bj -Keep -ErrorAction SilentlyContinue
  if ($frontendJob) { Stop-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue }
  exit 1
}

try {
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  if ($backendJob)  { Stop-Job -Job $backendJob -Force -ErrorAction SilentlyContinue }
  if ($frontendJob) { Stop-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue }
  if ($backendJob)  { Receive-Job -Job $backendJob -ErrorAction SilentlyContinue | Out-Null; Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue }
  if ($frontendJob) { Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue | Out-Null; Remove-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue }
}
