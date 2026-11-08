<?php
require __DIR__ . '/../backend/services/product-service/vendor/autoload.php';
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

