<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_records', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('actor_scope', 128);
            $table->string('operation', 64);
            $table->string('key_hash', 64);
            $table->string('request_hash', 64);
            $table->integer('response_status')->default(0);
            $table->longText('response_body_redacted')->nullable();
            $table->string('state', 32)->default('PROCESSING'); // PROCESSING, COMPLETED, FAILED_RETRYABLE, RECONCILIATION_REQUIRED
            $table->string('recovery_state', 64)->nullable();
            $table->string('lease_token', 64)->nullable();
            $table->unsignedBigInteger('fencing_version')->default(1);
            $table->unsignedInteger('payload_size_bytes')->default(0);
            $table->dateTime('expires_at', 6);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['actor_scope', 'operation', 'key_hash']);
            $table->index(['state']);
            $table->index(['expires_at']);
            $table->index(['lease_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_records');
    }
};
