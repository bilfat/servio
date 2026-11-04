<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('worker_assignment_attempts', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('booking_id', 26);
            $table->char('order_id', 26);
            $table->integer('attempt_no');
            $table->string('worker_id', 64)->index();
            $table->string('provider_org_id', 64)->index();
            $table->string('status', 32)->default('ASSIGNED')->index(); // ASSIGNED, ACCEPTED, REJECTED, EXPIRED, CANCELLED
            $table->string('assigned_by_id', 64);
            $table->dateTime('assigned_at', 6);
            $table->dateTime('response_due_at', 6);
            $table->dateTime('accepted_at', 6)->nullable();
            $table->dateTime('rejected_at', 6)->nullable();
            $table->string('rejection_reason_code', 72)->nullable();
            $table->text('rejection_notes')->nullable();
            $table->string('expiry_reason', 72)->nullable();
            $table->json('worker_capability_snapshot')->nullable();
            $table->json('worker_membership_snapshot')->nullable();
            $table->unsignedBigInteger('version')->default(1);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('booking_id')->references('id')->on('service_bookings')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->unique(['booking_id', 'attempt_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_assignment_attempts');
    }
};
