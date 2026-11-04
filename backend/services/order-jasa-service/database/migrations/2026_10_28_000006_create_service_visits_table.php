<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_visits', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26)->unique();
            $table->char('assignment_id', 26)->nullable();
            $table->string('worker_id', 64)->nullable()->index();
            $table->string('status', 32)->default('NOT_STARTED')->index();
            $table->dateTime('otw_at', 6)->nullable();
            $table->dateTime('arrived_at', 6)->nullable();
            $table->dateTime('diagnosis_started_at', 6)->nullable();
            $table->dateTime('diagnosis_submitted_at', 6)->nullable();
            $table->dateTime('visit_closed_at', 6)->nullable();
            $table->string('visit_close_reason', 72)->nullable();
            $table->unsignedBigInteger('version')->default(1);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->foreign('assignment_id')->references('id')->on('worker_assignment_attempts')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_visits');
    }
};
