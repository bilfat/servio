<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 40)->unique();
            $table->string('name', 160);
            $table->string('normalized_name', 160);
            $table->uuid('category_id');      // External Category ID: no cross-DB FK
            $table->uuid('subcategory_id');   // External Subcategory ID: no cross-DB FK
            $table->text('description')->nullable();
            $table->string('status', 16)->default('DRAFT'); // DRAFT, ACTIVE, INACTIVE
            $table->uuid('created_by_user_id'); // External Identity user ID: no cross-DB FK
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->softDeletesTz('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['category_id', 'subcategory_id', 'status']);
            $table->index(['subcategory_id', 'normalized_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_definitions');
    }
};
