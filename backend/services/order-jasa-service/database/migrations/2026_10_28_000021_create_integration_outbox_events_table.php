<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_outbox_events', function (Blueprint $table) {
            $table->char('event_id', 26)->primary(); // ULID strictly unique
            $table->string('aggregate_type', 64);
            $table->string('aggregate_id', 64)->index();
            $table->unsignedBigInteger('aggregate_version')->default(1);
            $table->string('event_type', 64)->index();
            $table->integer('schema_version')->default(1);
            $table->json('payload_json');
            $table->string('destination', 64);
            $table->string('status', 32)->default('PENDING')->index(); // PENDING, PROCESSING, DELIVERED, FAILED
            $table->integer('attempts')->default(0);
            $table->dateTime('next_retry_at', 6)->nullable();
            $table->string('locked_by', 64)->nullable();
            $table->dateTime('locked_until', 6)->nullable();
            $table->dateTime('delivered_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->index(['status', 'next_retry_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_outbox_events');
    }
};
