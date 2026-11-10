<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=servio_after_sales_db', 'root', '');
$rows = $pdo->query("SELECT id, case_id, courier_name, tracking_number FROM case_return_shipments WHERE courier_name LIKE '%JNE%' OR tracking_number LIKE '%JNE%'")->fetchAll(PDO::FETCH_ASSOC);
echo "JNE IN case_return_shipments:\n";
print_r($rows);

$events = $pdo->query("SELECT id, case_id, event_type, reason FROM case_events WHERE reason LIKE '%JNE%'")->fetchAll(PDO::FETCH_ASSOC);
echo "JNE IN case_events:\n";
print_r($events);

