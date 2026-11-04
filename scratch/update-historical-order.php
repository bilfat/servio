<?php
$pdo = new PDO("mysql:host=127.0.0.1;dbname=servio_order_jasa_db", "root", "");

// 1. Update diagnosis obligation
$diagSnapshot = [
    'diagnosis_fee_idr' => 50000,
    'customer_platform_fee_idr' => 0,
    'provider_commission_idr' => 0,
    'provider_net_entitlement_idr' => 50000,
    'policy_name' => 'Bebas Biaya Platform (Biaya Survei/Diagnosis)',
    'policy_version' => 1,
];
$stmt = $pdo->prepare("UPDATE service_payment_obligations SET fee_snapshot = :fee WHERE id = '01M685VWMW9FY9YNS622NQ1XAF'");
$stmt->execute([':fee' => json_encode($diagSnapshot)]);

// 2. Update execution obligation
$execSnapshot = [
    'labor_subtotal_idr' => 175000,
    'provider_part_subtotal_idr' => 25000,
    'execution_subtotal_idr' => 200000,
    'customer_platform_fee_idr' => 5000,
    'customer_total_idr' => 205000,
    'provider_commission_idr' => 10000,
    'provider_net_entitlement_idr' => 190000,
    'policy_name' => 'Kebijakan Layanan & Komisi Servis Jasa 2026',
    'policy_version' => 1,
    'policy_snapshot' => [
        'customer_app_fee_version' => 1,
        'customer_app_fee_policy_name' => 'Kebijakan Layanan & Komisi Servis Jasa 2026',
        'customer_app_fee_policy_id' => 'srv-kebijakan-servis-2026-4336',
        'customer_app_fee_type' => 'FIXED',
        'customer_app_fee_fixed' => 5000,
        'customer_app_fee_amount' => 5000,
        'provider_commission_version' => 1,
        'provider_commission_policy_name' => 'Kebijakan Layanan & Komisi Servis Jasa 2026',
        'provider_commission_policy_id' => 'srv-kebijakan-servis-2026-4336',
        'provider_commission_type' => 'FIXED',
        'provider_commission_fixed' => 10000,
        'provider_commission_amount' => 10000,
    ],
];
$stmt2 = $pdo->prepare("UPDATE service_payment_obligations SET principal_idr = 205000, fee_snapshot = :fee WHERE id = '01M6FQP2TS9V7BCAJYMSYK17T2'");
$stmt2->execute([':fee' => json_encode($execSnapshot)]);

// Also update attempt amount_due_idr if exists
$pdo->exec("UPDATE service_payment_attempts SET amount_due_idr = 205000 WHERE obligation_id = '01M6FQP2TS9V7BCAJYMSYK17T2'");

echo "Updated obligations successfully.\n";

