<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('email', 191)->nullable()->unique();
            $table->string('phone_e164', 20)->nullable()->unique();
            $table->string('password_hash', 255)->nullable();
            $table->string('status', 32)->default('PENDING')->index();
            $table->unsignedBigInteger('authz_version')->default(1);
            $table->dateTime('email_verified_at', 6)->nullable();
            $table->dateTime('phone_verified_at', 6)->nullable();
            $table->dateTime('last_login_at', 6)->nullable();
            $table->dateTime('suspended_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('code', 64)->unique();
            $table->string('name', 100);
            $table->boolean('is_system')->default(true);
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('code', 128)->unique();
            $table->string('resource', 64);
            $table->string('action', 32);
            $table->string('scope_type', 24)->default('OWN');
            $table->string('owner_service', 40)->default('identity-service');
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
            $table->index(['owner_service', 'resource']);
        });

        Schema::create('organizations', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('type', 24);
            $table->string('status', 24)->default('ACTIVE');
            $table->char('approved_application_id', 36)->nullable()->unique();
            $table->dateTime('activated_at', 6)->nullable();
            $table->dateTime('deactivated_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
            $table->index(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('users');
    }
};
