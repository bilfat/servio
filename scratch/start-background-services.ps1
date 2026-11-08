# Script to run all 8 microservices in the background without opening terminal windows

$services = @(
    @{ Name = "Identity Service (Modul 01)"; Dir = "backend\services\identity-service"; Port = 8001 },
    @{ Name = "Category Service (Modul 02)"; Dir = "backend\services\category-service"; Port = 8002 },
    @{ Name = "Product Service (Modul 03)"; Dir = "backend\services\product-service"; Port = 8003 },
    @{ Name = "Service Offering (Modul 04)"; Dir = "backend\services\service-service"; Port = 8004 },
    @{ Name = "Order Barang Service (Modul 05A)"; Dir = "backend\services\order-barang-service"; Port = 8005 },
    @{ Name = "Finance Service (Modul 06)"; Dir = "backend\services\finance-service"; Port = 8006 },
    @{ Name = "Order Jasa Service (Modul 05B)"; Dir = "backend\services\order-jasa-service"; Port = 8007 },
    @{ Name = "After-Sales Service (Modul 07)"; Dir = "backend\services\after-sales-service"; Port = 8008 }
)

$baseDir = $PSScriptRoot
if (-not $baseDir) {
    $baseDir = (Get-Location).Path
}

# Go to repository root if started inside scratch
if ($baseDir -like "*scratch*") {
    $repoRoot = (Resolve-Path "$baseDir\..").Path
} else {
    $repoRoot = $baseDir
}

$logsDir = Join-Path $repoRoot "scratch\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

Write-Host "Stopping any existing processes on ports 8001-8008..."
foreach ($svc in $services) {
    $port = $svc.Port
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -gt 0) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped existing process $procId on port $port"
            }
        }
    }
}

Start-Sleep -Seconds 1

Write-Host "Starting all 8 microservices in background (hidden)..."
$env:PHP_CLI_SERVER_WORKERS = "4"

foreach ($svc in $services) {
    $svcPath = Join-Path $repoRoot $svc.Dir
    $stdoutLog = Join-Path $logsDir ("service-" + $svc.Port + ".log")
    $stderrLog = Join-Path $logsDir ("service-" + $svc.Port + "-err.log")

    # Clear old logs
    if (Test-Path $stdoutLog) { Remove-Item $stdoutLog -Force }
    if (Test-Path $stderrLog) { Remove-Item $stderrLog -Force }

    $proc = Start-Process -FilePath "php" `
        -ArgumentList "artisan", "serve", "--host=127.0.0.1", "--port=$($svc.Port)" `
        -WorkingDirectory $svcPath `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru

    Write-Host ("Started " + $svc.Name + " (Port " + $svc.Port + ") with PID: " + $proc.Id)
}

Write-Host "Waiting 4 seconds for services to initialize..."
Start-Sleep -Seconds 4

Write-Host "`n--- Verification Status ---"
foreach ($svc in $services) {
    $port = $svc.Port
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $procId = ($conns | Select-Object -ExpandProperty OwningProcess -Unique)[0]
        Write-Host "SUCCESS: $($svc.Name) is LISTENING on port $port (PID: $procId)" -ForegroundColor Green
    } else {
        Write-Host "WARNING: $($svc.Name) is NOT yet listening on port $port. Check log: scratch\logs\service-$port-err.log" -ForegroundColor Red
        $errLog = Join-Path $logsDir ("service-" + $port + "-err.log")
        if (Test-Path $errLog) {
            Get-Content $errLog -Tail 10 | Write-Host
        }
        $stdLog = Join-Path $logsDir ("service-" + $port + ".log")
        if (Test-Path $stdLog) {
            Get-Content $stdLog -Tail 10 | Write-Host
        }
    }
}
