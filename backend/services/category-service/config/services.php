<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
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

    'identity' => [
        'base_url' => env('IDENTITY_INTERNAL_BASE_URL', 'http://localhost:8001'),
        'internal_key' => env('CATEGORY_INTERNAL_SERVICE_KEY'),
        'timeout_ms' => env('CATEGORY_REFERENCE_CHECK_TIMEOUT_MS', 1500),
    ],

    'gateway' => [
        'key' => env('CATEGORY_GATEWAY_KEY'),
    ],

    'internal' => [
        'consumers' => [
            'product-service' => [
                'key' => env('CATEGORY_M2M_KEY_PRODUCT_SERVICE'),
            ],
            'service-offering-service' => [
                'key' => env('CATEGORY_M2M_KEY_SERVICE_OFFERING_SERVICE'),
            ],
            'order-service' => [
                'key' => env('CATEGORY_M2M_KEY_ORDER_SERVICE'),
            ],
            'catalog-service' => [
                'key' => env('CATEGORY_M2M_KEY_CATALOG_SERVICE'),
            ],
            'cart-service' => [
                'key' => env('CATEGORY_M2M_KEY_CART_SERVICE'),
            ],
            'booking-service' => [
                'key' => env('CATEGORY_M2M_KEY_BOOKING_SERVICE'),
            ],
            'promotion-service' => [
                'key' => env('CATEGORY_M2M_KEY_PROMOTION_SERVICE'),
            ],
            'identity-service' => [
                'key' => env('CATEGORY_M2M_KEY_IDENTITY_SERVICE'),
            ],
            'category-orchestrator' => [
                'key' => env('CATEGORY_M2M_KEY_CATEGORY_ORCHESTRATOR', env('CATEGORY_M2M_KEY_ORCHESTRATOR')),
            ],
        ],
    ],

];

