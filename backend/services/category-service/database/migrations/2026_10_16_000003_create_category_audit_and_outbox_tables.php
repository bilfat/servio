<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_id', 96)->nullable();
            $table->uuid('actor_user_id')->nullable();
            $table->string('actor_role', 64)->nullable();
            $table->uuid('actor_org_id')->nullable();
            $table->string('action', 80);
            $table->string('entity_type', 40);
            $table->uuid('entity_id');
            $table->json('old_safe_snapshot')->nullable();
            $table->json('new_safe_snapshot')->nullable();
            $table->text('reason')->nullable();
            $table->dateTime('occurred_at', 6);
            $table->string('correlation_id', 96)->nullable();

            $table->index(['entity_type', 'entity_id', 'occurred_at'], 'ix_audit_entity_occurred');
            $table->index(['actor_user_id', 'occurred_at'], 'ix_audit_actor_occurred');
            $table->index(['action', 'occurred_at'], 'ix_audit_action_occurred');
        });

        Schema::create('category_outbox_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_type', 128);
            $table->string('aggregate_type', 32);
            $table->uuid('aggregate_id');
            $table->unsignedBigInteger('aggregate_version');
            $table->json('payload');
            $table->string('correlation_id', 96)->nullable();
            $table->dateTime('occurred_at', 6);
            $table->dateTime('published_at', 6)->nullable();
            $table->smallInteger('attempts')->default(0);
            $table->timestamps(6);

            $table->index(['published_at', 'occurred_at'], 'ix_outbox_pub_occurred');
            $table->index(['aggregate_type', 'aggregate_id', 'aggregate_version'], 'ix_outbox_agg_version');
        });

        Schema::create('category_idempotency_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('actor_user_id');
            $table->string('idempotency_key', 191);
            $table->char('request_hash', 64);
            $table->smallInteger('response_status');
            $table->json('response_body');
            $table->dateTime('expires_at', 6);
            $table->timestamps(6);

            $table->unique(['actor_user_id', 'idempotency_key'], 'uk_idempotency_actor_key');
            $table->index(['expires_at'], 'ix_idempotency_expires');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_idempotency_records');
        Schema::dropIfExists('category_outbox_events');
        Schema::dropIfExists('category_audit_logs');
    }
};
