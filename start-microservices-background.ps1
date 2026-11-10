# Script to run all 9 SERVIO Microservices + Laravel Reverb WebSocket in background (Hidden)

$services = @(
    @{ Name = "Identity Service (Modul 01)"; Dir = "backend\services\identity-service"; Port = 8001 },
    @{ Name = "Category Service (Modul 02)"; Dir = "backend\services\category-service"; Port = 8002 },
    @{ Name = "Product Service (Modul 03)"; Dir = "backend\services\product-service"; Port = 8003 },
    @{ Name = "Service Offering (Modul 04)"; Dir = "backend\services\service-service"; Port = 8004 },
    @{ Name = "Order Barang Service (Modul 05A)"; Dir = "backend\services\order-barang-service"; Port = 8005 },
    @{ Name = "Finance Service (Modul 06)"; Dir = "backend\services\finance-service"; Port = 8006 },
    @{ Name = "Order Jasa Service (Modul 05B)"; Dir = "backend\services\order-jasa-service"; Port = 8007 },
    @{ Name = "After-Sales Service (Modul 07)"; Dir = "backend\services\after-sales-service"; Port = 8008 },
    @{ Name = "Chat & Messaging Service (Modul Chat)"; Dir = "backend\services\chat-service"; Port = 8009 }
)

$repoRoot = $PSScriptRoot
if (-not $repoRoot) {
    $repoRoot = (Get-Location).Path
}

$logsDir = Join-Path $repoRoot "scratch\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Ensure MySQL Database (MariaDB / XAMPP) is running on port 3306
$mysqlConn = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $mysqlConn) {
    $mysqldPath = "C:\xampp\mysql\bin\mysqld.exe"
    if (Test-Path $mysqldPath) {
        Write-Host "Starting MySQL Database (port 3306) in background..." -ForegroundColor Yellow
        Start-Process -FilePath $mysqldPath -ArgumentList "--defaults-file=bin\my.ini --standalone" -WorkingDirectory "C:\xampp\mysql" -WindowStyle Hidden
        
        # Wait up to 10 seconds for MySQL to be ready
        $mWait = 0
        while (-not (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue) -and ($mWait -lt 20)) {
            Start-Sleep -Milliseconds 500
            $mWait++
        }
    }
}

