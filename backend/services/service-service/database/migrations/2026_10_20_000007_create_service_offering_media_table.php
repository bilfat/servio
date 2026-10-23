<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_offering_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('offering_id')->constrained('service_offerings')->cascadeOnDelete();
            $table->string('storage_disk', 32)->default('local');
            $table->string('storage_key', 512);
            $table->string('mime_type', 80);
            $table->unsignedBigInteger('bytes');
            $table->char('sha256', 64)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->string('storage_state', 16)->default('READY'); // PENDING, READY, FAILED
            $table->softDeletesTz('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['offering_id', 'sort_order', 'deleted_at']);
            $table->index(['storage_disk', 'storage_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_offering_media');
    }
};
