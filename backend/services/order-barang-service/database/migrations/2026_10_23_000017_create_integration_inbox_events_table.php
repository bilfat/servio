<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_inbox_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('source_service', 64);
            $table->string('source_event_id', 128);
            $table->string('event_type', 100);
            $table->string('aggregate_id', 64);
            $table->char('payload_hash', 64);
            $table->json('payload_json');
            $table->string('status', 24)->default('PENDING');
            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->unsignedInteger('attempt_count')->default(0);
            $table->string('last_error', 512)->nullable();
            $table->timestamps();

            $table->unique(['source_service', 'source_event_id']);
            $table->index(['status', 'received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_inbox_events');
    }
};
