<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_masters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 16)->unique();
            $table->string('name', 50);
            $table->string('status', 16)->default('ACTIVE');
            $table->smallInteger('sort_order')->unique();
            $table->timestamps(6);
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('master_id')->constrained('category_masters')->restrictOnDelete();
            $table->string('name', 160);
            $table->string('normalized_name', 160)->collation('utf8mb4_bin');
            $table->text('description')->nullable();
            $table->string('status', 16)->default('ACTIVE');
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->timestamps(6);

            $table->unique(['master_id', 'normalized_name'], 'uk_category_parent_normalized');
            $table->index(['master_id', 'status'], 'ix_category_master_status');
        });

        Schema::create('subcategories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('name', 160);
            $table->string('normalized_name', 160)->collation('utf8mb4_bin');
            $table->text('description')->nullable();
            $table->string('status', 16)->default('ACTIVE');
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->timestamps(6);

            $table->unique(['category_id', 'normalized_name'], 'uk_subcategory_parent_normalized');
            $table->index(['category_id', 'status'], 'ix_subcategory_parent_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subcategories');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('category_masters');
    }
};
