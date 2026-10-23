<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inbox_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('source_service', 48);
            $table->string('source_event_id', 100);
            $table->string('event_type', 100);
            $table->string('aggregate_id', 64);
            $table->string('status', 24)->default('RECEIVED'); // RECEIVED, PROCESSED, FAILED
            $table->dateTime('received_at', 6);
            $table->dateTime('processed_at', 6)->nullable();
            $table->string('failure_reason', 255)->nullable();
            $table->char('payload_hash', 64);

            $table->unique(['source_service', 'source_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbox_events');
    }
};
