<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_intents', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('finance_checkout_id', 26);
            $table->string('method', 12); // QRIS, VA
            $table->string('provider', 32)->default('MOCK');
            $table->string('provider_reference', 100)->unique();
            $table->json('instruction_payload');
            $table->bigInteger('amount_idr');
            $table->char('currency', 3)->default('IDR');
            $table->string('status', 32)->default('PENDING'); // PENDING, PAID, FAILED, EXPIRED, PARTIALLY_REFUNDED, REFUNDED
            $table->dateTime('issued_at', 6);
            $table->dateTime('expires_at', 6);
            $table->dateTime('paid_at', 6)->nullable();
            $table->string('last_provider_event_id', 100)->nullable();
            $table->tinyInteger('is_active')->default(1);
            $table->timestamps(6);

            $table->foreign('finance_checkout_id')->references('id')->on('finance_checkouts')->onDelete('restrict');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_intents');
    }
};
