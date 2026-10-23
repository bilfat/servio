<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('held_order_funds', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('payment_allocation_id', 26)->unique();
            $table->string('status', 36)->default('HELD'); // HELD, RELEASE_ELIGIBLE, RELEASED_TO_SPAY, REFUND_RESERVED, REFUNDED, HOLD_BLOCKED
            $table->bigInteger('gross_held_idr');
            $table->bigInteger('merchant_entitlement_idr');
            $table->dateTime('completed_at', 6)->nullable();
            $table->dateTime('eligible_release_at', 6)->nullable();
            $table->string('hold_reason_code', 64)->nullable();
            $table->string('hold_source', 64)->nullable();
            $table->dateTime('released_at', 6)->nullable();
            $table->dateTime('refunded_at', 6)->nullable();
            $table->bigInteger('order_event_version')->nullable();
            $table->timestamps(6);

            $table->foreign('payment_allocation_id')->references('id')->on('payment_allocations')->onDelete('restrict');
            $table->index('eligible_release_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('held_order_funds');
    }
};
