<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['service' => 'SERVIO Order Jasa Microservice', 'status' => 'UP']);
});
