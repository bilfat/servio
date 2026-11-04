<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_identity_db", "root", "");
$stmt = $pdo->query("SELECT * FROM user_addresses WHERE user_id = '692f03fd-2362-485a-9a23-a672bbb4533f'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);

