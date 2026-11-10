<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=servio_after_sales_db', 'root', '');
$row = $pdo->query("SELECT * FROM after_sales_cases WHERE case_number LIKE '%IRF1DI%'")->fetch(PDO::FETCH_ASSOC);
print_r($row);

if ($row) {
    $shipments = $pdo->query("SELECT * FROM case_return_shipments WHERE case_id = '{$row['id']}'")->fetchAll(PDO::FETCH_ASSOC);
    echo "RETURN SHIPMENTS:\n";
    print_r($shipments);

    $exts = $pdo->query("SELECT * FROM case_external_refs WHERE case_id = '{$row['id']}'")->fetchAll(PDO::FETCH_ASSOC);
    echo "EXTERNAL REFS:\n";
    print_r($exts);
}

