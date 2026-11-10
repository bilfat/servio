<?php

$p = new PDO('mysql:host=127.0.0.1;dbname=servio_order_jasa_db', 'root', '');
$cols = $p->query("SHOW COLUMNS FROM service_warranty_jobs LIKE 'worker_name'")->fetchAll();
if (empty($cols)) {
    $p->exec("ALTER TABLE service_warranty_jobs 
        ADD COLUMN worker_name VARCHAR(255) NULL AFTER worker_id, 
        ADD COLUMN scheduled_date VARCHAR(255) NULL AFTER worker_name, 
        ADD COLUMN notes TEXT NULL AFTER scheduled_date");
    echo "COLUMNS_ADDED\n";
} else {
    echo "ALREADY_EXISTS\n";
}

$p->exec("UPDATE service_warranty_jobs SET worker_name = 'Ahmad Teknisi (Mitra Resmi)', scheduled_date = 'Besok, 13:00 - 15:00 WIB' WHERE worker_name IS NULL");
echo "UPDATED_EXISTING\n";
