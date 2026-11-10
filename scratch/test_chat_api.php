<?php

$payload = json_encode([
    'target_user_id' => 'worker-joko-001',
    'target_entity_type' => 'worker',
    'target_entity_id' => 'worker-joko-001',
    'target_display_name' => 'Joko Susilo (Teknisi AC)',
    'target_avatar_url' => 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
    'my_display_name' => 'Ahmad Fauzi (Pelanggan)',
    'my_entity_type' => 'customer',
    'my_entity_id' => 'cust-ahmad-001'
]);

$opts = [
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\nX-Actor-User-Id: cust-ahmad-001\r\nX-Actor-Role: CUSTOMER\r\n",
        'content' => $payload,
        'ignore_errors' => true
    ]
];

$res = file_get_contents('http://127.0.0.1:8009/api/v1/chat/conversations/initiate', false, stream_context_create($opts));
echo "INITIATE RESPONSE:\n" . $res . "\n\n";

$data = json_decode($res, true);
$convId = $data['data']['conversation']['id'] ?? null;

if ($convId) {
    // 2. Send Message with Context Order
    $msgPayload = json_encode([
        'client_msg_id' => 'client-msg-' . time(),
        'type' => 'context_order',
        'body' => 'Halo Mas Joko, posisi sudah sampai mana ya?',
        'context_metadata' => [
            'order_id' => 'ORD-JASA-2026-9901',
            'order_type' => 'SERVICE',
            'title' => 'Perbaikan & Servis AC Bocor 1 PK',
            'status' => 'Teknisi Menuju Lokasi',
            'scheduled_at' => '2026-11-09 14:00'
        ]
    ]);

    $opts['http']['content'] = $msgPayload;
    $msgRes = file_get_contents("http://127.0.0.1:8009/api/v1/chat/conversations/{$convId}/messages", false, stream_context_create($opts));
    echo "SEND MESSAGE RESPONSE:\n" . $msgRes . "\n\n";

    // 3. Get Messages
    $opts['http']['method'] = 'GET';
    unset($opts['http']['content']);
    $getRes = file_get_contents("http://127.0.0.1:8009/api/v1/chat/conversations/{$convId}/messages", false, stream_context_create($opts));
    echo "GET MESSAGES RESPONSE:\n" . $getRes . "\n\n";

    // 4. Update Status to delivered and read
    $opts['http']['method'] = 'PATCH';
    $opts['http']['content'] = json_encode(['status' => 'read']);
    $statusRes = file_get_contents("http://127.0.0.1:8009/api/v1/chat/conversations/{$convId}/status", false, stream_context_create($opts));
    echo "STATUS UPDATE RESPONSE:\n" . $statusRes . "\n";
}
