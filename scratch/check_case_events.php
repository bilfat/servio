<?php

$pdoAfter = new PDO("mysql:host=127.0.0.1;dbname=servio_after_sales_db", "root", "");
$stmt = $pdoAfter->query("SELECT * FROM case_events WHERE case_id = '66e3ff16-afad-4669-9d09-eaa3d193abd7' ORDER BY sequence DESC LIMIT 3");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt2 = $pdoAfter->query("SELECT * FROM case_resolutions WHERE case_id = '66e3ff16-afad-4669-9d09-eaa3d193abd7'");
print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));

