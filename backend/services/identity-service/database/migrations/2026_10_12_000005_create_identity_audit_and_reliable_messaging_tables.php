<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('actor_user_id', 36)->nullable();
            $table->string('event_code', 100);
            $table->string('target_type', 64)->nullable();
            $table->char('target_id', 36)->nullable();
            $table->string('result', 24)->default('SUCCESS');
            $table->char('ip_hash', 64)->nullable();
            $table->char('user_agent_hash', 64)->nullable();
            $table->string('request_id', 64)->nullable();
            $table->json('safe_metadata')->nullable();
            $table->dateTime('occurred_at', 6);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('actor_user_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['event_code', 'occurred_at']);
        });

        Schema::create('idempotency_records', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('actor_user_id', 36)->nullable();
            $table->string('actor_bucket', 128);
            $table->string('scope', 128);
            $table->string('idempotency_key', 191);
            $table->char('request_hash', 64);
            $table->smallInteger('response_status');
            $table->json('response_json')->nullable();
            $table->dateTime('expires_at', 6)->index();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['scope', 'actor_bucket', 'idempotency_key'], 'idempotency_scope_actor_key_unique');
            $table->foreign('actor_user_id')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('outbox_events', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('aggregate_type', 64);
            $table->char('aggregate_id', 36)->index();
            $table->string('event_type', 160)->index();
            $table->unsignedInteger('schema_version')->default(1);
            $table->json('payload_json');
            $table->dateTime('occurred_at', 6)->index();
            $table->dateTime('published_at', 6)->nullable()->index();
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
        });

        Schema::create('inbox_consumptions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('consumer_name', 64);
            $table->string('source_event_id', 64);
            $table->dateTime('processed_at', 6);
            $table->string('status', 24)->default('PROCESSED');
            $table->string('error_code', 64)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['consumer_name', 'source_event_id'], 'inbox_consumptions_consumer_name_source_event_id_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbox_consumptions');
        Schema::dropIfExists('outbox_events');
        Schema::dropIfExists('idempotency_records');
        Schema::dropIfExists('audit_logs');
    }
};
