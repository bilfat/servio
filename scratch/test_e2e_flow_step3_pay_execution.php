<?php
$paymentId = '01M6RP07D65PW1GHA42Z5EC7SK';

$payload = [
    'outcome' => 'SUCCESS',
    'provider_event_id' => 'evt_sim_' . md5((string) microtime(true)),
    'reported_amount_idr' => 246000,
];

$ch = curl_init("http://127.0.0.1:8006/api/v1/finance/demo/payments/{$paymentId}/simulate");
$headers = [
    'Accept: application/json',
    'Content-Type: application/json',
    'X-Gateway-Key: servio_local_gateway_key_2026',
    'X-Actor-User-Id: hendrik-finance-admin-01',
    'X-Actor-Role: FINANCE_PAYMENT_OPS',
    'X-Actor-Org-Active: true',
    'X-Actor-Membership-Active: true',
    'X-Actor-Permissions: finance.mock.simulate,finance.policy.read,finance.ops.read',
    'X-Actor-Authz-Version: 1',
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
