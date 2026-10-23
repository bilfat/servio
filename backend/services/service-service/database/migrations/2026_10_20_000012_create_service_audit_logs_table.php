<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entity_type', 40);
            $table->uuid('entity_id');
            $table->uuid('offering_id')->nullable();
            $table->uuid('actor_user_id')->nullable();
            $table->string('actor_role', 64)->nullable();
            $table->uuid('actor_org_id')->nullable();
            $table->string('action', 80);
            $table->json('safe_before')->nullable();
            $table->json('safe_after')->nullable();
            $table->text('reason')->nullable();
            $table->string('request_id', 96)->nullable();
            $table->dateTime('occurred_at', 6);
            $table->timestamps(6);

            $table->index(['entity_type', 'entity_id', 'occurred_at'], 'idx_sal_ent_occurred');
            $table->index(['actor_user_id', 'occurred_at'], 'idx_sal_actor_occurred');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_audit_logs');
    }
};
