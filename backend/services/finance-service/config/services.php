<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | SERVIO Upstream Microservices
    |--------------------------------------------------------------------------
    */

    'identity' => [
        'base_url' => env('IDENTITY_INTERNAL_BASE_URL', 'http://localhost:8001'),
        'internal_key' => env('SERVICE_INTERNAL_SERVICE_KEY'),
        'timeout_ms' => (float) env('SERVICE_IDENTITY_TIMEOUT_MS', 1500),
    ],

    'category' => [
        'base_url' => env('CATEGORY_INTERNAL_BASE_URL', 'http://localhost:8002'),
        'internal_key' => env('CATEGORY_M2M_KEY_SERVICE_OFFERING_SERVICE', env('CATEGORY_M2M_KEY_SERVICE', env('CATEGORY_INTERNAL_SERVICE_KEY'))),
        'timeout_ms' => (float) env('SERVICE_CATEGORY_TIMEOUT_MS', 1500),
    ],

    'gateway' => [
        'key' => env('SERVICE_GATEWAY_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authorized Internal Consumers (Machine-to-Machine)
    |--------------------------------------------------------------------------
    */

    'internal' => [
        'service_key' => env('SERVICE_INTERNAL_SERVICE_KEY'),
        'consumers' => [
            'service-order-service' => [
                'key' => env('SERVICE_M2M_KEY_SERVICE_ORDER_SERVICE'),
            ],
            'category-service' => [
                'key' => env('SERVICE_M2M_KEY_CATEGORY_SERVICE'),
            ],
            'identity-service' => [
                'key' => env('SERVICE_M2M_KEY_IDENTITY_SERVICE'),
            ],
            'after-sales-service' => [
                'key' => env('SERVICE_M2M_KEY_AFTER_SALES_SERVICE'),
            ],
            'analytics-service' => [
                'key' => env('SERVICE_M2M_KEY_ANALYTICS_SERVICE'),
            ],
        ],
    ],

];
