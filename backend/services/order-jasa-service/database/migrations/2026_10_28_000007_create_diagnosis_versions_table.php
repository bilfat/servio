<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnosis_versions', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->char('visit_id', 26);
            $table->integer('version_no');
            $table->string('status', 32)->default('DRAFT')->index(); // DRAFT, SUBMITTED, SUPERSEDED
            $table->string('worker_id', 64)->index();
            $table->text('initial_condition')->nullable();
            $table->text('findings');
            $table->text('suspected_cause')->nullable();
            $table->text('recommended_actions')->nullable();
            $table->text('safety_notes')->nullable();
            $table->json('diagnosis_photo_refs')->nullable();
            $table->unsignedBigInteger('work_subtotal_idr')->default(0);
            $table->unsignedBigInteger('provider_part_subtotal_idr')->default(0);
            $table->unsignedBigInteger('service_total_base_idr')->default(0);
            $table->string('currency', 3)->default('IDR');
            $table->string('price_snapshot_hash', 64)->nullable();
            $table->dateTime('submitted_at', 6)->nullable();
            $table->dateTime('published_to_customer_at', 6)->nullable();
            $table->dateTime('remote_response_due_at', 6)->nullable();
            $table->json('client_visibility_evidence_json')->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->foreign('visit_id')->references('id')->on('service_visits')->onDelete('cascade');
            $table->unique(['order_id', 'version_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnosis_versions');
    }
};
