<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_policy_targets', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('version_id', 26);
            $table->string('policy_code', 64);
            $table->string('scope', 24)->default('PRODUCT');
            $table->string('payer_type', 24); // CUSTOMER, MERCHANT
            $table->string('fee_type', 20); // FIXED, PERCENTAGE
            $table->bigInteger('fixed_amount_idr')->nullable();
            $table->decimal('percentage_rate', 12, 6)->nullable();
            $table->string('charge_scope', 32); // CHECKOUT, MERCHANT_ORDER
            $table->string('calculation_base', 48); // CHECKOUT_ELIGIBLE_SUBTOTAL, MERCHANT_PRODUCT_SUBTOTAL
            $table->string('rounding_method', 24)->default('HALF_UP');
            $table->bigInteger('min_fee_idr')->nullable();
            $table->bigInteger('max_fee_idr')->nullable();
            $table->timestamps(6);

            $table->foreign('version_id')->references('id')->on('fee_policy_versions')->onDelete('cascade');
            $table->unique(['version_id', 'policy_code', 'scope']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_policy_targets');
    }
};
