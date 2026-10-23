<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_inbox_consumptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_service', 40);
            $table->uuid('event_id');
            $table->uuid('aggregate_id');
            $table->unsignedBigInteger('aggregate_version')->default(1);
            $table->char('payload_hash', 64);
            $table->dateTime('processed_at', 6);
            $table->timestamps(6);

            $table->unique(['source_service', 'event_id']);
            $table->index(['aggregate_id', 'aggregate_version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_inbox_consumptions');
    }
};
