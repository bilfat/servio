<?php

declare(strict_types=1);

require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$appAfterSales = require __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$kernelAfterSales = $appAfterSales->make(Illuminate\Contracts\Console\Kernel::class);
$kernelAfterSales->bootstrap();

use App\Domain\AfterSales\Cases\CaseService;
use App\Domain\AfterSales\Decisions\DecisionService;
use App\Domain\AfterSales\Resolutions\ResolutionService;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseEvent;
use Illuminate\Support\Facades\Http;

echo "=== PENGUJIAN INTEGRASI DIGITAL WORKER REWORK (GARANSI JASA) ===\n\n";

$providerOrgId = '0740d857-b665-4191-aaf5-d7dd3611dc1d';
$customerId = '031772ea-9657-49bd-82f2-f57c65b0d986';

// 1. Cari kasus Garansi Rework
$case = AfterSalesCase::where('case_number', 'CLM-20261109-PEH7TF')->first();

if (!$case) {
    die("KASUS_REWORK_TIDAK_DITEMUKAN\n");
}

echo "1. Kasus Garansi: {$case->case_number} (ID: {$case->id})\n";
echo "   Status Awal Kasus: {$case->main_status}\n";

// Reset kasus ke IN_RESOLUTION jika perlu, atau buat job baru untuk pengujian
$pdoJasa = new PDO('mysql:host=127.0.0.1;dbname=servio_order_jasa_db', 'root', '');
$pdoAS = new PDO('mysql:host=127.0.0.1;dbname=servio_after_sales_db', 'root', '');

// Buat atau reset service_warranty_job untuk kasus ini
$existingJob = $pdoJasa->query("SELECT * FROM service_warranty_jobs WHERE case_id = '{$case->id}'")->fetch(PDO::FETCH_ASSOC);

