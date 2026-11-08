<?php
$attemptId = '01M6QW28DZ3CK76KHR4KKRY7DV';
$workerId = 'acfdfc27-9ba5-472f-bec1-3c372f47fff6';

$payload = [
    'summary' => 'Pembersihan kondensor dan penggantian kapasitor kompresor 25uF telah selesai dilakukan sesuai rincian.',
    'test_result' => 'AC beroperasi normal dan dingin optimal pada suhu 18C, arus listrik stabil 3.8A.',
    'evidence' => [
        [
            'evidence_type' => 'BEFORE',
            'media_reference' => 'https://img.servio.id/evidence/before_repair_capacitance.jpg',
        ],
        [
            'evidence_type' => 'AFTER',
            'media_reference' => 'https://img.servio.id/evidence/after_repair_working_ac.jpg',
        ],
    ],
];

$ch = curl_init("http://127.0.0.1:8007/api/v1/order-jasa/worker/tasks/{$attemptId}/execution/finish");
$headers = [
    'Accept: application/json',
    'Content-Type: application/json',
    'X-Gateway-Key: servio_local_gateway_key_2026',
    'X-Actor-User-Id: ' . $workerId,
    'X-Actor-Role: WORKER',
    'X-Actor-Org-Active: true',
    'X-Actor-Membership-Active: true',
    'X-Actor-Authz-Version: 1',
    'Idempotency-Key: finish-' . md5((string) microtime(true)),
];

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response:\n$response\n";

