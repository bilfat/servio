<?php
$ch = curl_init('http://127.0.0.1:8007/api/v1/order-jasa/worker/tasks/01M6QVZ62J7SE7CJHXGGTHZ4N1/diagnosis');

$payload = [
    'findings' => 'Tes pemeriksaan kerusakan lapangan',
    'root_cause' => 'Kapasitor lemah',
    'recommended_actions' => 'Ganti kapasitor',
    'work_items' => [
        [
            'item_name' => 'Jasa Perbaikan AC',
            'quantity' => 1,
            'unit_price_idr' => 121000,
            'total_price_idr' => 121000,
        ]
    ],
    'part_items' => [
        [
            'part_name' => 'Kapasitor 25uF',
            'part_source' => 'PROVIDER_SUPPLIED',
            'quantity' => 1,
            'unit_price_idr' => 120000,
            'total_price_idr' => 120000,
            'availability_status' => 'IN_STOCK',
        ]
    ],
    'diagnosis_photos' => ['https://img.servio.id/photo1.jpg'],
];

$headers = [
    'Content-Type: application/json',
    'Accept: application/json',
    'X-Gateway-Key: servio_local_gateway_key_2026',
    'X-Actor-User-Id: acfdfc27-9ba5-472f-bec1-3c372f47fff6',
    'X-Actor-Role: WORKER',
    'X-Actor-Org-Active: true',
    'X-Actor-Membership-Active: true',
    'X-Actor-Authz-Version: 1',
    'Idempotency-Key: idemp-test-' . time(),
];

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

