<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->string('previous_status', 32)->nullable();
            $table->string('new_status', 32);
            $table->string('action', 80);
            $table->string('actor_id', 64)->nullable();
            $table->string('actor_role', 40)->nullable();
            $table->string('source_service', 40)->default('ORDER_05A');
            $table->string('reason_code', 64)->nullable();
            $table->string('reason_note', 1000)->nullable();
            $table->string('related_event_id', 64)->nullable();
            $table->unsignedInteger('order_version')->default(1);
            $table->timestamp('occurred_at')->useCurrent();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->index(['order_id', 'occurred_at']);
            $table->index(['source_service', 'related_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_histories');
    }
};
