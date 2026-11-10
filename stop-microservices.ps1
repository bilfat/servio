# Script to stop all running SERVIO Microservices + Reverb WebSocket

$ports = @(8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8089)
Write-Host "Menghentikan seluruh microservice SERVIO (Port 8001-8009 & 8089)..." -ForegroundColor Yellow

$stoppedCount = 0
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -gt 0) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "Service pada port $port (PID: $procId) berhasil dihentikan." -ForegroundColor Green
                $stoppedCount++
            }
        }
    }
}

if ($stoppedCount -eq 0) {
    Write-Host "Tidak ada microservice yang sedang berjalan." -ForegroundColor Gray
} else {
    Write-Host "Selesai. Total $stoppedCount proses dihentikan." -ForegroundColor Cyan
}
