<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('finance_checkout_id', 26);
            $table->string('merchant_order_id', 64)->unique();
            $table->string('merchant_org_id', 64)->index();
            $table->string('customer_id', 64);
            $table->bigInteger('product_subtotal_idr');
            $table->bigInteger('shipping_customer_idr');
            $table->bigInteger('app_fee_allocated_idr');
            $table->bigInteger('customer_tax_allocated_idr')->default(0);
            $table->bigInteger('discount_allocated_idr')->default(0);
            $table->bigInteger('customer_total_idr');
            $table->bigInteger('merchant_commission_idr');
            $table->bigInteger('merchant_tax_or_withholding_idr')->default(0);
            $table->bigInteger('merchant_net_entitlement_idr');
            $table->json('fee_snapshot');
            $table->integer('allocation_rank');
            $table->string('status', 24)->default('PENDING');
            $table->timestamps(6);

            $table->foreign('finance_checkout_id')->references('id')->on('finance_checkouts')->onDelete('restrict');
            $table->unique(['finance_checkout_id', 'merchant_order_id'], 'pay_alloc_chk_mord_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
    }
};
