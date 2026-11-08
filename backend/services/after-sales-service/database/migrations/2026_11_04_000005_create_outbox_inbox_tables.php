<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outbox_events', function (Blueprint $table) {
            $table->string('event_id', 64)->primary();
            $table->string('event_type', 128);
            $table->unsignedInteger('event_version')->default(1);
            $table->string('aggregate_type', 64);
            $table->string('aggregate_id', 64);
            $table->json('payload');
            $table->enum('status', ['PENDING', 'PUBLISHED', 'FAILED'])->default('PENDING');
            $table->unsignedInteger('retry_count')->default(0);
            $table->text('last_error')->nullable();
            $table->dateTime('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'idx_outbox_status_time');
            $table->index(['aggregate_type', 'aggregate_id'], 'idx_outbox_aggregate');
        });

        Schema::create('inbox_events', function (Blueprint $table) {
            $table->string('event_id', 64)->primary();
            $table->string('source_service', 64);
            $table->string('event_type', 128);
            $table->json('payload');
            $table->enum('status', ['RECEIVED', 'PROCESSED', 'FAILED'])->default('RECEIVED');
            $table->text('error_message')->nullable();
            $table->dateTime('processed_at')->nullable();
            $table->timestamps();

            $table->index(['source_service', 'event_type'], 'idx_inbox_source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbox_events');
        Schema::dropIfExists('outbox_events');
    }
};

