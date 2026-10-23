<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('withdrawal_request_id', 26);
            $table->string('provider', 32)->default('MOCK');
            $table->string('provider_event_id', 100);
            $table->string('event_type', 40);
            $table->bigInteger('reported_net_idr')->nullable();
            $table->string('validation_result', 24);
            $table->json('payload');
            $table->dateTime('received_at', 6);
            $table->timestamps(6);

            $table->foreign('withdrawal_request_id')->references('id')->on('withdrawal_requests')->onDelete('restrict');
            $table->unique(['provider', 'provider_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_events');
    }
};
