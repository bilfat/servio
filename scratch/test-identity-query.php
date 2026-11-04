<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=servio_order_jasa_db', 'root', '');
$stmt = $pdo->query("SELECT m.user_id, u.email, up.display_name, up.photo_path, up.employee_id 
    FROM servio_identity_db.memberships m 
    JOIN servio_identity_db.users u ON m.user_id = u.id 
    LEFT JOIN servio_identity_db.user_profiles up ON u.id = up.user_id 
    WHERE m.organization_id = '0740d857-b665-4191-aaf5-d7dd3611dc1d' 
      AND m.kind = 'WORKER'");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
