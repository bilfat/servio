<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_schedule_revisions', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('booking_id', 26);
            $table->integer('revision_no');
            $table->string('proposed_by_type', 32); // CUSTOMER, PROVIDER
            $table->string('proposed_by_id', 64);
            $table->dateTime('old_start_at', 6);
            $table->dateTime('old_end_at', 6);
            $table->dateTime('new_start_at', 6);
            $table->dateTime('new_end_at', 6);
            $table->text('reason');
            $table->string('status', 32)->default('PENDING')->index(); // PENDING, ACCEPTED, REJECTED, EXPIRED
            $table->dateTime('customer_decided_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('booking_id')->references('id')->on('service_bookings')->onDelete('cascade');
            $table->unique(['booking_id', 'revision_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_schedule_revisions');
    }
};
