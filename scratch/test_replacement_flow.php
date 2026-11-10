<?php

declare(strict_types=1);

require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$appAfterSales = require __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$kernelAfterSales = $appAfterSales->make(Illuminate\Contracts\Console\Kernel::class);
$kernelAfterSales->bootstrap();

use App\Models\AfterSalesCase;
use App\Models\CaseEvent;
use App\Models\CaseExternalRef;
use App\Models\ResolutionRecord;
use App\Http\Controllers\Api\CustomerCaseController;
use App\Http\Controllers\Api\BusinessCaseController;
use App\Support\AuthenticatedActor;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

echo "========================================================================\n";
echo " TEST E2E ALUR RETUR & GANTI UNIT BARU (REPLACEMENT FLOW 6 LANGKAH)\n";
echo "========================================================================\n\n";

$merchantOrgId = '0c1467e7-af68-4b26-ae84-daa41d51aed0';
$customerId = '031772ea-9657-49bd-82f2-f57c65b0d986';
$orderNumber = 'ORD-BARANG-' . strtoupper(Str::random(6));

$merchantActor = new AuthenticatedActor(
    id: 'usr-merchant-01',
    role: 'MERCHANT',
    organizationId: $merchantOrgId,
    organizationType: 'MERCHANT'
);

$customerActor = new AuthenticatedActor(
    id: $customerId,
    role: 'CUSTOMER',
    organizationId: null
);

// Step 1: Buat Kasus Baru Retur & Ganti Unit
$caseId = (string) Str::uuid();
$caseNumber = 'CLM-RETUR-' . strtoupper(Str::random(6));

$case = AfterSalesCase::create([
    'id' => $caseId,
    'case_number' => $caseNumber,
    'case_type' => 'GOODS_RETURN',
    'source_order_kind' => 'GOODS',
    'source_order_id' => (string) Str::uuid(),
    'customer_id' => $customerId,
    'owner_org_id' => $merchantOrgId,
    'owner_org_type' => 'MERCHANT',
    'initial_solution' => 'REPLACEMENT',
    'reason_code' => 'DAMAGED_ON_ARRIVAL',
    'description' => 'Drum tidak berputar saat dinyalakan pertama kali, tombol power kedip merah.',
    'main_status' => 'SUBMITTED',
    'response_due_at' => now()->addHours(72),
]);

CaseEvent::create([
    'id' => (string) Str::uuid(),
    'case_id' => $case->id,
    'sequence' => 1,
    'event_type' => 'CASE_SUBMITTED',
    'from_state' => null,
    'to_state' => 'SUBMITTED',
    'actor_kind' => 'CUSTOMER',
    'actor_id' => $customerId,
    'reason' => 'Pengajuan Klaim Retur & Ganti Unit Baru',
    'data_json' => ['solution' => 'REPLACEMENT'],
    'occurred_at' => now(),
]);

echo "[STEP 1] Kasus Retur Dibuat: {$case->case_number}\n";
echo "  -> Status: {$case->main_status}\n";
echo "  -> Solusi Diajukan: {$case->initial_solution}\n\n";

// Step 2: Merchant Menyetujui dan Menerbitkan Alamat Retur
$bizController = app(BusinessCaseController::class);

$approveReq = Request::create("/api/v1/after-sales/business/cases/{$case->id}/decision", 'POST', [
    'action' => 'ACCEPT_INITIAL',
    'reason' => 'Klaim penggantian unit baru disetujui. Silakan kirimkan unit lama ke gudang retur.',
]);
$approveReq->attributes->set('actor', $merchantActor);
$bizController->makeDecision($approveReq, $case->id);

