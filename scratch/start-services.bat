@echo off
set PHP_CLI_SERVER_WORKERS=4

echo Starting Identity Service (8001)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\identity-service && php artisan serve --host=127.0.0.1 --port=8001"

echo Starting Category Service (8002)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\category-service && php artisan serve --host=127.0.0.1 --port=8002"

echo Starting Product Service (8003)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\product-service && php artisan serve --host=127.0.0.1 --port=8003"

echo Starting Service Offering (8004)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\service-service && php artisan serve --host=127.0.0.1 --port=8004"

echo Starting Order Barang Service (8005)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\order-barang-service && php artisan serve --host=127.0.0.1 --port=8005"

echo Starting Finance Service (8006)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\finance-service && php artisan serve --host=127.0.0.1 --port=8006"

echo Starting Order Jasa Service (8007)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\order-jasa-service && php artisan serve --host=127.0.0.1 --port=8007"

echo Starting After-Sales Service (8008)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\after-sales-service && php artisan serve --host=127.0.0.1 --port=8008"

echo All 8 services launched in background!
