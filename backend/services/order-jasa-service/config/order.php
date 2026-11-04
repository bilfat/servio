<?php

declare(strict_types=1);

return [
    'gateway_key' => env('ORDER_GATEWAY_KEY', env('SERVICE_GATEWAY_KEY')),
    'internal_service_key' => env('ORDER_INTERNAL_SERVICE_KEY', env('SERVICE_INTERNAL_SERVICE_KEY')),

    // Critical business rules
    'payment_expiry_hours' => 6,
    'auto_completion_hours' => 72, // Strictly 72 hours post DELIVERED
    'finance_hold_hours' => 120, // 120 hours post COMPLETED (managed by Finance)
    'cancellation_sla_operational_hours' => 12, // 12 operational hours SLA for Merchant response

    'services' => [
        'identity' => [
            'base_url' => env('IDENTITY_INTERNAL_BASE_URL', 'http://127.0.0.1:8001'),
            'timeout_ms' => (int) env('ORDER_IDENTITY_TIMEOUT_MS', 10000),
            'internal_key' => env('IDENTITY_INTERNAL_SERVICE_KEY', env('ORDER_INTERNAL_SERVICE_KEY')),
        ],
        'product' => [
            'base_url' => env('PRODUCT_INTERNAL_BASE_URL', 'http://127.0.0.1:8003'),
            'timeout_ms' => (int) env('ORDER_PRODUCT_TIMEOUT_MS', 10000),
            'internal_key' => env('PRODUCT_INTERNAL_SERVICE_KEY', env('ORDER_INTERNAL_SERVICE_KEY')),
            'reservation_contract_available' => (bool) env('ORDER_PRODUCT_RESERVATION_AVAILABLE', true),
        ],
        'finance' => [
            'base_url' => env('FINANCE_INTERNAL_BASE_URL', 'http://127.0.0.1:8006'),
            'timeout_ms' => (int) env('ORDER_FINANCE_TIMEOUT_MS', 10000),
            'internal_key' => env('FINANCE_INTERNAL_SERVICE_KEY', env('ORDER_INTERNAL_SERVICE_KEY')),
        ],
        'dispute' => [
            'base_url' => env('DISPUTE_INTERNAL_BASE_URL', 'http://127.0.0.1:8007'),
            'timeout_ms' => (int) env('ORDER_DISPUTE_TIMEOUT_MS', 2500),
            'internal_key' => env('DISPUTE_INTERNAL_SERVICE_KEY', env('ORDER_INTERNAL_SERVICE_KEY')),
            'contract_status' => env('ORDER_DISPUTE_CONTRACT_STATUS', 'PENDING_CONTRACT'),
        ],
    ],
];
