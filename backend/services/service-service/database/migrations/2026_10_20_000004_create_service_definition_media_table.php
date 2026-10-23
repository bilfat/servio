<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_definition_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('definition_id')->constrained('service_definitions')->cascadeOnDelete();
            $table->string('storage_disk', 32)->default('local');
            $table->string('storage_key', 512);
            $table->string('mime_type', 80);
            $table->unsignedBigInteger('bytes');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->string('storage_state', 16)->default('READY'); // PENDING, READY, FAILED
            $table->softDeletesTz('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['definition_id', 'sort_order']);
            $table->index(['storage_disk', 'storage_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_definition_media');
    }
};
