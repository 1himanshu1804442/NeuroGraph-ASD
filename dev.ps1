<#
.SYNOPSIS
    NeuroGraph-ASD: Full-Stack Multi-Service Local Development Orchestrator.
.DESCRIPTION
    Launches and manages the complete 4-tier stack locally on Windows:
      1. PostgreSQL Database on port 5432 (with automatic Docker check and H2 in-memory fallback)
      2. Python FastAPI PyTorch GAT Engine on port 8000
      3. Java Spring Boot 3 Gateway on port 8080
      4. React 18 + Vite Clinician Dashboard on port 3000
    Streams color-coded logs concurrently from all application tiers.
#>

[CmdletBinding()]
param(
    [switch]$ForceH2 = $false
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "         NeuroGraph-ASD Full-Stack Clinical Diagnostic Platform           " -ForegroundColor Cyan
Write-Host "                 Local Multi-Service Orchestrator                         " -ForegroundColor DarkCyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Target Directory: $PSScriptRoot" -ForegroundColor DarkGray
Write-Host ""

# ------------------------------------------------------------------------------
# 1. Check & Orchestrate PostgreSQL Database (Port 5432)
# ------------------------------------------------------------------------------
Write-Host "[Database] Checking PostgreSQL availability on port 5432..." -ForegroundColor Yellow

$pgActive = $false

function Test-PostgresPort {
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect("127.0.0.1", 5432, $null, $null)
        $success = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
        if ($success -and $tcpClient.Connected) {
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
            return $true
        }
        $tcpClient.Close()
        return $false
    } catch {
        return $false
    }
}

