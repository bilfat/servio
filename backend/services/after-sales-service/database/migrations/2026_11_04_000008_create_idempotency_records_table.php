<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('idempotency_records')) {
            Schema::create('idempotency_records', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('scope_key', 255)->unique();
                $table->string('payload_hash', 64);
                $table->unsignedSmallInteger('response_status')->nullable();
                $table->json('response_headers_json')->nullable();
                $table->json('response_body_json')->nullable();
                $table->string('status', 32)->default('IN_FLIGHT'); // IN_FLIGHT, COMPLETED, FAILED
                $table->timestamp('locked_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_records');
    }
};

