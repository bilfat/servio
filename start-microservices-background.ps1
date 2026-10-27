# Script to start all 6 SERVIO Microservices in background without opening terminal windows

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $baseDir) {
    $baseDir = Get-Location
}

$services = @(
    @{ Name = "Identity Service"; Port = 8001; Path = Join-Path $baseDir "backend\services\identity-service"; HealthPath = "/up" },
    @{ Name = "Category Service"; Port = 8002; Path = Join-Path $baseDir "backend\services\category-service"; HealthPath = "/api/v1/health" },
    @{ Name = "Product Service"; Port = 8003; Path = Join-Path $baseDir "backend\services\product-service"; HealthPath = "/api/v1/health" },
    @{ Name = "Service-Service"; Port = 8004; Path = Join-Path $baseDir "backend\services\service-service"; HealthPath = "/api/v1/health" },
    @{ Name = "Order Barang Service"; Port = 8005; Path = Join-Path $baseDir "backend\services\order-barang-service"; HealthPath = "/api/v1/order-barang/health" },
    @{ Name = "Finance Service"; Port = 8006; Path = Join-Path $baseDir "backend\services\finance-service"; HealthPath = "/api/v1/finance/health" }
)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting SERVIO Microservices (Ports 8001 - 8006) " -ForegroundColor Cyan
Write-Host "  Mode: Background (Persistent WMI, No Popups)     " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Stop any existing processes on ports 8001..8006
8001..8006 | ForEach-Object {
    $port = $_
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            if ($pidToKill -gt 0) {
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                Write-Host "Cleaned up process on port $port (PID: $pidToKill)" -ForegroundColor Yellow
            }
        }
    }
}

Start-Sleep -Milliseconds 800

# 2. Launch each service using WMI Win32_Process.Create (Hidden & Detached)
$startup = [wmiclass]"Win32_ProcessStartup"
$startupConfig = $startup.CreateInstance()
$startupConfig.ShowWindow = 0 # SW_HIDE
$processClass = [wmiclass]"Win32_Process"

foreach ($svc in $services) {
    $name = $svc.Name
    $port = $svc.Port
    $dir = $svc.Path

    if (Test-Path $dir) {
        Write-Host "Launching $name on port $port (hidden)..." -ForegroundColor Green
        $cmd = "php artisan serve --host=127.0.0.1 --port=$port"
        $result = $processClass.Create($cmd, $dir, $startupConfig)
        if ($result.ReturnValue -ne 0) {
            Write-Host "  Failed to launch $name (WMI ReturnCode: $($result.ReturnValue))" -ForegroundColor Red
        }
    } else {
        Write-Host "Directory not found: $dir" -ForegroundColor Red
    }
}

Write-Host "`nWaiting for services to become ready (up to 15s)..." -ForegroundColor Gray

# 3. Poll each port until listening or timeout
$timeoutSec = 15
$pollIntervalMs = 500
$elapsed = 0
$pending = @($services)

while ($pending.Count -gt 0 -and $elapsed -lt ($timeoutSec * 1000)) {
    Start-Sleep -Milliseconds $pollIntervalMs
    $elapsed += $pollIntervalMs
    
    $stillPending = @()
    foreach ($svc in $pending) {
        $conn = Get-NetTCPConnection -LocalPort $svc.Port -State Listen -ErrorAction SilentlyContinue
        if (-not $conn) {
            $stillPending += $svc
        }
    }
    $pending = $stillPending
}

# 4. Display status table and verify endpoints
Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  SERVIO Microservices Status:                     " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$allRunning = $true
$results = @()

foreach ($svc in $services) {
    $port = $svc.Port
    $name = $svc.Name
    $healthUrl = "http://127.0.0.1:$port$($svc.HealthPath)"
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

    if ($conn) {
        $pidNum = ($conn | Select-Object -First 1).OwningProcess
        $httpStatus = "UNKNOWN"
        try {
            $resp = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            $httpStatus = "HTTP $($resp.StatusCode)"
        } catch {
            if ($_.Exception.Response) {
                $httpStatus = "HTTP $($_.Exception.Response.StatusCode.value__)"
            } else {
                $httpStatus = "Active (Socket OK)"
            }
        }

        $results += [PSCustomObject]@{
            Port = $port
            Service = $name
            PID = $pidNum
            Status = "RUNNING"
            Health = $httpStatus
            URL = "http://127.0.0.1:$port"
        }
        Write-Host "[OK]   $name (Port $port, PID: $pidNum) -> $httpStatus" -ForegroundColor Green
    } else {
        $allRunning = $false
        $results += [PSCustomObject]@{
            Port = $port
            Service = $name
            PID = "-"
            Status = "FAILED"
            Health = "OFFLINE"
            URL = "http://127.0.0.1:$port"
        }
        Write-Host "[FAIL] $name (Port $port) -> Not listening!" -ForegroundColor Red
    }
}

Write-Host "===================================================" -ForegroundColor Cyan
if ($allRunning) {
    Write-Host "`nSuccess: All 6 microservices are running in the background!`n" -ForegroundColor Green
} else {
    Write-Host "`nWarning: Some microservices failed to start within ${timeoutSec}s.`n" -ForegroundColor Yellow
}

$results | Format-Table -AutoSize
