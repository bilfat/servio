<?php

$opts = ['http' => ['ignore_errors' => true]];
$ctx = stream_context_create($opts);

$endpoints = ['/chat', '/provider/chat', '/worker/chat', '/merchant/chat'];

foreach ($endpoints as $ep) {
    $url = "http://localhost:3000" . $ep;
    $res = @file_get_contents($url, false, $ctx);
    echo "URL: $url\n";
    echo "STATUS: " . ($http_response_header[0] ?? 'NO RESPONSE') . "\n";
    if (strpos($http_response_header[0] ?? '', '500') !== false) {
        echo "BODY SNIPPET: " . substr(strip_tags($res), 0, 500) . "\n";
    }
    echo "----------------------------------------\n";
}