if (!$existingJob) {
    $jobId = '01m70waysd66kpxn560zgzyegq';
    $pdoJasa->exec("INSERT INTO service_warranty_jobs (id, case_id, source_order_id, provider_org_id, customer_id, badge, scope_description, price_idr, status, worker_id, worker_name, scheduled_date, created_at, updated_at) 
        VALUES ('{$jobId}', '{$case->id}', '{$case->source_order_id}', '{$providerOrgId}', '{$customerId}', 'GARANSI', 'Pengerjaan ulang ban bocor', 0, 'ASSIGNED', 'acfdfc27-9ba5-472f-bec1-3c372f47fff6', 'Ahmad Fauzi (Teknisi Senior)', 'Besok, 13:00 - 15:00 WIB', NOW(), NOW())");
    $existingJob = $pdoJasa->query("SELECT * FROM service_warranty_jobs WHERE case_id = '{$case->id}'")->fetch(PDO::FETCH_ASSOC);
}

$jobId = $existingJob['id'];
echo "   Warranty Job ID: {$jobId}\n\n";

// Pastikan ref di after sales terdaftar
$ref = CaseExternalRef::where('case_id', $case->id)->where('purpose', 'WARRANTY_JOB')->first();
if (!$ref) {
    $ref = CaseExternalRef::create([
        'id' => (string) Illuminate\Support\Str::uuid(),
        'case_id' => $case->id,
        'target_service' => '05B',
        'external_id' => $jobId,
        'purpose' => 'WARRANTY_JOB',
        'external_status' => 'ASSIGNED',
        'last_checked_at' => now(),
    ]);
}

$headers = [
    'X-Actor-User-Id' => 'acfdfc27-9ba5-472f-bec1-3c372f47fff6',
    'X-Actor-Role' => 'WORKER_TECHNICIAN',
    'X-Actor-Org-Id' => $providerOrgId,
    'X-Gateway-Key' => 'servio_local_gateway_key_2026',
    'Accept' => 'application/json',
];

// ==========================================
// TAHAP 1: STATUS 'ASSIGNED' (Provider Tugaskan)
// ==========================================
$pdoJasa->exec("UPDATE service_warranty_jobs SET status = 'ASSIGNED', worker_name = 'Ahmad Fauzi (Teknisi Senior)', scheduled_date = 'Besok, 13:00 - 15:00 WIB' WHERE id = '{$jobId}'");
$ref->update(['external_status' => 'ASSIGNED']);

echo "[TEST 1] Status: ASSIGNED (Teknisi Ditugaskan oleh Provider)\n";
$checkJasa = $pdoJasa->query("SELECT status, worker_name, scheduled_date FROM service_warranty_jobs WHERE id = '{$jobId}'")->fetch(PDO::FETCH_ASSOC);
$ref->refresh();
echo "  - DB Order Jasa Status: {$checkJasa['status']} (Teknisi: {$checkJasa['worker_name']})\n";
echo "  - DB After Sales Status: {$ref->external_status}\n";
assert($checkJasa['status'] === 'ASSIGNED');
assert($ref->external_status === 'ASSIGNED');
echo "  -> HASIL: [BERHASIL]\n\n";

// ==========================================
// TAHAP 2: STATUS 'ACCEPTED' (Teknisi Terima Tugas)
// ==========================================
echo "[TEST 2] Panggilan API Worker: Terima Tugas (/accept)\n";
$respAccept = Http::withHeaders($headers)
    ->post("http://127.0.0.1:8007/api/v1/order-jasa/worker/warranty-jobs/{$jobId}/accept");

echo "  - Response Code: " . $respAccept->status() . "\n";
echo "  - Response Body: " . json_encode($respAccept->json()) . "\n";
$checkJasa = $pdoJasa->query("SELECT status FROM service_warranty_jobs WHERE id = '{$jobId}'")->fetch(PDO::FETCH_ASSOC);
$ref->refresh();
echo "  - DB Order Jasa Status: {$checkJasa['status']}\n";
echo "  - DB After Sales Status: {$ref->external_status}\n";
assert($checkJasa['status'] === 'ACCEPTED');
assert($ref->external_status === 'ACCEPTED');
echo "  -> HASIL: [BERHASIL]\n\n";

// ==========================================
// TAHAP 3: STATUS 'OTW' (Teknisi Menuju Lokasi)
// ==========================================
echo "[TEST 3] Panggilan API Worker: Teknisi Berangkat (/otw)\n";
$respOtw = Http::withHeaders($headers)
    ->post("http://127.0.0.1:8007/api/v1/order-jasa/worker/warranty-jobs/{$jobId}/otw");

echo "  - Response Code: " . $respOtw->status() . "\n";
$checkJasa = $pdoJasa->query("SELECT status FROM service_warranty_jobs WHERE id = '{$jobId}'")->fetch(PDO::FETCH_ASSOC);
$ref->refresh();
echo "  - DB Order Jasa Status: {$checkJasa['status']}\n";
echo "  - DB After Sales Status: {$ref->external_status}\n";
assert($checkJasa['status'] === 'OTW');
assert($ref->external_status === 'OTW');
echo "  -> HASIL: [BERHASIL]\n\n";

// ==========================================
// TAHAP 4: STATUS 'IN_PROGRESS' (Tiba & Kerjakan Garansi Rp0)
// ==========================================
echo "[TEST 4] Panggilan API Worker: Tiba & Mulai Pengerjaan (/start-work)\n";
$respStart = Http::withHeaders($headers)
    ->post("http://127.0.0.1:8007/api/v1/order-jasa/worker/warranty-jobs/{$jobId}/start-work");

echo "  - Response Code: " . $respStart->status() . "\n";
$checkJasa = $pdoJasa->query("SELECT status FROM service_warranty_jobs WHERE id = '{$jobId}'")->fetch(PDO::FETCH_ASSOC);
$ref->refresh();
echo "  - DB Order Jasa Status: {$checkJasa['status']}\n";
echo "  - DB After Sales Status: {$ref->external_status}\n";
assert($checkJasa['status'] === 'IN_PROGRESS');
assert($ref->external_status === 'IN_PROGRESS');
echo "  -> HASIL: [BERHASIL]\n\n";

// ==========================================
// TAHAP 5: STATUS 'COMPLETED' (Upload Bukti Selesai)
// ==========================================
echo "[TEST 5] Panggilan API Worker: Selesaikan & Upload Bukti (/complete)\n";
$evidenceUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600';
$headersWithIdem = array_merge($headers, [
    'Idempotency-Key' => 'idem-test-rework-' . uniqid(),
]);
$respComplete = Http::withHeaders($headersWithIdem)
    ->post("http://127.0.0.1:8007/api/v1/order-jasa/worker/warranty-jobs/{$jobId}/complete", [
        'completion_evidence' => $evidenceUrl,
        'notes' => 'Pekerjaan perbaikan ban telah rampung diuji bersama pelanggan di lokasi dengan tekanan 34 psi stabil.',
    ]);

echo "  - Response Code: " . $respComplete->status() . "\n";
echo "  - Response Body: " . json_encode($respComplete->json()) . "\n";
$checkJasa = $pdoJasa->query("SELECT status, completion_evidence FROM service_warranty_jobs WHERE id = '{$jobId}'")->fetch(PDO::FETCH_ASSOC);
$ref->refresh();
echo "  - DB Order Jasa Status: {$checkJasa['status']}\n";
echo "  - DB Order Jasa Bukti: {$checkJasa['completion_evidence']}\n";
echo "  - DB After Sales Status: {$ref->external_status}\n";
assert($checkJasa['status'] === 'COMPLETED');
assert($ref->external_status === 'COMPLETED');
echo "  -> HASIL: [BERHASIL]\n\n";

echo "=== SEMUA TAHAPAN INTEGRASI DIGITAL WORKER REWORK 100% SUKSES! ===\n";
