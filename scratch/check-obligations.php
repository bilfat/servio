<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_order_jasa_db", "root", "");
$stmt = $pdo->query("SELECT id, order_id, purpose, principal_idr, state, fee_snapshot FROM service_payment_obligations WHERE order_id='01M685VWDP4T4NY01W6MV09P9X'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);

