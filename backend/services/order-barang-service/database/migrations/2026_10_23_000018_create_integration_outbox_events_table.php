<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_outbox_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('destination_service', 64);
            $table->string('event_type', 100);
            $table->string('aggregate_type', 64);
            $table->string('aggregate_id', 64);
            $table->unsignedInteger('aggregate_version')->default(1);
            $table->json('payload_json');
            $table->string('status', 24)->default('PENDING');
            $table->timestamp('available_at')->useCurrent();
            $table->unsignedInteger('attempt_count')->default(0);
            $table->timestamp('next_attempt_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->string('last_error', 512)->nullable();
            $table->string('correlation_id', 64);
            $table->timestamps();

            $table->index(['status', 'next_attempt_at']);
            $table->index(['aggregate_type', 'aggregate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_outbox_events');
    }
};
