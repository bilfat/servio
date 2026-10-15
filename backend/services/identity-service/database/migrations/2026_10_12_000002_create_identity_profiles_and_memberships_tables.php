<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->char('user_id', 36)->primary();
            $table->string('display_name', 160);
            $table->string('photo_path', 512)->nullable();
            $table->string('employee_id', 40)->nullable()->unique();
            $table->string('department', 100)->nullable();
            $table->string('locale', 12)->default('id_ID');
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('organization_profiles', function (Blueprint $table) {
            $table->char('organization_id', 36)->primary();
            $table->string('legal_name', 190)->index();
            $table->string('display_name', 190);
            $table->string('business_email', 191)->nullable();
            $table->string('business_phone', 20)->nullable();
            $table->json('address_json')->nullable();
            $table->text('nib_ciphertext')->nullable();
            $table->char('nib_lookup_hash', 64)->nullable()->index();
            $table->text('npwp_ciphertext')->nullable();
            $table->char('npwp_lookup_hash', 64)->nullable()->index();
            $table->json('specialization_json')->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        Schema::create('memberships', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36);
            $table->char('organization_id', 36);
            $table->string('kind', 24);
            $table->string('status', 24)->default('ACTIVE');
            $table->char('invitation_id', 36)->nullable();
            $table->dateTime('started_at', 6)->nullable();
            $table->dateTime('ended_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('restrict');
            $table->index(['organization_id', 'status']);
            $table->index(['user_id', 'status']);
        });

        // Add generated column and unique constraint for active worker guard on MySQL
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE memberships ADD COLUMN active_worker_guard TINYINT GENERATED ALWAYS AS (CASE WHEN kind = 'WORKER' AND status = 'ACTIVE' THEN 1 ELSE NULL END) STORED");
            DB::statement("ALTER TABLE memberships ADD UNIQUE KEY memberships_one_active_provider_worker (user_id, active_worker_guard)");
        }

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->char('role_id', 36);
            $table->char('permission_id', 36);
            $table->dateTime('created_at', 6)->nullable();

            $table->primary(['role_id', 'permission_id']);
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
        });

        Schema::create('role_assignments', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36);
            $table->char('role_id', 36);
            $table->char('membership_id', 36)->nullable();
            $table->string('status', 24)->default('ACTIVE');
            $table->char('assigned_by', 36)->nullable();
            $table->dateTime('assigned_at', 6)->nullable();
            $table->dateTime('revoked_at', 6)->nullable();
            $table->text('reason')->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('restrict');
            $table->foreign('membership_id')->references('id')->on('memberships')->onDelete('restrict');
            $table->foreign('assigned_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['user_id', 'status']);
        });

        Schema::create('external_auth_identities', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('user_id', 36);
            $table->string('provider', 24);
            $table->string('provider_subject', 191);
            $table->string('provider_email', 191)->nullable();
            $table->dateTime('email_verified_at', 6)->nullable();
            $table->dateTime('linked_at', 6)->nullable();
            $table->dateTime('unlinked_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['provider', 'provider_subject']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_auth_identities');
        Schema::dropIfExists('role_assignments');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('memberships');
        Schema::dropIfExists('organization_profiles');
        Schema::dropIfExists('user_profiles');
    }
};
