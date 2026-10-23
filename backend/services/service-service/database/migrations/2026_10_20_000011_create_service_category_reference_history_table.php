<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_category_reference_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('definition_id')->nullable()->constrained('service_definitions')->cascadeOnDelete();
            $table->foreignUuid('offering_id')->nullable()->constrained('service_offerings')->cascadeOnDelete();
            $table->uuid('category_id');
            $table->uuid('subcategory_id');
            $table->uuid('category_claim_id')->nullable();
            $table->uuid('subcategory_claim_id')->nullable();
            $table->uuid('operation_id');
            $table->dateTime('effective_from', 6);
            $table->dateTime('effective_to', 6)->nullable();
            $table->timestamps(6);

            $table->index('category_id');
            $table->index('subcategory_id');
            $table->index(['operation_id', 'definition_id'], 'idx_scrh_op_def');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_category_reference_history');
    }
};
