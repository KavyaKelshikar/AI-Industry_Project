# Stitch AI Platform - Unified Development Startup Script
# Usage: .\start-dev.ps1

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       STITCH AI PLATFORM - UNIFIED STARTUP ENGINE              " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = $PSScriptRoot
Set-Location $RootPath

# 1. Check Docker and Start Infrastructure
Write-Host "[1/5] Checking Docker and Infrastructure..." -ForegroundColor Yellow

$DockerRunning = $false
try {
    $dockerVersion = docker info --format "{{.ServerVersion}}" 2>$null
    if ($dockerVersion) {
        $DockerRunning = $true
    }
} catch {
    $DockerRunning = $false
}

if (-not $DockerRunning) {
    Write-Host "  [!] Docker Desktop does not appear to be running." -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and rerun this script." -ForegroundColor Red
} else {
    Write-Host "  [+] Docker is running (Version: $dockerVersion)" -ForegroundColor Green
    
    # Check if MongoDB and ChromaDB are already running
    $runningMongo = docker ps --filter "publish=27017" --format "{{.Names}}" 2>$null
    $runningChroma = docker ps --filter "publish=8000" --format "{{.Names}}" 2>$null

    if ($runningMongo -and $runningChroma) {
        Write-Host "  [+] Reusing existing running containers: $runningMongo, $runningChroma" -ForegroundColor Green
    } else {
        Write-Host "  Starting MongoDB and ChromaDB via Docker Compose..." -ForegroundColor Gray
        docker compose up -d mongodb chromadb
    }
}

# 2. Launch AI Service (FastAPI / Uvicorn on Port 8002)
Write-Host "[2/5] Starting Python AI Service (Port 8002)..." -ForegroundColor Yellow
$aiVenvPython = Join-Path $RootPath "ai-service\venv\Scripts\python.exe"
if (Test-Path $aiVenvPython) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\ai-service'; & '$aiVenvPython' -m uvicorn src.main:app --host 0.0.0.0 --port 8002 --reload" -WindowStyle Minimized
    Write-Host "  [+] AI Service process launched in background (Port 8002)" -ForegroundColor Green
} else {
    Write-Host "  [!] Virtual environment not found at $aiVenvPython" -ForegroundColor Red
}

# 3. Launch Backend (Node.js / Express on Port 5000)
Write-Host "[3/5] Starting Node.js Backend API (Port 5000)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\backend'; npm start" -WindowStyle Minimized
Write-Host "  [+] Backend server process launched (Port 5000)" -ForegroundColor Green

# 4. Launch Frontend (Vite / React on Port 5173)
Write-Host "[4/5] Starting React / Vite Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\frontend'; npm run dev" -WindowStyle Minimized
Write-Host "  [+] Frontend dev server process launched (Port 5173)" -ForegroundColor Green

# 5. Health Check & Live Readiness Verification
Write-Host "[5/5] Probing live service readiness..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

$backendHealthy = $false
$aiHealthy = $false
$healthResponse = $null

for ($i = 0; $i -lt 5; $i++) {
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/health" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($healthResponse -and $healthResponse.data) {
            $backendHealthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

try {
    $aiResponse = Invoke-RestMethod -Uri "http://localhost:8002/health" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($aiResponse) {
        $aiHealthy = $true
    }
} catch {
    $aiHealthy = $false
}

# Final Status Summary Matrix
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "              STITCH AI INTEGRATED PLATFORM STATUS              " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$statusTable = @(
    [PSCustomObject]@{ Service = "Frontend (React UI)";      Port = "5173";  URL = "http://localhost:5173";             Status = "ONLINE" },
    [PSCustomObject]@{ Service = "Backend (Node API)";       Port = "5000";  URL = "http://localhost:5000/api/v1/health"; Status = if ($backendHealthy) { "ONLINE" } else { "STARTING" } },
    [PSCustomObject]@{ Service = "AI Service (FastAPI)";     Port = "8002";  URL = "http://localhost:8002/health";      Status = if ($aiHealthy) { "ONLINE" } else { "STARTING" } },
    [PSCustomObject]@{ Service = "ChromaDB (Vector Store)";  Port = "8000";  URL = "http://localhost:8000";             Status = if ($healthResponse.data.services.chromadb -eq "connected") { "CONNECTED" } else { "ONLINE" } },
    [PSCustomObject]@{ Service = "MongoDB (Database)";       Port = "27017"; URL = "localhost:27017";                   Status = if ($healthResponse.data.services.mongodb -eq "connected") { "CONNECTED" } else { "ONLINE" } }
)

$statusTable | Format-Table -AutoSize

Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Access the Live Platform Dashboard:  " -NoNewline
Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host "  Aggregate Health Endpoint:          " -NoNewline
Write-Host "http://localhost:5000/api/v1/health" -ForegroundColor Green
Write-Host "  FastAPI AI Health Endpoint:         " -NoNewline
Write-Host "http://localhost:8002/health" -ForegroundColor Green
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
