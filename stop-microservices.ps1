# Script to stop all 6 SERVIO Microservices running on ports 8001 - 8006

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Stopping SERVIO Microservices (Ports 8001 - 8006) " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$services = @(
    @{ Name = "Identity Service"; Port = 8001 },
    @{ Name = "Category Service"; Port = 8002 },
    @{ Name = "Product Service"; Port = 8003 },
    @{ Name = "Service-Service"; Port = 8004 },
    @{ Name = "Order Barang Service"; Port = 8005 },
    @{ Name = "Finance Service"; Port = 8006 }
)

$stoppedCount = 0

foreach ($svc in $services) {
    $port = $svc.Port
    $name = $svc.Name
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            if ($pidToKill -gt 0) {
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                Write-Host "[STOPPED] $name (Port $port, PID: $pidToKill)" -ForegroundColor Yellow
                $stoppedCount++
            }
        }
    } else {
        Write-Host "[INACTIVE] $name (Port $port is not running)" -ForegroundColor DarkGray
    }
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Finished stopping services. Total stopped: $stoppedCount" -ForegroundColor Green
