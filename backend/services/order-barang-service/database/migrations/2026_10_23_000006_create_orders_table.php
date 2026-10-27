<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('order_number', 40)->unique();
            $table->char('checkout_group_id', 26);
            $table->string('customer_id', 64);
            $table->string('merchant_org_id', 64);
            $table->json('merchant_display_snapshot');
            $table->string('address_id', 64);
            $table->json('recipient_snapshot');
            $table->json('address_snapshot');
            $table->json('origin_snapshot');
            $table->json('shipping_snapshot');
            $table->unsignedBigInteger('product_subtotal_idr');
            $table->unsignedBigInteger('shipping_customer_idr');
            $table->unsignedBigInteger('app_fee_allocated_idr')->default(0);
            $table->unsignedBigInteger('customer_tax_allocated_idr')->default(0);
            $table->unsignedBigInteger('discount_allocated_idr')->default(0);
            $table->string('discount_bearer', 12)->nullable();
            $table->unsignedBigInteger('customer_total_idr');
            $table->string('finance_allocation_reference', 64)->nullable();
            $table->string('payment_status_projection', 32)->default('PENDING');
            $table->string('status', 32)->default('CREATED');
            $table->char('active_cancellation_request_id', 26)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason_code', 64)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->foreign('checkout_group_id')->references('id')->on('checkout_groups')->onDelete('cascade');
            $table->unique(['checkout_group_id', 'merchant_org_id']);
            $table->index(['customer_id', 'status', 'created_at']);
            $table->index(['merchant_org_id', 'status', 'created_at']);
            $table->index(['checkout_group_id', 'status']);
            $table->index('delivered_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
