<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_item_claim_locks', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('source_order_id', 64);
            $table->string('source_merchant_order_id', 64)->default('');
            $table->string('source_item_ref', 64);
            $table->unsignedInteger('total_ordered_quantity')->default(1);
            $table->unsignedInteger('total_claimed_quantity')->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(
                ['source_order_id', 'source_merchant_order_id', 'source_item_ref'],
                'uniq_order_item_claim_lock'
            );
            $table->index(['source_order_id'], 'idx_claim_lock_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_claim_locks');
    }
};

