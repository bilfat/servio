<?php

require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';

use GuzzleHttp\Client;

$client = new Client(['http_errors' => false]);

echo "=== MEMULAI TEST INTEGRASI DIGITAL REWORK & UPLOAD BUKTI ===\n\n";

// 1. Ambil salah satu kasus claim_service yang ada
$res = $client->get('http://127.0.0.1:8007/api/after-sales/cases?actor_role=PROVIDER&organization_id=0740d857-b665-4191-aaf5-d7dd3611dc1d', [
    'headers' => [
        'X-User-Role' => 'PROVIDER',
        'X-User-Id' => 'usr-provider-001',
        'X-Gateway-Key' => 'servio_local_gateway_key_2026',
    ]
]);

$body = json_decode((string)$res->getBody(), true);
$cases = $body['data'] ?? [];
$reworkCase = null;
foreach ($cases as $c) {
    if (($c['case_type'] ?? '') === 'claim_service') {
        $reworkCase = $c;
        break;
    }
}

if (!$reworkCase) {
    echo "Tidak ditemukan kasus claim_service di provider. Membuat skenario test langsung...\n";
} else {
    echo "Kasus ditemukan: " . $reworkCase['case_number'] . " (ID: " . $reworkCase['id'] . ")\n";
}

// 2. Cek koneksi ke database order_jasa dan after_sales
$pdoJasa = new PDO("mysql:host=127.0.0.1;dbname=servio_order_jasa_db", "root", "");
$pdoAfter = new PDO("mysql:host=127.0.0.1;dbname=servio_after_sales_db", "root", "");

// Cek data terbaru di service_warranty_jobs
$stmt = $pdoJasa->query("SELECT id, case_id, worker_name, scheduled_date, notes, status, completion_evidence FROM service_warranty_jobs ORDER BY id DESC LIMIT 1");
$latestJob = $stmt->fetch(PDO::FETCH_ASSOC);

echo "\n--- Service Warranty Job Terakhir di DB Order Jasa ---\n";
print_r($latestJob);

// Cek data di case_resolutions di after_sales
if ($latestJob && !empty($latestJob['case_id'])) {
    $stmtAfter = $pdoAfter->prepare("SELECT * FROM case_resolutions WHERE case_id = ?");
    $stmtAfter->execute([$latestJob['case_id']]);
    $latestRes = $stmtAfter->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Case Resolution di DB After Sales ---\n";
    print_r($latestRes);
}

// 3. Test Eksekusi Endpoint Worker: Complete with Photo & Notes
if ($latestJob) {
    $jobId = $latestJob['id'];
    $testPhoto = "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80";
    $testNote = "Pengerjaan perbaikan freon dan pembersihan evaporator AC telah selesai 100%. Suhu angin kembali dingin 18C.";
    $payloadEvidence = "{$testPhoto} | {$testNote}";

    echo "\n--- Menguji Worker Complete Warranty Job via API Order Jasa ---\n";
    $resp = $client->post("http://127.0.0.1:8007/api/v1/order-jasa/worker/warranty-jobs/{$jobId}/complete", [
        'headers' => [
            'Content-Type' => 'application/json',
            'X-User-Role' => 'WORKER',
            'X-User-Id' => 'usr-worker-001',
            'X-Gateway-Key' => 'servio_local_gateway_key_2026',
            'Idempotency-Key' => 'idem-evidence-' . uniqid(),
        ],
        'json' => [
            'completion_evidence' => $payloadEvidence,
            'notes' => $testNote,
        ]
    ]);

    echo "Status Code: " . $resp->getStatusCode() . "\n";
    $respBody = json_decode((string)$resp->getBody(), true);
    echo "Response: " . json_encode($respBody, JSON_PRETTY_PRINT) . "\n";

    // Verifikasi Database setelah API dipanggil
    $stmtVerifyJasa = $pdoJasa->prepare("SELECT id, status, completion_evidence, notes FROM service_warranty_jobs WHERE id = ?");
    $stmtVerifyJasa->execute([$jobId]);
    $verifiedJasa = $stmtVerifyJasa->fetch(PDO::FETCH_ASSOC);

    echo "\n--- Verifikasi DB Order Jasa setelah Complete ---\n";
    print_r($verifiedJasa);

    $stmtVerifyAfter = $pdoAfter->prepare("SELECT * FROM case_resolutions WHERE case_id = ?");
    $stmtVerifyAfter->execute([$latestJob['case_id']]);
    $verifiedAfter = $stmtVerifyAfter->fetch(PDO::FETCH_ASSOC);

    echo "\n--- Verifikasi DB After Sales setelah Complete ---\n";
    print_r($verifiedAfter);

    $isJasaSaved = ($verifiedJasa['completion_evidence'] === $payloadEvidence);
    $isAfterSaved = ($verifiedAfter['evidence_ref'] === $payloadEvidence);

    echo "\n=== HASIL UJI SIMPAN DATABASE ===\n";
    echo "Tersimpan di servio_order_jasa_db: " . ($isJasaSaved ? "BERHASIL (MATCH)" : "GAGAL") . "\n";
    echo "Tersimpan di servio_after_sales_db: " . ($isAfterSaved ? "BERHASIL (MATCH)" : "GAGAL") . "\n";
}

echo "\n=== UJI SELESAI ===\n";
