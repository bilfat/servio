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
        'service_key' => env('CATEGORY_INTERNAL_SERVICE_KEY'),
        'allowed_consumers' => [
            'product-service',
            'service-offering-service',
            'order-service',
            'catalog-service',
            'cart-service',
            'booking-service',
            'promotion-service',
        ],
    ],

];

