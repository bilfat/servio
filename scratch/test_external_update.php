<?php

require 'backend/services/after-sales-service/vendor/autoload.php';
use GuzzleHttp\Client;

$client = new Client(['http_errors' => false]);
$res = $client->post('http://127.0.0.1:8008/internal/v1/after-sales/cases/66e3ff16-afad-4669-9d09-eaa3d193abd7/external-update', [
    'headers' => [
        'X-Internal-Service-Key' => 'servio_local_internal_service_key_2026',
        'X-Source-Service' => 'order-jasa-service',
        'X-Service-Token' => 'servio_s2s_order_jasa_secret_2026',
        'Accept' => 'application/json',
    ],
    'json' => [
        'target_service' => '05B',
        'external_id' => '01m70waysd66kpxn560zgzyegq',
        'external_status' => 'COMPLETED',
        'purpose' => 'WARRANTY_JOB',
        'data' => [
            'completion_evidence' => 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80 | Pengerjaan perbaikan freon selesai.',
            'worker_name' => 'Ahmad Fauzi (Teknisi Senior)',
            'scheduled_date' => 'Besok, 13:00 - 15:00 WIB',
        ]
    ]
]);

echo "Status Code: " . $res->getStatusCode() . "\n";
echo "Body: " . (string)$res->getBody() . "\n";

