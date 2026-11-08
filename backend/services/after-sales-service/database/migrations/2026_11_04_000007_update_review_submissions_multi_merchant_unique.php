<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_submissions', function (Blueprint $table) {
            // Drop old unique constraint if exists to support multi-merchant suborders
            $table->dropUnique('uniq_cust_source_review');
            // Add composite unique including suborder
            $table->index(['customer_id', 'source_kind', 'source_order_id', 'source_merchant_order_id'], 'idx_cust_source_suborder');
        });
    }

    public function down(): void
    {
        Schema::table('review_submissions', function (Blueprint $table) {
            $table->dropIndex('idx_cust_source_suborder');
            $table->unique(['customer_id', 'source_kind', 'source_order_id'], 'uniq_cust_source_review');
        });
    }
};

