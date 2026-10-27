<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_audit_logs', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26)->nullable();
            $table->char('checkout_group_id', 26)->nullable();
            $table->string('actor_id', 64)->nullable();
            $table->string('actor_role', 40)->nullable();
            $table->string('action', 80);
            $table->json('before_state')->nullable();
            $table->json('after_state')->nullable();
            $table->string('result', 24);
            $table->string('correlation_id', 64)->nullable();
            $table->timestamp('occurred_at')->useCurrent();

            $table->index('order_id');
            $table->index('checkout_group_id');
            $table->index('action');
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_audit_logs');
    }
};
