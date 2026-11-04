<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_executions', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26)->unique();
            $table->char('visit_id', 26);
            $table->char('diagnosis_version_id', 26);
            $table->char('consent_id', 26);
            $table->string('worker_id', 64)->index();
            $table->string('status', 32)->default('NOT_STARTED')->index(); // NOT_STARTED, IN_PROGRESS, WORKER_FINISHED
            $table->dateTime('started_at', 6)->nullable();
            $table->dateTime('finished_at', 6)->nullable();
            $table->text('summary')->nullable();
            $table->text('test_result')->nullable();
            $table->json('actual_part_usage_json')->nullable();
            $table->dateTime('completion_evidence_validated_at', 6)->nullable();
            $table->unsignedBigInteger('version')->default(1);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->foreign('visit_id')->references('id')->on('service_visits')->onDelete('cascade');
            $table->foreign('diagnosis_version_id')->references('id')->on('diagnosis_versions')->onDelete('cascade');
            $table->foreign('consent_id')->references('id')->on('customer_consents')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_executions');
    }
};
