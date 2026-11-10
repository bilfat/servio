# Script to check status of all SERVIO Microservices + Reverb WebSocket

$services = @(
    @{ Name = "MySQL Database (XAMPP / MariaDB)"; Port = 3306 },
    @{ Name = "Identity Service (Modul 01)"; Port = 8001 },
    @{ Name = "Category Service (Modul 02)"; Port = 8002 },
    @{ Name = "Product Service (Modul 03)"; Port = 8003 },
    @{ Name = "Service Offering (Modul 04)"; Port = 8004 },
    @{ Name = "Order Barang Service (Modul 05A)"; Port = 8005 },
    @{ Name = "Finance Service (Modul 06)"; Port = 8006 },
    @{ Name = "Order Jasa Service (Modul 05B)"; Port = 8007 },
    @{ Name = "After-Sales Service (Modul 07)"; Port = 8008 },
    @{ Name = "Chat & Messaging Service"; Port = 8009 },
    @{ Name = "Laravel Reverb WebSocket Server"; Port = 8089 },
    @{ Name = "Next.js Frontend"; Port = 3000 }
)

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "             SERVIO MICROSERVICES STATUS               " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$runningCount = 0
foreach ($svc in $services) {
    $port = $svc.Port
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $procId = ($conns | Select-Object -ExpandProperty OwningProcess -Unique)[0]
        Write-Host (" [ONLINE]  " + $svc.Name.PadRight(35) + " Port: " + $port.ToString().PadRight(6) + " (PID: " + $procId + ")") -ForegroundColor Green
        $runningCount++
    } else {
        Write-Host (" [OFFLINE] " + $svc.Name.PadRight(35) + " Port: " + $port.ToString().PadRight(6)) -ForegroundColor Red
    }
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Total Berjalan: $runningCount dari $($services.Count) service.`n" -ForegroundColor Yellow
