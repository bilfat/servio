<?php

return [
    'gateway_key' => env('AFTER_SALES_GATEWAY_KEY', env('APP_ENV') === 'production' ? null : 'servio_local_gateway_key_2026'),
    'internal_service_key' => env('AFTER_SALES_INTERNAL_SERVICE_KEY', env('APP_ENV') === 'production' ? null : 'servio_local_internal_service_key_2026'),

    'sla' => [
        'initial_response_hours' => 72,
    ],

    's2s' => [
        '05A' => env('S2S_ORDER_BARANG_KEY', env('APP_ENV') === 'production' ? null : 'servio_s2s_order_barang_secret_2026'),
        '05B' => env('S2S_ORDER_JASA_KEY', env('APP_ENV') === 'production' ? null : 'servio_s2s_order_jasa_secret_2026'),
        '06' => env('S2S_FINANCE_KEY', env('APP_ENV') === 'production' ? null : 'servio_s2s_finance_secret_2026'),
        '09' => env('S2S_SUPPORT_KEY', env('APP_ENV') === 'production' ? null : 'servio_s2s_support_secret_2026'),
    ],

    'services' => [
        'identity' => [
            'base_url' => env('IDENTITY_INTERNAL_BASE_URL', 'http://127.0.0.1:8001'),
            'internal_key' => env('IDENTITY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'category' => [
            'base_url' => env('CATEGORY_INTERNAL_BASE_URL', 'http://127.0.0.1:8002'),
            'internal_key' => env('CATEGORY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'product' => [
            'base_url' => env('PRODUCT_INTERNAL_BASE_URL', 'http://127.0.0.1:8003'),
            'internal_key' => env('PRODUCT_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'service' => [
            'base_url' => env('SERVICE_INTERNAL_BASE_URL', 'http://127.0.0.1:8004'),
            'internal_key' => env('SERVICE_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'order_barang' => [
            'base_url' => env('ORDER_BARANG_INTERNAL_BASE_URL', 'http://127.0.0.1:8005'),
            'internal_key' => env('ORDER_BARANG_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'finance' => [
            'base_url' => env('FINANCE_INTERNAL_BASE_URL', 'http://127.0.0.1:8006'),
            'internal_key' => env('FINANCE_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'order_jasa' => [
            'base_url' => env('ORDER_JASA_INTERNAL_BASE_URL', 'http://127.0.0.1:8007'),
            'internal_key' => env('ORDER_JASA_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'support' => [
            'base_url' => env('SUPPORT_INTERNAL_BASE_URL', 'http://127.0.0.1:8009'),
            'internal_key' => env('SUPPORT_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
        'notification' => [
            'base_url' => env('NOTIFICATION_INTERNAL_BASE_URL', 'http://127.0.0.1:8010'),
            'internal_key' => env('NOTIFICATION_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ],
    ],
];

