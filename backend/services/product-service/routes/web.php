<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'SERVIO Product & Catalog Service',
        'status' => 'ONLINE',
        'version' => 'v1',
    ]);
});
