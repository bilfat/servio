<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_identity_db", "root", "");
$stmt = $pdo->query("SELECT u.id, u.email, p.display_name, r.name as role_name 
    FROM users u 
    JOIN user_profiles p ON p.user_id = u.id 
    JOIN role_assignments ra ON ra.user_id = u.id 
    JOIN roles r ON r.id = ra.role_id 
    WHERE r.name LIKE '%Worker%' OR r.name LIKE '%Teknisi%' OR r.name LIKE '%Provider%' OR r.name LIKE '%Mitra%'");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo json_encode($r) . PHP_EOL;
}

