<?php
require __DIR__ . '/../backend/services/finance-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/finance-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

Schema::table('refund_transactions', function (Blueprint $table) {
    $table->index('payment_allocation_id', 'refund_transactions_payment_allocation_id_idx');
});

Schema::table('refund_transactions', function (Blueprint $table) {
    $table->dropUnique('refund_alloc_scope_uq');
    $table->index(['payment_allocation_id', 'refund_reason_scope'], 'refund_alloc_scope_idx');
});

echo "Unique index dropped and regular indexes created successfully.\n";
