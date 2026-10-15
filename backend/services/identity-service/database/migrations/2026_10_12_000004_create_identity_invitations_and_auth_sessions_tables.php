<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('kind', 24);
            $table->char('issuer_user_id', 36);
            $table->char('recipient_user_id', 36)->nullable();
            $table->string('recipient_email', 191);
            $table->char('organization_id', 36)->nullable();
            $table->string('target_role', 24);
            $table->char('token_hash', 64)->unique();
            $table->string('status', 24)->default('INVITED');
            $table->dateTime('expires_at', 6);
            $table->dateTime('accepted_at', 6)->nullable();
            $table->dateTime('revoked_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('issuer_user_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('recipient_user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index(['recipient_email', 'status']);
            $table->index(['organization_id', 'kind', 'status']);
        });

        // Add foreign key from memberships.invitation_id to invitations.id
        if (Schema::hasTable('memberships') && Schema::hasColumn('memberships', 'invitation_id')) {
            Schema::table('memberships', function (Blueprint $table) {
                $table->foreign('invitation_id')->references('id')->on('invitations')->onDelete('set null');
            });
        }

        Schema::create('staff_onboarding', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('staff_user_id', 36)->unique();
            $table->string('status', 32)->default('INVITED');
            $table->dateTime('completed_at', 6)->nullable();
            $table->char('created_by', 36);
            $table->dateTime('last_verified_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('staff_user_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('restrict');
        });

        Schema::create('staff_onboarding_steps', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('onboarding_id', 36);
            $table->string('step_key', 32);
            $table->string('status', 24)->default('PENDING');
            $table->char('evidence_document_id', 36)->nullable();
            $table->string('document_version', 32)->nullable();
            $table->dateTime('completed_at', 6)->nullable();
            $table->char('reviewed_by', 36)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['onboarding_id', 'step_key']);
            $table->foreign('onboarding_id')->references('id')->on('staff_onboarding')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('otp_challenges', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36)->nullable();
            $table->char('identifier_hash', 64)->index();
            $table->string('purpose', 32);
            $table->char('otp_hmac', 64);
            $table->string('status', 24)->default('ISSUED');
            $table->unsignedInteger('attempts')->default(0);
            $table->dateTime('expires_at', 6)->index();
            $table->dateTime('resend_available_at', 6)->nullable();
            $table->dateTime('consumed_at', 6)->nullable();
            $table->string('delivery_message_id', 255)->nullable();
            $table->string('delivery_state', 32)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['identifier_hash', 'purpose', 'status']);
        });

        Schema::create('password_reset_grants', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36);
            $table->char('challenge_id', 36)->nullable();
            $table->char('grant_token_hash', 64)->unique();
            $table->dateTime('expires_at', 6)->index();
            $table->dateTime('consumed_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('challenge_id')->references('id')->on('otp_challenges')->onDelete('set null');
        });

        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id', 255)->primary();
                $table->char('user_id', 36)->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        Schema::create('auth_sessions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('session_id', 255)->unique();
            $table->char('user_id', 36);
            $table->char('active_role_assignment_id', 36)->nullable();
            $table->char('active_organization_id', 36)->nullable();
            $table->string('device_name', 255)->nullable();
            $table->string('created_ip', 45)->nullable();
            $table->dateTime('last_seen_at', 6)->nullable();
            $table->dateTime('revoked_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('active_role_assignment_id')->references('id')->on('role_assignments')->onDelete('set null');
            $table->foreign('active_organization_id')->references('id')->on('organizations')->onDelete('set null');
            $table->index(['user_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('memberships') && Schema::hasColumn('memberships', 'invitation_id')) {
            Schema::table('memberships', function (Blueprint $table) {
                $table->dropForeign(['invitation_id']);
            });
        }

        Schema::dropIfExists('auth_sessions');
        Schema::dropIfExists('password_reset_grants');
        Schema::dropIfExists('otp_challenges');
        Schema::dropIfExists('staff_onboarding_steps');
        Schema::dropIfExists('staff_onboarding');
        Schema::dropIfExists('invitations');
    }
};
