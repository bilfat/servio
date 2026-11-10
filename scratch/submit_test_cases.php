<?php

require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';

$app = require __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';

use App\Domain\AfterSales\Cases\CaseService;
use App\Models\OrderWarrantyEntitlement;
use Illuminate\Support\Facades\DB;

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
$caseService = app(CaseService::class);

echo "Submitting 4 test cases for customer {$customerId}...\n";

// 1. Refund Jasa (SO-20261108-P3NJI7)
$ent1 = OrderWarrantyEntitlement::where('order_number', 'SO-20261108-P3NJI7')->first();
if ($ent1) {
    try {
        $case1 = $caseService->submitCase(
            customerId: $customerId,
            sourceOrderKind: 'SERVICE',
            sourceOrderId: $ent1->order_id,
            caseType: 'SERVICE_WARRANTY',
            initialSolution: 'REFUND',
            reasonCode: 'Hasil pengerjaan tidak sesuai standar kesepakatan',
            description: 'Ban kembali bocor halus di sambungan tambalan setelah 2 hari servis selesai. Karena kondisi darurat saat di luar kota, saya terpaksa menambal di bengkel lain. Mohon pengembalian dana biaya jasa perbaikan.',
            items: [
                [
                    'order_item_id' => $ent1->order_item_key,
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'title' => $ent1->item_title,
                        'price' => 75000,
                        'price_idr' => 75000,
                    ]
                ]
            ],
            entitlementId: $ent1->id,
            sourceMerchantOrderId: $ent1->order_number,
            ownerOrgId: $ent1->owner_org_id,
            ownerOrgType: 'PROVIDER',
            evidenceData: [
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 124500,
                ],
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 98400,
                ]
            ]
        );
        echo "Case 1 Created (Refund Jasa): {$case1->case_number} (ID: {$case1->id})\n";
    } catch (\Throwable $e) {
        echo "Error Case 1: " . $e->getMessage() . "\n";
    }
} else {
    echo "Entitlement 1 not found\n";
}

// 2. Perbaikan Jasa (SO-20261106-PXZ5O0)
$ent2 = OrderWarrantyEntitlement::where('order_number', 'SO-20261106-PXZ5O0')->first();
if ($ent2) {
    try {
        $case2 = $caseService->submitCase(
            customerId: $customerId,
            sourceOrderKind: 'SERVICE',
            sourceOrderId: $ent2->order_id,
            caseType: 'SERVICE_WARRANTY',
            initialSolution: 'REWORK',
            reasonCode: 'Masalah yang sama muncul kembali pasca servis',
            description: 'Tekanan angin pada ban depan kiri turun drastis dari 34 psi menjadi 18 psi dalam semalam. Diduga klep pentil tubeless kurang kencang atau ada titik bocor jarum yang belum tuntas. Mohon teknisi datang kembali untuk perbaikan ulang gratis sesuai klausul garansi servis.',
            items: [
                [
                    'order_item_id' => $ent2->order_item_key,
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'title' => $ent2->item_title,
                        'price' => 75000,
                        'price_idr' => 75000,
                    ]
                ]
            ],
            entitlementId: $ent2->id,
            sourceMerchantOrderId: $ent2->order_number,
            ownerOrgId: $ent2->owner_org_id,
            ownerOrgType: 'PROVIDER',
            evidenceData: [
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 145000,
                ],
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 112000,
                ]
            ]
        );
        echo "Case 2 Created (Perbaikan Jasa): {$case2->case_number} (ID: {$case2->id})\n";
    } catch (\Throwable $e) {
        echo "Error Case 2: " . $e->getMessage() . "\n";
    }
} else {
    echo "Entitlement 2 not found\n";
}

// 3. Refund Barang (ORD-20261025-QTRVKJ)
$ent3 = OrderWarrantyEntitlement::where('order_number', 'ORD-20261025-QTRVKJ')->first();
if ($ent3) {
    try {
        $case3 = $caseService->submitCase(
            customerId: $customerId,
            sourceOrderKind: 'GOODS',
            sourceOrderId: $ent3->order_id,
            caseType: 'GOODS_WARRANTY',
            initialSolution: 'REFUND',
            reasonCode: 'Nilai spesifikasi teknis tidak sesuai',
            description: 'Setelah kabel dibuka dan diukur dengan mikrometer, kawat inti tembaga hanya berdiameter 1.78 mm (seharusnya 2.5 mm sesuai SNI). Kami tidak berani memasang untuk beban AC sentral karena rentan panas. Karena proyek harus jalan cepat, kami sudah membeli merk lain dan mengajukan refund pengembalian dana untuk 1 roll ini.',
            items: [
                [
                    'order_item_id' => $ent3->order_item_key,
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'title' => $ent3->item_title,
                        'price' => 850000,
                        'price_idr' => 850000,
                    ]
                ]
            ],
            entitlementId: $ent3->id,
            sourceMerchantOrderId: $ent3->order_number,
            ownerOrgId: $ent3->owner_org_id,
            ownerOrgType: 'MERCHANT',
            evidenceData: [
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 134000,
                ],
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 156000,
                ]
            ]
        );
        echo "Case 3 Created (Refund Barang): {$case3->case_number} (ID: {$case3->id})\n";
    } catch (\Throwable $e) {
        echo "Error Case 3: " . $e->getMessage() . "\n";
    }
} else {
    echo "Entitlement 3 not found\n";
}

// 4. Penggantian Barang / Retur Barang (ORD-20261026-CFRBZX)
$ent4 = OrderWarrantyEntitlement::where('order_number', 'ORD-20261026-CFRBZX')->first();
if ($ent4) {
    try {
        $case4 = $caseService->submitCase(
            customerId: $customerId,
            sourceOrderKind: 'GOODS',
            sourceOrderId: $ent4->order_id,
            caseType: 'GOODS_WARRANTY',
            initialSolution: 'REPLACEMENT',
            reasonCode: 'Kerusakan komponen / cacat pabrik',
            description: 'Pada meteran ke-15 terdapat sobekan melintang pada lapisan isolasi PVC putih bagian luar dan pembungkus kabel biru terkelupas hingga terlihat serat tembaga. Ini jelas cacat gulungan dari pabrikan. Mohon instruksi retur fisik dan pengiriman 1 roll unit pengganti baru yang mulus.',
            items: [
                [
                    'order_item_id' => $ent4->order_item_key,
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'title' => $ent4->item_title,
                        'price' => 450000,
                        'price_idr' => 450000,
                    ]
                ]
            ],
            entitlementId: $ent4->id,
            sourceMerchantOrderId: $ent4->order_number,
            ownerOrgId: $ent4->owner_org_id,
            ownerOrgType: 'MERCHANT',
            evidenceData: [
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 128000,
                ],
                [
                    'media_ref' => 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&auto=format&fit=crop&q=80',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 141000,
                ]
            ]
        );
        echo "Case 4 Created (Penggantian / Retur Barang): {$case4->case_number} (ID: {$case4->id})\n";
    } catch (\Throwable $e) {
        echo "Error Case 4: " . $e->getMessage() . "\n";
    }
} else {
    echo "Entitlement 4 not found\n";
}

echo "Done.\n";

