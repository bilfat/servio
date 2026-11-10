@echo off
setlocal
set PHP_CLI_SERVER_WORKERS=4
set OPCACHE_FLAGS=-d zend_extension=opcache -d opcache.enable=1 -d opcache.enable_cli=1 -d opcache.memory_consumption=64 -d opcache.interned_strings_buffer=8 -d opcache.max_accelerated_files=4000 -d opcache.validate_timestamps=1 -d opcache.revalidate_freq=2

echo Starting Identity Service (8001)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\identity-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8001 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo Starting Category Service (8002)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\category-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8002 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo Starting Product Service (8003)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\product-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8003 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo Starting Service Offering (8004)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\service-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8004 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo Starting Order Barang Service (8005)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\order-barang-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8005 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo Starting Finance Service (8006)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\finance-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8006 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo Starting Order Jasa Service (8007)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\order-jasa-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8007 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo Starting After-Sales Service (8008)...
start "" /min cmd /c "cd /d D:\website latihan\servio_web_13\backend\services\after-sales-service\public && php %OPCACHE_FLAGS% -S 127.0.0.1:8008 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

echo All 8 services launched in background!
