<?php
// Test Customer Consent Submission
$orderId = '01M6QVZ62J7SE7CJHXGGTHZ4N1';
$customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';

$payload = [
    'method' => 'CUSTOMER_REMOTE',
    'decision' => 'APPROVED',
    'statement_acknowledged' => true,
    'notes' => 'Disetujui via remote app, lanjutkan pengerjaan ganti kapasitor.',
];

$ch = curl_init("http://127.0.0.1:8007/api/v1/order-jasa/orders/{$orderId}/consent");
$headers = [
    'Accept: application/json',
    'Content-Type: application/json',
    'X-Gateway-Key: servio_local_gateway_key_2026',
    'X-Actor-User-Id: ' . $customerId,
    'X-Actor-Role: CUSTOMER',
    'X-Actor-Org-Active: true',
    'X-Actor-Membership-Active: true',
    'X-Actor-Authz-Version: 1',
    'Idempotency-Key: consent-' . md5((string) microtime(true)),
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
