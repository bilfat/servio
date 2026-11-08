<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solution_proposals', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('case_id', 36);
            $table->unsignedInteger('proposal_version');
            $table->enum('proposal_type', ['CUSTOMER_CHOICE', 'ACCEPTED_CHOICE', 'ALTERNATIVE', 'REJECTION']);
            $table->enum('solution_code', ['REPLACEMENT', 'REWORK', 'REFUND', 'REPAIR_GOODS'])->nullable();
            $table->text('reason')->nullable();
            $table->enum('proposed_by_actor_kind', ['CUSTOMER', 'MERCHANT', 'PROVIDER', 'ADMIN']);
            $table->string('proposed_by_id', 64);
            $table->enum('state', ['PENDING_CONSENT', 'ACCEPTED', 'DECLINED', 'SUPERSEDED'])->default('PENDING_CONSENT');
            $table->dateTime('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->onDelete('cascade');
            $table->unique(['case_id', 'proposal_version'], 'uniq_case_proposal_ver');
        });

        Schema::create('customer_solution_consents', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('proposal_id', 36);
            $table->string('case_id', 36);
            $table->string('customer_id', 64);
            $table->enum('decision', ['ACCEPT', 'DECLINE']);
            $table->text('reason')->nullable();
            $table->dateTime('decided_at');
            $table->string('idempotency_key', 64)->nullable();
            $table->timestamps();

            $table->foreign('proposal_id')->references('id')->on('solution_proposals')->onDelete('cascade');
            $table->foreign('case_id')->references('id')->on('after_sales_cases')->onDelete('cascade');
            $table->unique(['proposal_id', 'customer_id'], 'uniq_proposal_customer_consent');
        });

        Schema::create('case_resolutions', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('case_id', 36)->unique();
            $table->enum('solution_code', ['REPLACEMENT', 'REWORK', 'REFUND', 'REPAIR_GOODS']);
            $table->dateTime('agreed_at');
            $table->dateTime('agreed_by_customer_at')->nullable();
            $table->enum('status', ['NOT_STARTED', 'IN_PROGRESS', 'VERIFIED_DONE', 'FAILED', 'ON_HOLD'])->default('NOT_STARTED');
            $table->string('evidence_ref', 255)->nullable();
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->onDelete('cascade');
        });

        Schema::create('case_external_refs', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('case_id', 36);
            $table->string('resolution_id', 36)->nullable();
            $table->enum('target_service', ['05A', '05B', '06', '09']);
            $table->string('external_id', 64);
            $table->enum('purpose', ['REPLACEMENT_FULFILLMENT', 'WARRANTY_JOB', 'REFUND_DECISION', 'SUPPORT_DISPUTE']);
            $table->string('external_status', 64);
            $table->dateTime('last_checked_at')->nullable();
            $table->string('last_event_id', 64)->nullable();
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->onDelete('cascade');
            $table->index(['target_service', 'external_id'], 'idx_external_ref');
            $table->index(['case_id', 'purpose'], 'idx_case_purpose');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_external_refs');
        Schema::dropIfExists('case_resolutions');
        Schema::dropIfExists('customer_solution_consents');
        Schema::dropIfExists('solution_proposals');
    }
};

