<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkout_groups', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('customer_id', 64);
            $table->string('address_id', 64);
            $table->json('recipient_snapshot');
            $table->json('address_snapshot');
            $table->char('selected_items_hash', 64);
            $table->string('idempotency_key', 128);
            $table->unsignedInteger('quote_revision')->default(1);
            $table->string('orchestration_status', 32)->default('PREPARING');
            $table->string('payment_status_projection', 32)->default('PENDING');
            $table->char('finance_quote_hash', 64)->nullable();
            $table->string('finance_payment_id', 64)->nullable();
            $table->unsignedBigInteger('customer_total_idr')->nullable();
            $table->char('currency', 3)->default('IDR');
            $table->timestamp('finance_expires_at')->nullable();
            $table->string('failure_code', 64)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['customer_id', 'idempotency_key']);
            $table->index(['customer_id', 'created_at']);
            $table->index(['payment_status_projection', 'finance_expires_at'], 'cg_payment_status_expires_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkout_groups');
    }
};