if (-not $ForceH2) {
    if (Test-PostgresPort) {
        $pgActive = $true
        Write-Host "[Database] PostgreSQL is actively running locally on port 5432." -ForegroundColor Green
    } else {
        # Check if Docker is available to launch postgres container
        $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
        if ($dockerInstalled) {
            $dockerInfo = & docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[Database] PostgreSQL not running. Attempting to start Docker container 'neurograph-postgres'..." -ForegroundColor Cyan
                $existingContainer = & docker ps -a --filter "name=neurograph-postgres" --format "{{.Names}}"
                if ($existingContainer -eq "neurograph-postgres") {
                    & docker start neurograph-postgres | Out-Null
                } else {
                    & docker run -d --name neurograph-postgres `
                        -e POSTGRES_USER=neurograph `
                        -e POSTGRES_PASSWORD=neurograph123 `
                        -e POSTGRES_DB=neurograph_asd_db `
                        -p 5432:5432 `
                        postgres:16-alpine | Out-Null
                }
                
                # Wait for postgres to accept connections
                Write-Host "[Database] Waiting for PostgreSQL container initialization..." -ForegroundColor DarkGray
                for ($i = 0; $i -lt 6; $i++) {
                    Start-Sleep -Seconds 1
                    if (Test-PostgresPort) {
                        $pgActive = $true
                        Write-Host "[Database] Docker PostgreSQL container is now healthy and listening on port 5432." -ForegroundColor Green
                        break
                    }
                }
            }
        }
    }
}

if (-not $pgActive) {
    Write-Host "[Database] PostgreSQL not detected on port 5432." -ForegroundColor Yellow
    Write-Host "[Database] AUTO-FALLBACK: Spring Boot will launch with H2 In-Memory Database Profile (active: h2)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " Launching Application Services in Background" -ForegroundColor DarkGray
Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 2. Start Python FastAPI PyTorch ML Engine (Port 8000)
# ------------------------------------------------------------------------------
Write-Host "[1/3] Launching Python FastAPI PyTorch Engine (http://127.0.0.1:8000)..." -ForegroundColor Cyan
$pythonJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    
    # Activate virtual environment if present
    if (Test-Path ".\.venv\Scripts\Activate.ps1") {
        & ".\.venv\Scripts\Activate.ps1"
    } elseif (Test-Path ".\venv\Scripts\Activate.ps1") {
        & ".\venv\Scripts\Activate.ps1"
    }
    
    python -m uvicorn src.api.server:app --host 127.0.0.1 --port 8000 --reload
}

# ------------------------------------------------------------------------------
# 3. Start Java Spring Boot 3 Gateway (Port 8080)
# ------------------------------------------------------------------------------
$springMode = if ($pgActive) { "PostgreSQL" } else { "H2 In-Memory Fallback" }
Write-Host "[2/3] Launching Java Spring Boot Gateway (http://127.0.0.1:8080) [$springMode]..." -ForegroundColor Green

$useH2 = -not $pgActive
$springJob = Start-Job -ScriptBlock {
    param($enableH2)
    Set-Location "$using:PSScriptRoot\backend-spring"
    
    $mvnCmd = if (Test-Path ".\mvnw.cmd") { ".\mvnw.cmd" } else { "mvn" }
    
    if ($enableH2) {
        & $mvnCmd spring-boot:run "-Dspring-boot.run.profiles=h2"
    } else {
        & $mvnCmd spring-boot:run
    }
} -ArgumentList $useH2

# ------------------------------------------------------------------------------
# 4. Start React 18 + Vite Clinician Dashboard (Port 3000)
# ------------------------------------------------------------------------------
Write-Host "[3/3] Launching React Vite Dashboard (http://localhost:3000)..." -ForegroundColor Magenta
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PSScriptRoot\frontend"
    npm run dev -- --port 3000 --host 127.0.0.1
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host " All services started! Streaming live application logs below." -ForegroundColor Green
Write-Host " [CTRL+C] to gracefully stop all services." -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 5. Concurrent Color-Coded Log Streaming Loop
# ------------------------------------------------------------------------------
try {
    while ($true) {
        # Receive and format Python AI Engine logs
        $pyLogs = Receive-Job -Job $pythonJob
        if ($pyLogs) {
            foreach ($line in $pyLogs) {
                Write-Host "[Python-ML] $line" -ForegroundColor Cyan
            }
        }

        # Receive and format Spring Boot Gateway logs
        $springLogs = Receive-Job -Job $springJob
        if ($springLogs) {
            foreach ($line in $springLogs) {
                Write-Host "[Spring-GW] $line" -ForegroundColor DarkYellow
            }
        }

        # Receive and format React Vite Frontend logs
        $uiLogs = Receive-Job -Job $frontendJob
        if ($uiLogs) {
            foreach ($line in $uiLogs) {
                Write-Host "[React-UI]  $line" -ForegroundColor Magenta
            }
        }

        # Check if any job unexpectedly failed
        if ($pythonJob.State -eq 'Failed') {
            Write-Host "[ERROR] Python ML Engine background job failed!" -ForegroundColor Red
            Receive-Job -Job $pythonJob | Write-Host -ForegroundColor Red
            break
        }
        if ($springJob.State -eq 'Failed') {
            Write-Host "[ERROR] Spring Boot Gateway background job failed!" -ForegroundColor Red
            Receive-Job -Job $springJob | Write-Host -ForegroundColor Red
            break
        }
        if ($frontendJob.State -eq 'Failed') {
            Write-Host "[ERROR] React Frontend background job failed!" -ForegroundColor Red
            Receive-Job -Job $frontendJob | Write-Host -ForegroundColor Red
            break
        }

        Start-Sleep -Milliseconds 250
    }
}
finally {
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Red
    Write-Host " Stopping NeuroGraph-ASD background services..." -ForegroundColor Red
    Write-Host "==========================================================================" -ForegroundColor Red
    
    Stop-Job -Job $pythonJob, $springJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $pythonJob, $springJob, $frontendJob -ErrorAction SilentlyContinue
    
    Write-Host "All development services stopped safely." -ForegroundColor Green
}
