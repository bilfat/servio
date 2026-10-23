<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_idempotency_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('actor_key', 128);
            $table->string('route_key', 128);
            $table->string('idempotency_key', 191);
            $table->char('request_hash', 64);
            $table->smallInteger('response_status');
            $table->json('response_body');
            $table->dateTime('expires_at', 6);
            $table->timestamps(6);

            $table->unique(['actor_key', 'route_key', 'idempotency_key'], 'idemp_actor_route_key_unique');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_idempotency_records');
    }
};
