<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_order_jasa_db", "root", "");
$stmt = $pdo->query("SHOW TABLES");
echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN), JSON_PRETTY_PRINT);

