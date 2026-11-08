<?php
$c = curl_init("http://127.0.0.1:8003/api/v1/merchant/products");
curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
curl_setopt($c, CURLOPT_HTTPHEADER, [
    "X-Actor-User-Id: 4bee4c28-6799-4054-87a3-321e29811921",
    "X-Actor-Role: MERCHANT",
    "X-Actor-Org-Id: 0c1467e7-af68-4b26-ae84-daa41d51aed0",
    "X-Gateway-Key: servio_local_gateway_key_2026",
    "Accept: application/json"
]);
$res = curl_exec($c);
$data = json_decode($res, true);
if (isset($data['data'])) {
    foreach ($data['data'] as $p) {
        echo "Product: {$p['name']} | ID: {$p['id']}\n";
        echo "  warranty_policy: " . json_encode($p['warranty_policy'] ?? null) . "\n";
    }
} else {
    echo "Response: " . substr($res, 0, 500);
}
