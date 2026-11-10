<?php
$ch = curl_init('http://127.0.0.1:8008/api/v1/after-sales/warranties');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'X-User-Id: 692f03fd-2362-485a-9a23-a672bbb4533f',
    'X-User-Role: CUSTOMER',
]);
$res = curl_exec($ch);
curl_close($ch);

$data = json_decode($res, true);
echo "Items returned from API: " . count($data['data'] ?? []) . "\n";
foreach ($data['data'] ?? [] as $w) {
    echo sprintf(
        "Order: %s | Item: %s | Status: %s | isActive: %s | isClaimEligible: %s | remainingQty: %s\n",
        $w['order_number'],
        $w['item_title'],
        $w['status'],
        $w['is_active'] ? 'true' : 'false',
        $w['is_claim_eligible'] ? 'true' : 'false',
        $w['remaining_quantity'] ?? '0'
    );
}