$instructionReq = Request::create("/api/v1/after-sales/business/cases/{$case->id}/return-instructions", 'POST', [
    'requires_physical_return' => true,
    'return_address' => 'Jl. Kebon Jeruk Barat No. 88, Jakarta Barat 11530',
    'recipient_name' => 'Staff QC & Return Desk (Bpk. Joko)',
    'recipient_phone' => '+62 811-9876-5432',
    'return_courier_notes' => 'Mohon sertakan kartu garansi dan box asli saat pengiriman.',
]);
$instructionReq->attributes->set('actor', $merchantActor);
$bizController->saveReturnInstructions($instructionReq, $case->id);

$case->refresh();
echo "[STEP 2] Merchant Menyetujui & Menerbitkan Alamat Retur\n";
echo "  -> Status: {$case->main_status}\n";
assert($case->main_status === 'AWAITING_RETURN', "Kasus harusnya berstatus AWAITING_RETURN!");
echo "  [OK] Status AWAITING_RETURN terverifikasi.\n\n";

// Step 3: Customer Mengirimkan Barang Retur (Input Resi)
$custController = app(CustomerCaseController::class);
$custReq = Request::create("/api/v1/after-sales/customer/cases/{$case->id}/return-shipment", 'POST', [
    'courier_name' => 'GoSend Instant',
    'tracking_number' => 'https://gjk.id/track/gosend-ret-8829104',
    'notes' => 'Barang retur sudah diserahkan ke driver GoSend menuju toko.',
]);
$custReq->attributes->set('actor', $customerActor);
$custRes = $custController->submitReturnShipment($custReq, $case->id);

$case->refresh();
echo "[STEP 3] Pembeli Mengirimkan Barang Retur (Input Resi)\n";
$returnShipmentEvent = CaseEvent::where('case_id', $case->id)->where('event_type', 'RETURN_SHIPMENT_SUBMITTED')->first();
assert($returnShipmentEvent !== null, "Event RETURN_SHIPMENT_SUBMITTED harus tercatat!");
echo "  -> Event Tercatat: {$returnShipmentEvent->event_type}\n";
echo "  [OK] Pembeli berhasil mengirim resi retur.\n\n";

// Step 4: Merchant Menerima Paket & Melakukan Inspeksi QC
$receiptReq = Request::create("/api/v1/after-sales/business/cases/{$case->id}/return-receipt", 'POST', [
    'quantity_received' => 1,
    'package_condition' => 'BAIK_TERSEGEL',
    'received_by_staff_name' => 'Bpk. Joko (QC Desk)',
    'receipt_notes' => 'Kardus dan unit telah diterima di meja QC.',
]);
$receiptReq->attributes->set('actor', $merchantActor);
$bizController->confirmReturnReceipt($receiptReq, $case->id);

$qcReq = Request::create("/api/v1/after-sales/business/cases/{$case->id}/return-inspection", 'POST', [
    'quantity_inspected' => 1,
    'quantity_approved' => 1,
    'item_condition' => 'BAIK_DAN_UTUH',
    'is_sku_matched' => true,
    'is_issue_matched' => true,
    'is_components_complete' => true,
    'inspection_outcome' => 'MATCHED',
    'inspection_notes' => 'Unit diperiksa fisik dan kelistrikan: terbukti motor drum macet bawaan pabrik. Lolos ganti unit baru.',
]);
$qcReq->attributes->set('actor', $merchantActor);
$bizController->submitReturnInspection($qcReq, $case->id);

$case->refresh();
echo "[STEP 4] Merchant Menerima & Loloskan Inspeksi QC\n";
echo "  -> Status: {$case->main_status}\n";
assert($case->main_status === 'IN_RESOLUTION', "Kasus harus masuk status IN_RESOLUTION setelah QC lolos!");
echo "  [OK] Status IN_RESOLUTION terverifikasi.\n\n";

