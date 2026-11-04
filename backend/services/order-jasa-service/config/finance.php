<?php

return [
    'mock_payment_enabled' => env('FINANCE_MOCK_PAYMENT_ENABLED', true),
    'mock_payout_enabled' => env('FINANCE_MOCK_PAYOUT_ENABLED', true),
    'internal_service_key' => env('FINANCE_INTERNAL_SERVICE_KEY'),
    'gateway_key' => env('FINANCE_GATEWAY_KEY'),
    'step_up_secret' => env('FINANCE_STEP_UP_SECRET'),
    'platform_subsidy_enabled' => env('FINANCE_PLATFORM_SUBSIDY_ENABLED', false),
    
    'min_withdrawal_idr' => 20000,
    'mock_transfer_fee_idr' => 2500,
    'hold_duration_hours' => 120, // 5 days (120 hours) after order COMPLETED
    'payment_expiry_hours' => 6, // 6 hours expiration for QRIS / VA
    
    'services' => [
        'identity' => [
            'base_url' => env('IDENTITY_INTERNAL_BASE_URL', 'http://127.0.0.1:8001'),
            'timeout_ms' => env('FINANCE_IDENTITY_TIMEOUT_MS', 2000),
        ],
        'order' => [
            'base_url' => env('ORDER_INTERNAL_BASE_URL', 'http://127.0.0.1:8005'),
            'timeout_ms' => env('FINANCE_ORDER_TIMEOUT_MS', 2000),
        ],
    ],
];
