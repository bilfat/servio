@echo off
echo ===================================================
echo   Starting SERVIO Microservices (Modul 01 - 06)
echo ===================================================

echo [1/6] Starting Identity Service on port 8001...
start "Servio - Identity Service (8001)" cmd /k "cd /d "%~dp0backend\services\identity-service" && php artisan serve --host=127.0.0.1 --port=8001"

echo [2/6] Starting Category Service on port 8002...
start "Servio - Category Service (8002)" cmd /k "cd /d "%~dp0backend\services\category-service" && php artisan serve --host=127.0.0.1 --port=8002"

echo [3/6] Starting Product Service on port 8003...
start "Servio - Product Service (8003)" cmd /k "cd /d "%~dp0backend\services\product-service" && php artisan serve --host=127.0.0.1 --port=8003"

echo [4/6] Starting Service-Service on port 8004...
start "Servio - Service Offering (8004)" cmd /k "cd /d "%~dp0backend\services\service-service" && php artisan serve --host=127.0.0.1 --port=8004"

echo [5/6] Starting Order Barang Service on port 8005...
start "Servio - Order Barang Service (8005)" cmd /k "cd /d "%~dp0backend\services\order-barang-service" && php artisan serve --host=127.0.0.1 --port=8005"

echo [6/6] Starting Finance Service on port 8006...
start "Servio - Finance Service (8006)" cmd /k "cd /d "%~dp0backend\services\finance-service" && php artisan serve --host=127.0.0.1 --port=8006"

echo ===================================================
echo   All 6 Microservices have been launched!
echo   Ports: 8001, 8002, 8003, 8004, 8005, 8006
echo ===================================================
pause
