<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_order_events', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->unsignedInteger('sequence_no');
            $table->string('event_type', 64)->index();
            $table->string('actor_type', 32); // CUSTOMER, WORKER, PROVIDER, FINANCE, ADMIN, SYSTEM
            $table->string('actor_id', 64);
            $table->string('from_state', 32)->nullable();
            $table->string('to_state', 32)->nullable();
            $table->json('metadata_json')->nullable();
            $table->dateTime('occurred_at', 6);

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->unique(['order_id', 'sequence_no']);
            $table->index(['event_type', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_order_events');
    }
};
