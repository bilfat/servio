<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_policy_versions', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('group_id', 26);
            $table->unsignedInteger('version_no');
            $table->string('status', 24)->default('DRAFT'); // DRAFT, SCHEDULED, ACTIVE, HISTORICAL, INACTIVE
            $table->dateTime('effective_from', 6)->nullable();
            $table->dateTime('effective_until', 6)->nullable();
            $table->text('change_reason');
            $table->string('created_by_user_id', 64);
            $table->string('published_by_user_id', 64)->nullable();
            $table->dateTime('published_at', 6)->nullable();
            $table->char('snapshot_hash', 64)->nullable();
            $table->timestamps(6);

            $table->foreign('group_id')->references('id')->on('fee_policy_groups')->onDelete('restrict');
            $table->unique(['group_id', 'version_no']);
            $table->index(['status', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_policy_versions');
    }
};
