<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('identity_verification_requests', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36);
            $table->string('kind', 32);
            $table->string('status', 24)->default('PENDING_REVIEW');
            $table->text('nik_ciphertext')->nullable();
            $table->char('nik_lookup_hash', 64)->nullable()->index();
            $table->char('reviewed_by', 36)->nullable();
            $table->dateTime('reviewed_at', 6)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['user_id', 'kind', 'status']);
        });

        Schema::create('identity_documents', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('verification_request_id', 36)->nullable();
            $table->string('type', 32);
            $table->string('private_storage_key', 512);
            $table->char('sha256', 64)->nullable();
            $table->string('mime', 80)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->dateTime('uploaded_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('verification_request_id')->references('id')->on('identity_verification_requests')->onDelete('cascade');
            $table->index(['verification_request_id', 'type']);
        });

        Schema::create('business_applications', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('application_code', 32)->unique();
            $table->char('applicant_user_id', 36);
            $table->string('target_role', 24);
            $table->string('status', 24)->default('DRAFT');
            $table->unsignedInteger('revision_no')->default(0);
            $table->unsignedInteger('lock_version')->default(1);
            $table->longText('draft_data_ciphertext')->nullable();
            $table->dateTime('submitted_at', 6)->nullable();
            $table->dateTime('reviewed_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('applicant_user_id')->references('id')->on('users')->onDelete('restrict');
            $table->index(['applicant_user_id', 'status']);
            $table->index(['target_role', 'status']);
        });

        // Add foreign key from organizations.approved_application_id to business_applications.id if organizations exists
        if (Schema::hasTable('organizations') && Schema::hasColumn('organizations', 'approved_application_id')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->foreign('approved_application_id')->references('id')->on('business_applications')->onDelete('set null');
            });
        }

        Schema::create('application_revisions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('application_id', 36);
            $table->unsignedInteger('revision_no');
            $table->longText('snapshot_ciphertext');
            $table->dateTime('submitted_at', 6);
            $table->char('submitted_by', 36);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['application_id', 'revision_no']);
            $table->foreign('application_id')->references('id')->on('business_applications')->onDelete('cascade');
            $table->foreign('submitted_by')->references('id')->on('users')->onDelete('restrict');
        });

        Schema::create('application_documents', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('application_id', 36);
            $table->unsignedInteger('revision_no')->default(0);
            $table->string('doc_type', 40);
            $table->string('private_storage_key', 512);
            $table->char('sha256', 64)->nullable();
            $table->string('mime', 80)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('verification_status', 24)->default('PENDING');
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('application_id')->references('id')->on('business_applications')->onDelete('cascade');
            $table->index(['application_id', 'revision_no', 'doc_type']);
        });

        Schema::create('application_decisions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('application_id', 36);
            $table->char('reviewer_user_id', 36);
            $table->string('decision', 32);
            $table->text('reason');
            $table->json('required_changes_json')->nullable();
            $table->string('from_status', 32);
            $table->string('to_status', 32);
            $table->unsignedInteger('lock_version');
            $table->dateTime('decided_at', 6);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('application_id')->references('id')->on('business_applications')->onDelete('cascade');
            $table->foreign('reviewer_user_id')->references('id')->on('users')->onDelete('restrict');
            $table->index(['application_id', 'decided_at']);
        });

        Schema::create('profile_change_requests', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36);
            $table->string('target_type', 24);
            $table->char('target_id', 36);
            $table->longText('requested_fields_ciphertext');
            $table->string('status', 32)->default('PENDING_REVIEW');
            $table->char('reviewed_by', 36)->nullable();
            $table->text('review_reason')->nullable();
            $table->dateTime('reviewed_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('organizations') && Schema::hasColumn('organizations', 'approved_application_id')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->dropForeign(['approved_application_id']);
            });
        }

        Schema::dropIfExists('profile_change_requests');
        Schema::dropIfExists('application_decisions');
        Schema::dropIfExists('application_documents');
        Schema::dropIfExists('application_revisions');
        Schema::dropIfExists('business_applications');
        Schema::dropIfExists('identity_documents');
        Schema::dropIfExists('identity_verification_requests');
    }
};
