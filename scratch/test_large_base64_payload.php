<?php
$ch = curl_init('http://127.0.0.1:8007/api/v1/order-jasa/worker/tasks/01M6QVZ62J7SE7CJHXGGTHZ4N1/diagnosis');

// Generate 300KB dummy base64 string
$largeBase64 = 'data:image/jpeg;base64,' . str_repeat('A', 300 * 1024);

$payload = [
    'findings' => 'Tes foto besar',
    'work_items' => [
        [
            'item_name' => 'Jasa Perbaikan',
            'quantity' => 1,
            'unit_price_idr' => 121000,
            'total_price_idr' => 121000,
        ]
    ],
    'diagnosis_photos' => [$largeBase64],
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
    'Idempotency-Key: idemp-large-' . time(),
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

