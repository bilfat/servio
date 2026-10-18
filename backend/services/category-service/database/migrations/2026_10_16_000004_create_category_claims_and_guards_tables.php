<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_delete_guards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('node_type', 16);
            $table->uuid('node_id');
            $table->unsignedBigInteger('fence_generation')->default(1);
            $table->dateTime('fenced_at', 6);
            $table->dateTime('released_at', 6)->nullable();
            $table->json('reference_check_evidence')->nullable();
            $table->timestamps(6);

            $table->unique(['node_type', 'node_id'], 'uk_delete_guard_node');
            $table->index(['released_at'], 'ix_delete_guard_released');
        });

        Schema::create('category_reference_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('consumer_service', 40);
            $table->string('consumer_reference_id', 128);
            $table->string('state', 32)->default('ACTIVE');
            $table->timestamps(6);

            $table->unique(['consumer_service', 'consumer_reference_id', 'category_id'], 'uk_cat_claim');
            $table->index(['category_id', 'state'], 'ix_cat_claim_state');
        });

        Schema::create('subcategory_reference_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('subcategory_id')->constrained('subcategories')->restrictOnDelete();
            $table->string('consumer_service', 40);
            $table->string('consumer_reference_id', 128);
            $table->string('state', 32)->default('ACTIVE');
            $table->timestamps(6);

            $table->unique(['consumer_service', 'consumer_reference_id', 'subcategory_id'], 'uk_subcat_claim');
            $table->index(['subcategory_id', 'state'], 'ix_subcat_claim_state');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subcategory_reference_claims');
        Schema::dropIfExists('category_reference_claims');
        Schema::dropIfExists('category_delete_guards');
    }
};
