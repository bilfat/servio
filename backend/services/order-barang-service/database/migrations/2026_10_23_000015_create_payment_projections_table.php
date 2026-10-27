<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_projections', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('checkout_group_id', 26)->unique();
            $table->string('finance_payment_id', 64)->unique();
            $table->string('payment_status', 32);
            $table->unsignedBigInteger('amount_idr');
            $table->char('currency', 3)->default('IDR');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('finance_event_id', 64)->nullable();
            $table->unsignedInteger('finance_event_version')->nullable();
            $table->timestamp('last_verified_at')->nullable();
            $table->timestamps();

            $table->foreign('checkout_group_id')->references('id')->on('checkout_groups')->onDelete('cascade');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_projections');
    }
};
