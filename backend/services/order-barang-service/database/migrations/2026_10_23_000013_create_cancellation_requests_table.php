<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cancellation_requests', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->string('requested_by_id', 64);
            $table->string('reason_code', 64);
            $table->string('reason_note', 1000)->nullable();
            $table->string('status', 24)->default('PENDING');
            $table->timestamp('requested_at')->useCurrent();
            $table->dateTime('response_deadline_at');
            $table->string('merchant_schedule_source', 64)->default('IDENTITY_01_OFFICIAL');
            $table->string('merchant_schedule_version', 64)->nullable();
            $table->string('merchant_timezone', 64)->default('Asia/Jakarta');
            $table->json('operational_schedule_snapshot');
            $table->dateTime('decided_at')->nullable();
            $table->string('decision_source', 32)->nullable();
            $table->string('decision_actor_id', 64)->nullable();
            $table->string('decision_reason', 64)->nullable();
            $table->string('decision_note', 1000)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->index(['status', 'response_deadline_at']);
            $table->index(['order_id', 'requested_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cancellation_requests');
    }
};
