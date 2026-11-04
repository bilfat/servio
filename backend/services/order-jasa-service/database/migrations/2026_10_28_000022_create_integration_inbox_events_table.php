<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_inbox_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('producer', 64);
            $table->string('source_event_id', 64);
            $table->string('event_type', 64)->index();
            $table->integer('schema_version')->default(1);
            $table->string('payload_hash', 64);
            $table->string('processing_status', 32)->default('PENDING')->index(); // PENDING, PROCESSED, FAILED, IGNORED
            $table->text('last_error')->nullable();
            $table->dateTime('received_at', 6);
            $table->dateTime('processed_at', 6)->nullable();

            $table->unique(['producer', 'source_event_id']); // Strictly prevents duplicate external events
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_inbox_events');
    }
};
