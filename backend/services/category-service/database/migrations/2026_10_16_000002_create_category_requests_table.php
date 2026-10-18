<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_type', 24); // CATEGORY, SUBCATEGORY
            $table->foreignUuid('master_id')->constrained('category_masters')->restrictOnDelete();
            $table->foreignUuid('proposed_parent_category_id')->nullable()->constrained('categories')->restrictOnDelete();
            $table->uuid('requester_user_id');
            $table->string('requester_role', 64);
            $table->uuid('requester_org_id');
            $table->string('suggested_name', 160);
            $table->string('normalized_suggested_name', 160)->collation('utf8mb4_bin');
            $table->text('reason');
            $table->text('additional_information')->nullable();
            $table->string('status', 24)->default('NEW'); // NEW, PROCESSING, REJECTED, FULFILLED
            $table->foreignUuid('duplicate_of_request_id')->nullable()->constrained('category_requests')->restrictOnDelete();
            $table->foreignUuid('fulfilled_category_id')->nullable()->constrained('categories')->restrictOnDelete();
            $table->foreignUuid('fulfilled_subcategory_id')->nullable()->constrained('subcategories')->restrictOnDelete();
            $table->uuid('reviewer_user_id')->nullable();
            $table->text('review_reason')->nullable();
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->dateTime('reviewed_at', 6)->nullable();
            $table->timestamps(6);

            $table->index(['status', 'created_at'], 'ix_cat_req_status_created');
            $table->index(['requester_user_id', 'created_at'], 'ix_cat_req_requester_created');
            $table->index(['master_id', 'request_type', 'status'], 'ix_cat_req_master_type_status');
            $table->index(['proposed_parent_category_id'], 'ix_cat_req_prop_parent');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_requests');
    }
};
