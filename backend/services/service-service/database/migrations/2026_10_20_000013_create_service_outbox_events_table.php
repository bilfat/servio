<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_outbox_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('aggregate_type', 32);
            $table->uuid('aggregate_id');
            $table->uuid('offering_id')->nullable();
            $table->string('event_type', 128);
            $table->unsignedBigInteger('aggregate_version')->default(1);
            $table->json('payload');
            $table->dateTime('occurred_at', 6);
            $table->dateTime('published_at', 6)->nullable();
            $table->integer('attempts')->default(0);
            $table->string('correlation_id', 96)->nullable();
            $table->timestamps(6);

            $table->index(['published_at', 'occurred_at'], 'idx_soe_pub_occurred');
            $table->index(['aggregate_type', 'aggregate_id', 'aggregate_version'], 'idx_soe_agg_type_id_ver');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_outbox_events');
    }
};
