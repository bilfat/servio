<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'SERVIO Modul 05A — Order Barang Microservice',
        'status' => 'healthy',
        'version' => '1.0.0',
    ]);
});
