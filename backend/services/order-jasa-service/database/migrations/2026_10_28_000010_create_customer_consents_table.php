<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_consents', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->char('diagnosis_version_id', 26);
            $table->string('method', 32); // CUSTOMER_REMOTE, WORKER_RECORDED_IN_PERSON
            $table->string('decision', 32); // APPROVED, REJECTED, WITHDRAWN, INVALIDATED
            $table->string('recorded_by_type', 32); // CUSTOMER, WORKER
            $table->string('recorded_by_id', 64);
            $table->string('customer_id', 64)->index();
            $table->boolean('statement_acknowledged')->default(false);
            $table->boolean('customer_present_reported')->default(false);
            $table->dateTime('submitted_at', 6);
            $table->dateTime('remote_due_at', 6)->nullable();
            $table->string('price_snapshot_hash', 64)->nullable();
            $table->json('client_context_json')->nullable();
            $table->string('issue_reference', 64)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->foreign('diagnosis_version_id')->references('id')->on('diagnosis_versions')->onDelete('cascade');
            $table->index(['order_id', 'diagnosis_version_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_consents');
    }
};
