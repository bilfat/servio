<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_finance_db", "root", "");
$stmt = $pdo->query("SELECT g.id as group_id, g.slug, g.display_name, v.id as version_id, v.version_no, v.status, t.policy_code, t.payer_type, t.fee_type, t.fixed_amount_idr, t.percentage_rate, t.charge_scope, t.calculation_base FROM fee_policy_groups g JOIN fee_policy_versions v ON v.group_id = g.id JOIN fee_policy_targets t ON t.version_id = v.id WHERE v.status = 'ACTIVE'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);

