<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_identity_db", "root", "");
$stmt = $pdo->query("SELECT m.*, o.type, op.display_name FROM memberships m JOIN organizations o ON o.id = m.organization_id LEFT JOIN organization_profiles op ON op.organization_id = o.id WHERE m.user_id IN ('8ecc27f5-d30e-401e-89d5-aceec765a19a', 'acfdfc27-9ba5-472f-bec1-3c372f47fff6')");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);
