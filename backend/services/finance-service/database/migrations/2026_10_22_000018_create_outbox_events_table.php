<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outbox_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('event_id', 26)->unique();
            $table->string('event_type', 100);
            $table->string('aggregate_type', 48);
            $table->string('aggregate_id', 64);
            $table->json('payload');
            $table->unsignedSmallInteger('schema_version')->default(1);
            $table->string('dispatch_status', 24)->default('PENDING'); // PENDING, DISPATCHED, FAILED
            $table->integer('attempts')->default(0);
            $table->dateTime('next_attempt_at', 6)->nullable();
            $table->dateTime('published_at', 6)->nullable();
            $table->dateTime('created_at', 6);

            $table->index(['dispatch_status', 'next_attempt_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbox_events');
    }
};