Write-Host "Stopping any existing processes on ports 8001-8009 and 8089..." -ForegroundColor Yellow
$allPorts = @(8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8089)
foreach ($port in $allPorts) {
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

Write-Host "`nStarting all 9 microservices in background (hidden)..." -ForegroundColor Cyan
$opcacheFlags = @(
    "-d", "zend_extension=opcache",
    "-d", "opcache.enable=1",
    "-d", "opcache.enable_cli=1",
    "-d", "opcache.memory_consumption=64",
    "-d", "opcache.interned_strings_buffer=8",
    "-d", "opcache.max_accelerated_files=4000",
    "-d", "opcache.validate_timestamps=1",
    "-d", "opcache.revalidate_freq=2"
)

foreach ($svc in $services) {
    $svcPath = Join-Path $repoRoot $svc.Dir
    $publicPath = Join-Path $svcPath "public"
    $serverScript = Join-Path $svcPath "vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"
    $stdoutLog = Join-Path $logsDir ("service-" + $svc.Port + ".log")
    $stderrLog = Join-Path $logsDir ("service-" + $svc.Port + "-err.log")

    if (Test-Path $stdoutLog) { Remove-Item $stdoutLog -Force }
    if (Test-Path $stderrLog) { Remove-Item $stderrLog -Force }

    $argList = $opcacheFlags + @(
        "-S", "127.0.0.1:$($svc.Port)",
        "`"$serverScript`""
    )

    $proc = Start-Process -FilePath "php" `
        -ArgumentList $argList `
        -WorkingDirectory $publicPath `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru

    Write-Host ("Started " + $svc.Name + " (Port " + $svc.Port + ") [PID: " + $proc.Id + "]")
}

# Start Laravel Reverb WebSocket Server on port 8089
Write-Host "Starting Laravel Reverb WebSocket Server (Port 8089)..." -ForegroundColor Cyan
$chatPath = Join-Path $repoRoot "backend\services\chat-service"
$reverbStdout = Join-Path $logsDir "service-8089-reverb.log"
$reverbStderr = Join-Path $logsDir "service-8089-reverb-err.log"

if (Test-Path $reverbStdout) { Remove-Item $reverbStdout -Force }
if (Test-Path $reverbStderr) { Remove-Item $reverbStderr -Force }

$reverbProc = Start-Process -FilePath "php" `
    -ArgumentList @("artisan", "reverb:start", "--host=0.0.0.0", "--port=8089") `
    -WorkingDirectory $chatPath `
    -WindowStyle Hidden `
    -RedirectStandardOutput $reverbStdout `
    -RedirectStandardError $reverbStderr `
    -PassThru

Write-Host ("Started Laravel Reverb WebSocket (Port 8089) [PID: " + $reverbProc.Id + "]")

Write-Host "`nWaiting for all microservices and Reverb to initialize..." -ForegroundColor Yellow

# Dynamic polling: wait up to 12 seconds for all ports to listen, checking every 400ms
$expectedPorts = ($services | ForEach-Object { $_.Port }) + 8089
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$maxWaitSec = 12

while ($sw.Elapsed.TotalSeconds -lt $maxWaitSec) {
    $allReady = $true
    foreach ($p in $expectedPorts) {
        $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        if (-not $c) {
            $allReady = $false
            break
        }
    }
    if ($allReady) {
        break
    }
    Start-Sleep -Milliseconds 400
}

Write-Host "`n========================================================"
Write-Host "                SERVIO BACKEND HEALTH CHECK             "
Write-Host "========================================================"
$allListening = $true

# 1. MySQL Database Check
$mysqlConn = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if ($mysqlConn) {
    $mPid = ($mysqlConn | Select-Object -ExpandProperty OwningProcess -Unique)[0]
    Write-Host (" [ONLINE]  " + "MySQL Database (MariaDB / XAMPP)".PadRight(35) + " Port: 3306   (PID: $mPid)") -ForegroundColor Green
} else {
    $allListening = $false
    Write-Host (" [OFFLINE] " + "MySQL Database (MariaDB / XAMPP)".PadRight(35) + " Port: 3306 FAILED") -ForegroundColor Red
}

# 2. 9 Microservices Check
foreach ($svc in $services) {
    $port = $svc.Port
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $procId = ($conns | Select-Object -ExpandProperty OwningProcess -Unique)[0]
        Write-Host (" [ONLINE]  " + $svc.Name.PadRight(35) + " Port: " + $port.ToString().PadRight(6) + " (PID: $procId)") -ForegroundColor Green
    } else {
        $allListening = $false
        Write-Host (" [OFFLINE] " + $svc.Name.PadRight(35) + " Port: " + $port.ToString().PadRight(6)) -ForegroundColor Red
        $errFile = Join-Path $logsDir ("service-" + $port + "-err.log")
        if (Test-Path $errFile) {
            $errContent = (Get-Content $errFile -Raw)
            if ($errContent -and $errContent.Trim()) {
                Write-Host "   Detail: $errContent" -ForegroundColor DarkGray
            }
        }
    }
}

# 3. Laravel Reverb WebSocket Check
$reverbConn = Get-NetTCPConnection -LocalPort 8089 -State Listen -ErrorAction SilentlyContinue
if ($reverbConn) {
    $rPid = ($reverbConn | Select-Object -ExpandProperty OwningProcess -Unique)[0]
    Write-Host (" [ONLINE]  " + "Laravel Reverb WebSocket Server".PadRight(35) + " Port: 8089   (PID: $rPid)") -ForegroundColor Green
} else {
    $allListening = $false
    Write-Host (" [OFFLINE] " + "Laravel Reverb WebSocket Server".PadRight(35) + " Port: 8089 FAILED") -ForegroundColor Red
    if (Test-Path $reverbStderr) {
        $rErr = (Get-Content $reverbStderr -Raw)
        if ($rErr -and $rErr.Trim()) {
            Write-Host "   Detail: $rErr" -ForegroundColor DarkGray
        }
    }
}

Write-Host "========================================================"
if ($allListening) {
    Write-Host "SUCCESS: MySQL + 9 Microservice + WebSocket Reverb aktif di latar belakang!`n" -ForegroundColor Green
} else {
    Write-Host "Periksa log di folder scratch\logs\ untuk detail error.`n" -ForegroundColor Yellow
}
