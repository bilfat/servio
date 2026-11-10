<?php

$pdoAfter = new PDO("mysql:host=127.0.0.1;dbname=servio_after_sales_db", "root", "");
$stmt = $pdoAfter->query("SELECT * FROM case_external_refs");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt2 = $pdoAfter->query("SELECT * FROM case_events ORDER BY id DESC LIMIT 5");
print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));

