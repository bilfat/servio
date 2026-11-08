<?php
$start = microtime(true);
$res1 = file_get_contents('http://127.0.0.1:8004/api/v1/services');
$t1 = microtime(true) - $start;
$d1 = json_decode($res1, true);

$start = microtime(true);
$res2 = file_get_contents('http://127.0.0.1:8004/api/v1/services/6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd');
$t2 = microtime(true) - $start;
$d2 = json_decode($res2, true);

$start = microtime(true);
$res3 = file_get_contents('http://127.0.0.1:8004/api/v1/providers/0740d857-b665-4191-aaf5-d7dd3611dc1d/services');
$t3 = microtime(true) - $start;
$d3 = json_decode($res3, true);

echo "1. Catalog items: " . count($d1['data']['items'] ?? []) . " in " . round($t1, 3) . "s\n";
echo "   Provider name in 1st item: " . ($d1['data']['items'][0]['provider']['store_name'] ?? 'N/A') . "\n";
echo "2. Service detail in " . round($t2, 3) . "s\n";
echo "   Provider name in detail: " . ($d2['data']['provider']['store_name'] ?? 'N/A') . "\n";
echo "3. Storefront in " . round($t3, 3) . "s\n";
echo "   Provider name in storefront: " . ($d3['data']['provider']['store_name'] ?? 'N/A') . "\n";

