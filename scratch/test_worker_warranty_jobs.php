<?php

require 'backend/services/after-sales-service/vendor/autoload.php';
use GuzzleHttp\Client;

$client = new Client(['http_errors' => false]);
$res = $client->get('http://127.0.0.1:8007/api/v1/order-jasa/worker/warranty-jobs', [
    'headers' => [
        'X-User-Role' => 'WORKER',
        'X-User-Id' => 'acfdfc27-9ba5-472f-bec1-3c372f47fff6',
        'X-Gateway-Key' => 'servio_local_gateway_key_2026',
    ]
]);

echo "Status: " . $res->getStatusCode() . "\n";
echo "Body: " . (string)$res->getBody() . "\n";

