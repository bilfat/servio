<?php
// Align service_offerings
require __DIR__ . '/../backend/services/service-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/service-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$updatedServices = Illuminate\Support\Facades\DB::table('service_offerings')
    ->where('id', 'c0beae3f-8ea0-466c-8dcf-a93f2a4125e2')
    ->update([
        'warranty_config' => json_encode([
            'warrantyEnabled' => true,
            'warranty_option_id' => '05b30638-0519-4755-8447-4427086f0c07',
            'presetId' => '05b30638-0519-4755-8447-4427086f0c07',
            'name' => 'garansi perbaikan',
            'presetName' => 'garansi perbaikan',
            'duration_days' => 20,
            'durationDays' => 20,
            'coverage' => 'tiba tiba',
            'exclusions' => 'Tidak ada pengecualian khusus.',
            'terms' => 'Klaim dapat diajukan konsumen di pusat purnajual selama masa garansi aktif dengan mengunggah foto/video kendala pengerjaan teknisi.',
        ]),
        'updated_at' => now(),
    ]);

echo "Service offerings updated: $updatedServices\n";

// Align products
require_once __DIR__ . '/../backend/services/product-service/vendor/autoload.php';
$appP = require_once __DIR__ . '/../backend/services/product-service/bootstrap/app.php';
$kernelP = $appP->make(Illuminate\Contracts\Console\Kernel::class);
$kernelP->bootstrap();

$updatedProducts = Illuminate\Support\Facades\DB::table('products')
    ->where('id', '685086c9-d85f-4968-a5ae-2c9b5b455776')
    ->update([
        'warranty_policy' => json_encode([
            'presetId' => '2e1148db-be59-4e33-9926-1fa55b871d12',
            'preset_id' => '2e1148db-be59-4e33-9926-1fa55b871d12',
            'name' => 'garansi utama',
            'durationDays' => 15,
            'duration_days' => 15,
            'durationMonths' => 1,
            'coverage' => 'barang rusak',
            'exclusions' => 'human eror',
            'terms' => 'Klaim dapat diajukan pelanggan melalui pusat purnajual selama masa garansi aktif dengan melampirkan bukti kendala produk.',
        ]),
        'updated_at' => now(),
    ]);

echo "Products updated: $updatedProducts\n";

