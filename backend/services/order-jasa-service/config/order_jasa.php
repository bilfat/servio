<?php

declare(strict_types=1);

return [
    'gateway_key' => env('ORDER_JASA_GATEWAY_KEY', env('SERVICE_GATEWAY_KEY')),
    'internal_service_key' => env('ORDER_JASA_INTERNAL_SERVICE_KEY', env('SERVICE_INTERNAL_SERVICE_KEY')),

    // Critical V2 business rules (LOCKED)
    'payment_expiry_hours' => 6, // Expiry tagihan pengerjaan Finance
    'auto_completion_hours' => 72, // 72 jam auto-completion sesudah FINISHED + PAID
    'finance_hold_hours' => 120, // 120 jam masa hold hak bersih provider sebelum AVAILABLE
    'assignment_response_minutes' => 30, // 30 menit operasional batas respons penugasan teknisi
    'remote_consent_minutes' => 30, // 30 menit batas respons approval jarak jauh pelanggan

    // External Integration Feature Gates (strictly disabled by default until verified)
    'feature_gates' => [
        'identity_worker_eligibility' => (bool) env('GATE_IDENTITY_WORKER_ELIGIBILITY', false),
        'phase04_offering_and_slot' => (bool) env('GATE_PHASE04_OFFERING_AND_SLOT', false),
        'finance_service_payment' => (bool) env('GATE_FINANCE_SERVICE_PAYMENT', false),
        'finance_service_refund_hold' => (bool) env('GATE_FINANCE_SERVICE_REFUND_HOLD', false),
        'issue_clearance_authority' => (bool) env('GATE_ISSUE_CLEARANCE_AUTHORITY', false),
        'sparepart_catalog_05a_link' => (bool) env('GATE_SPAREPART_CATALOG_05A_LINK', false),
        'media_upload_authorization' => (bool) env('GATE_MEDIA_UPLOAD_AUTHORIZATION', false),
    ],

    'services' => [
        'identity' => [
            'base_url' => env('IDENTITY_INTERNAL_BASE_URL', 'http://127.0.0.1:8001'),
            'timeout_ms' => (int) env('ORDER_JASA_IDENTITY_TIMEOUT_MS', 10000),
            'internal_key' => env('IDENTITY_INTERNAL_SERVICE_KEY', env('ORDER_JASA_INTERNAL_SERVICE_KEY')),
        ],
        'service_catalog' => [
            'base_url' => env('SERVICE_INTERNAL_BASE_URL', 'http://127.0.0.1:8004'),
            'timeout_ms' => (int) env('ORDER_JASA_CATALOG_TIMEOUT_MS', 10000),
            'internal_key' => env('SERVICE_INTERNAL_SERVICE_KEY', env('ORDER_JASA_INTERNAL_SERVICE_KEY')),
        ],
        'order_barang' => [
            'base_url' => env('ORDER_BARANG_INTERNAL_BASE_URL', 'http://127.0.0.1:8005'),
            'timeout_ms' => (int) env('ORDER_JASA_ORDER_BARANG_TIMEOUT_MS', 10000),
            'internal_key' => env('ORDER_BARANG_INTERNAL_SERVICE_KEY', env('ORDER_JASA_INTERNAL_SERVICE_KEY')),
        ],
        'finance' => [
            'base_url' => env('FINANCE_INTERNAL_BASE_URL', 'http://127.0.0.1:8006'),
            'timeout_ms' => (int) env('ORDER_JASA_FINANCE_TIMEOUT_MS', 10000),
            'internal_key' => env('FINANCE_INTERNAL_SERVICE_KEY', env('ORDER_JASA_INTERNAL_SERVICE_KEY')),
        ],
    ],
];
