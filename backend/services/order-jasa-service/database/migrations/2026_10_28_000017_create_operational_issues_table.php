<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operational_issues', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('issue_no', 48)->unique();
            $table->char('order_id', 26);
            $table->string('reported_by_role', 32); // CUSTOMER, WORKER, PROVIDER, ADMIN
            $table->string('reported_by_id', 64);
            $table->string('issue_kind', 32); // PAYMENT, CONSENT, NO_SHOW, SAFETY, WORK_QUALITY, OTHER
            $table->string('status', 32)->default('OPEN')->index(); // OPEN, REQUIRES_REVIEW, RESOLVED
            $table->text('description');
            $table->json('evidence_refs')->nullable();
            $table->boolean('affects_completion')->default(true);
            $table->boolean('affects_funds')->default(true);
            $table->string('authority_ref', 64)->nullable();
            $table->string('resolution_code', 72)->nullable();
            $table->dateTime('resolved_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operational_issues');
    }
};
