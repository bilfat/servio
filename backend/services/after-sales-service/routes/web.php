<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'SERVIO After-Sales & Feedback Microservice',
        'status' => 'UP',
        'version' => '1.0.0',
    ]);
});

