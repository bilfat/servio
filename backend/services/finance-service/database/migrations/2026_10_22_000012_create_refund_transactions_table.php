<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refund_transactions', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('payment_allocation_id', 26);
            $table->char('payment_intent_id', 26);
            $table->char('customer_spay_account_id', 26)->nullable();
            $table->string('refund_reason_scope', 32)->default('ORDER_CANCELLATION_05A');
            $table->string('order_cancellation_event_id', 100)->unique();
            $table->bigInteger('requested_amount_idr');
            $table->bigInteger('funded_amount_idr')->default(0);
            $table->bigInteger('credited_amount_idr')->default(0);
            $table->string('status', 24)->default('PENDING'); // PENDING, PROCESSING, SUCCEEDED, FAILED
            $table->string('source_funding_reference', 100)->nullable();
            $table->dateTime('funded_at', 6)->nullable();
            $table->dateTime('credited_at', 6)->nullable();
            $table->string('failure_code', 64)->nullable();
            $table->timestamps(6);

            $table->foreign('payment_allocation_id')->references('id')->on('payment_allocations')->onDelete('restrict');
            $table->foreign('payment_intent_id')->references('id')->on('payment_intents')->onDelete('restrict');
            $table->foreign('customer_spay_account_id')->references('id')->on('spay_accounts')->onDelete('restrict');
            $table->unique(['payment_allocation_id', 'refund_reason_scope'], 'refund_alloc_scope_uq');
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refund_transactions');
    }
};
