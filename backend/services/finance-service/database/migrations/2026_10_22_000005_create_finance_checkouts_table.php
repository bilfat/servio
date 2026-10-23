<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_checkouts', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('checkout_group_id', 64)->unique();
            $table->string('customer_id', 64)->index();
            $table->char('currency', 3)->default('IDR');
            $table->string('status', 24)->default('QUOTED'); // QUOTED, PAYMENT_PENDING, PAID, EXPIRED, CANCELLED
            $table->bigInteger('product_subtotal_idr');
            $table->bigInteger('shipping_total_idr');
            $table->bigInteger('customer_app_fee_idr');
            $table->bigInteger('customer_tax_total_idr')->default(0);
            $table->bigInteger('discount_total_idr')->default(0);
            $table->bigInteger('customer_payable_total_idr');
            $table->json('pricing_policy_snapshot');
            $table->json('tax_snapshot');
            $table->char('checkout_payload_hash', 64);
            $table->dateTime('expires_at', 6)->nullable();
            $table->dateTime('quoted_at', 6);
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_checkouts');
    }
};
