@echo off
echo ===================================================
echo   Stopping SERVIO Microservices (Ports 8001-8006)
echo ===================================================

powershell -NoProfile -Command "8001..8006 | ForEach-Object { $conns = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $pids) { if ($p -gt 0) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host ('Stopped process ' + $p + ' on port ' + $_) } } } }"

echo Done!
pause
