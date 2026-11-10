<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=servio_after_sales_db', 'root', '');

// Update case_return_shipments
$pdo->exec("UPDATE case_return_shipments 
    SET courier_name = 'GoSend Instant',
        tracking_number = 'https://gjk.id/track/gosend-ret-live',
        customer_notes = 'Barang retur dikirimkan langsung via driver GoSend Instant ke gudang toko.'
    WHERE courier_name LIKE '%JNE%' OR tracking_number LIKE '%JNE%'");

echo "Updated case_return_shipments!\n";

// Update case_events
$pdo->exec("UPDATE case_events 
    SET reason = 'Pelanggan telah mengirim barang retur via GoSend Instant (Live Tracking: https://gjk.id/track/gosend-ret-live)'
    WHERE reason LIKE '%JNE%'");

echo "Updated case_events!\n";

// Verify CLM-20261109-IRF1DI
$ship = $pdo->query("SELECT * FROM case_return_shipments WHERE case_id = '1c49aea0-741c-4a40-98b5-7410adda6174'")->fetch(PDO::FETCH_ASSOC);
print_r($ship);

