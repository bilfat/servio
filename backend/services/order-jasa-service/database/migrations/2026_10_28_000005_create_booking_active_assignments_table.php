<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_active_assignments', function (Blueprint $table) {
            $table->char('booking_id', 26)->primary(); // Primary Key enforces max ONE active assignment per booking!
            $table->char('attempt_id', 26)->unique();
            $table->string('worker_id', 64)->index();
            $table->string('status', 32); // ASSIGNED, ACCEPTED
            $table->dateTime('assigned_at', 6);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('booking_id')->references('id')->on('service_bookings')->onDelete('cascade');
            $table->foreign('attempt_id')->references('id')->on('worker_assignment_attempts')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_active_assignments');
    }
};
