<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('payment_intent_id', 26);
            $table->string('provider', 32)->default('MOCK');
            $table->string('provider_event_id', 100);
            $table->string('event_type', 40);
            $table->bigInteger('reported_amount_idr')->nullable();
            $table->dateTime('provider_occurred_at', 6)->nullable();
            $table->dateTime('received_at', 6);
            $table->string('validation_result', 24);
            $table->json('payload');
            $table->timestamps(6);

            $table->foreign('payment_intent_id')->references('id')->on('payment_intents')->onDelete('restrict');
            $table->unique(['provider', 'provider_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_events');
    }
};
