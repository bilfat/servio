<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=servio_after_sales_db', 'root', '');
$case = $pdo->query("SELECT * FROM after_sales_cases WHERE case_number = 'CLM-20261109-IRF1DI'")->fetch(PDO::FETCH_ASSOC);

if (!$case) {
    die("Case not found\n");
}

// 1. Periksa apakah sudah ada event REPLACEMENT_SHIPPED
$event = $pdo->query("SELECT * FROM case_events WHERE case_id = '{$case['id']}' AND event_type = 'REPLACEMENT_SHIPPED'")->fetch(PDO::FETCH_ASSOC);

$dataJson = json_encode([
    'shipping_method' => 'GOSEND',
    'courier_name' => 'GoSend Instant',
    'driver_name' => 'Pak Joko (Driver GoSend)',
    'driver_phone' => '0812-9876-5432',
    'tracking_number' => '0812-9876-5432',
    'tracking_url' => 'https://gjk.id/track/gosend-irf1di-live',
    'notes' => 'Unit baru tersegel resmi, garansi toko berlaku penuh.',
    'shipping_fee' => 0,
]);

if ($event) {
    $pdo->prepare("UPDATE case_events SET data_json = ?, reason = ? WHERE id = ?")
        ->execute([
            $dataJson,
            'Toko telah mengirimkan unit baru via GoSend Instant (Driver: Pak Joko - 0812-9876-5432) (Live Tracking: https://gjk.id/track/gosend-irf1di-live)',
            $event['id']
        ]);
    echo "Updated existing REPLACEMENT_SHIPPED event!\n";
} else {
    $eventId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    $lastSeq = (int) $pdo->query("SELECT MAX(sequence) FROM case_events WHERE case_id = '{$case['id']}'")->fetchColumn();
    $pdo->prepare("INSERT INTO case_events (id, case_id, sequence, event_type, from_state, to_state, actor_kind, actor_id, reason, data_json, occurred_at, created_at, updated_at) 
        VALUES (?, ?, ?, 'REPLACEMENT_SHIPPED', 'IN_RESOLUTION', 'IN_RESOLUTION', 'MERCHANT', 'usr-merchant-01', ?, ?, NOW(), NOW(), NOW())")
        ->execute([
            $eventId,
            $case['id'],
            $lastSeq + 1,
            'Toko telah mengirimkan unit baru via GoSend Instant (Driver: Pak Joko - 0812-9876-5432) (Live Tracking: https://gjk.id/track/gosend-irf1di-live)',
            $dataJson
        ]);
    echo "Inserted new REPLACEMENT_SHIPPED event!\n";
}

// 2. Update external ref
$pdo->exec("UPDATE case_external_refs SET external_id = '0812-9876-5432' WHERE case_id = '{$case['id']}' AND purpose = 'REPLACEMENT_FULFILLMENT'");
echo "Updated external ref for CLM-20261109-IRF1DI!\n";
