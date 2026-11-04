<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_identity_db", "root", "");

echo "=== USERS & ROLES ===" . PHP_EOL;
$stmt = $pdo->query("SELECT u.id, u.email, p.display_name, r.name as role_name 
    FROM users u 
    LEFT JOIN user_profiles p ON p.user_id = u.id 
    LEFT JOIN role_assignments ra ON ra.user_id = u.id 
    LEFT JOIN roles r ON r.id = ra.role_id 
    ORDER BY r.name, u.email LIMIT 50");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$r['id']} | Name: {$r['display_name']} | Email: {$r['email']} | Role: {$r['role_name']}" . PHP_EOL;
}

echo PHP_EOL . "=== ORGANIZATIONS ===" . PHP_EOL;
$stmt = $pdo->query("SELECT o.id, o.name, o.slug, o.type, o.owner_user_id FROM organizations o LIMIT 20");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$r['id']} | Name: {$r['name']} | Slug: {$r['slug']} | Type: {$r['type']} | Owner: {$r['owner_user_id']}" . PHP_EOL;
}

echo PHP_EOL . "=== MEMBERSHIPS ===" . PHP_EOL;
$stmt = $pdo->query("SELECT m.id, m.user_id, m.organization_id, p.display_name, m.role, m.status 
    FROM memberships m 
    LEFT JOIN user_profiles p ON p.user_id = m.user_id 
    LIMIT 20");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "Member ID: {$r['id']} | User: {$r['user_id']} ({$r['display_name']}) | Org: {$r['organization_id']} | Role: {$r['role']} | Status: {$r['status']}" . PHP_EOL;
}
