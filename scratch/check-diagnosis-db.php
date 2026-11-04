<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_order_jasa_db", "root", "");
$stmt = $pdo->query("SELECT * FROM service_work_items LIMIT 5");
echo "WORK ITEMS:\n" . json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT) . "\n\n";

$stmt2 = $pdo->query("SELECT * FROM service_part_items LIMIT 5");
echo "PART ITEMS:\n" . json_encode($stmt2->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT) . "\n";
