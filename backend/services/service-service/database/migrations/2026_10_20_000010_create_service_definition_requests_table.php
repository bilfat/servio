<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_definition_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('requester_user_id');          // External Identity user ID, no FK
            $table->uuid('provider_organization_id');   // External Identity org ID, no FK
            $table->string('proposed_name', 191);
            $table->string('normalized_name', 191);
            $table->uuid('category_id');                // External Category ID, no FK
            $table->uuid('subcategory_id');             // External Subcategory ID, no FK
            $table->text('reason')->nullable();
            $table->string('status', 24)->default('NEW'); // NEW, PROCESSING, REJECTED, FULFILLED
            $table->uuid('reviewer_user_id')->nullable();
            $table->text('review_note')->nullable();
            $table->foreignUuid('fulfilled_definition_id')->nullable()->constrained('service_definitions')->nullOnDelete();
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->timestamps(6);

            $table->index(['provider_organization_id', 'status', 'created_at'], 'idx_sdr_prov_status_created');
            $table->index(['status', 'created_at'], 'idx_sdr_status_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_definition_requests');
    }
};
