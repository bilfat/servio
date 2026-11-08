<?php
require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\OrderWarrantyEntitlement;

$goods = OrderWarrantyEntitlement::where('source_kind', 'GOODS')->first();
if ($goods) {
    $goods->update([
        'item_title' => 'Kabel Power NYM 3x2.5mm Glodok Standard',
        'item_image_url' => 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
        'organization_name' => 'Sinar AC & Sparepart Glodok (BUDIAJASA)',
        'order_number' => 'ORD-BRG-20261025-001',
        'catalog_snapshot' => [
            'name' => 'Kabel Power NYM 3x2.5mm Glodok Standard',
            'title' => 'Kabel Power NYM 3x2.5mm Glodok Standard',
            'image_url' => 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
            'price' => 450000,
        ],
    ]);
    echo "Updated GOODS entitlement\n";
}

$svc = OrderWarrantyEntitlement::where('source_kind', 'SERVICE')->first();
if ($svc) {
    $svc->update([
        'item_title' => 'Cuci dan Servis AC Split Bergaransi Mandiri Teknik',
        'item_image_url' => 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80',
        'organization_name' => 'PT Servio Mandiri Teknik',
        'order_number' => 'SVC-20261031-002',
        'catalog_snapshot' => [
            'name' => 'Cuci dan Servis AC Split Bergaransi Mandiri Teknik',
            'title' => 'Cuci dan Servis AC Split Bergaransi Mandiri Teknik',
            'image_url' => 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80',
            'price' => 150000,
        ],
    ]);
    echo "Updated SERVICE entitlement\n";
}

echo "Backfill complete.\n";