// Step 5: Merchant Mengirimkan Unit Pengganti Baru via GoSend Instant (Rp 0 Bebas Ongkir)
$gojekTrackingLink = "https://gjk.id/track/srv-rep-" . strtolower($case->case_number);
$shipReq = Request::create("/api/v1/after-sales/business/cases/{$case->id}/replacement-shipment", 'POST', [
    'shipping_method' => 'GOSEND',
    'courier_name' => 'GoSend Instant',
    'driver_name' => 'Pak Joko (Driver GoSend)',
    'driver_phone' => '0812-3456-7890',
    'tracking_number' => '0812-3456-7890',
    'tracking_url' => $gojekTrackingLink,
    'notes' => 'Unit baru tersegel resmi, garansi toko berlaku penuh.',
]);
$shipReq->attributes->set('actor', $merchantActor);
$shipRes = $bizController->shipReplacement($shipReq, $case->id);

$case->refresh();
$shipEvent = CaseEvent::where('case_id', $case->id)->where('event_type', 'REPLACEMENT_SHIPPED')->first();
$extRef = CaseExternalRef::where('case_id', $case->id)->where('purpose', 'REPLACEMENT_FULFILLMENT')->first();

echo "[STEP 5] Merchant Mengirimkan Unit Baru Pengganti\n";
echo "  -> Metode Pengiriman: " . ($shipEvent->data_json['shipping_method'] ?? 'N/A') . "\n";
echo "  -> Courier: " . ($shipEvent->data_json['courier_name'] ?? 'N/A') . "\n";
echo "  -> Nama Driver: " . ($shipEvent->data_json['driver_name'] ?? 'N/A') . "\n";
echo "  -> No. Telp Driver: " . ($shipEvent->data_json['driver_phone'] ?? 'N/A') . "\n";
echo "  -> Live Tracking Gojek: " . ($shipEvent->data_json['tracking_url'] ?? 'N/A') . "\n";
echo "  -> Biaya Kirim Pembeli: Rp " . number_format($shipEvent->data_json['shipping_fee'] ?? 0, 0, ',', '.') . " (Gratis Ongkir Toko)\n";
echo "  -> Event: {$shipEvent->event_type}\n";
assert($shipEvent !== null, "Event REPLACEMENT_SHIPPED harus tercatat!");
assert(($shipEvent->data_json['shipping_fee'] ?? 0) === 0, "Ongkir harus Rp 0!");
assert(($shipEvent->data_json['driver_name'] ?? '') === 'Pak Joko (Driver GoSend)', "Driver name harus tersimpan!");
assert(($shipEvent->data_json['driver_phone'] ?? '') === '0812-3456-7890', "Driver phone harus tersimpan!");
assert($extRef->external_status === 'SHIPPED', "Status eksternal harus SHIPPED!");
echo "  [OK] Pengiriman unit baru berhasil dicatat dengan GoSend, Nama Driver, Telp, dan Live Tracking Gojek.\n\n";

// Step 6: Customer Mengonfirmasi Penerimaan Unit Baru (Selesai)
$confirmReq = Request::create("/api/v1/after-sales/customer/cases/{$case->id}/confirm-completion", 'POST', [
    'notes' => 'CUSTOMER_VERIFIED_COMPLETION',
    'rating' => 5,
]);
$confirmReq->attributes->set('actor', $customerActor);
$custController->confirmCompletion($confirmReq, $case->id);

$case->refresh();
echo "[STEP 6] Pelanggan Mengonfirmasi Penerimaan Unit Baru\n";
echo "  -> Main Status Akhir: {$case->main_status}\n";
assert($case->main_status === 'COMPLETED', "Kasus harus berakhir di status COMPLETED!");

$resolution = \App\Models\CaseResolution::where('case_id', $case->id)->first();
echo "  -> Resolution Status: " . ($resolution->status ?? 'N/A') . "\n";
assert($resolution && $resolution->status === 'VERIFIED_DONE', "Resolution record harus VERIFIED_DONE!");

echo "  [OK] Seluruh alur retur dan penggantian barang 6 langkah berhasil dituntaskan!\n\n";
echo "========================================================================\n";
echo " HASIL PENGUJIAN: SEMUA 6 LANGKAH BERJALAN 100% SUKSES DAN VALID!\n";
echo "========================================================================\n";
