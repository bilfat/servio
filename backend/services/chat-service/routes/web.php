<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'SERVIO Chat Service',
        'status' => 'healthy',
        'version' => '1.0.0',
    ]);
});
