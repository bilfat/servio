<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_audit_logs', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('actor_user_id', 64)->nullable();
            $table->string('actor_service', 48)->nullable();
            $table->string('action', 100);
            $table->string('subject_type', 48);
            $table->string('subject_id', 64);
            $table->string('result', 24); // SUCCESS, FAILURE, DENIED
            $table->json('before_state')->nullable();
            $table->json('after_state')->nullable();
            $table->string('reason_code', 64)->nullable();
            $table->string('correlation_id', 64)->nullable();
            $table->char('ip_hash', 64)->nullable();
            $table->dateTime('created_at', 6);

            $table->index(['subject_type', 'subject_id', 'created_at'], 'fin_audit_subj_idx');
            $table->index(['actor_user_id', 'created_at'], 'fin_audit_actor_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_audit_logs');
    }
};
