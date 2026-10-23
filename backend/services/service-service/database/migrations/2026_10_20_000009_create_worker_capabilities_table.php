<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('worker_capabilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('worker_user_id');            // External Identity user ID, no FK
            $table->uuid('provider_organization_id');   // External Identity org ID, no FK
            $table->foreignUuid('capability_id')->constrained('capabilities')->cascadeOnDelete();
            $table->string('status', 16)->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->uuid('recorded_by_user_id')->nullable();
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->dateTime('recorded_at', 6)->nullable();
            $table->softDeletesTz('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['provider_organization_id', 'worker_user_id', 'status'], 'idx_wc_prov_worker_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_capabilities');
    }
};
