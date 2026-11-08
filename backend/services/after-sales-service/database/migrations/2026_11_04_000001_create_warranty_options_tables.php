<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warranty_options', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->enum('org_type', ['MERCHANT', 'PROVIDER']);
            $table->string('org_id', 64);
            $table->string('slug', 64);
            $table->enum('status', ['ACTIVE', 'INACTIVE'])->default('ACTIVE');
            $table->string('latest_version_id', 36)->nullable();
            $table->timestamps();

            $table->unique(['org_type', 'org_id', 'slug'], 'uniq_org_warranty_slug');
            $table->index(['org_type', 'org_id', 'status'], 'idx_org_warranty_status');
        });

        Schema::create('warranty_option_versions', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('option_id', 36);
            $table->unsignedInteger('version_no');
            $table->string('name', 128);
            $table->unsignedInteger('duration_days'); // Duration in days > 0
            $table->text('coverage_text');
            $table->text('exclusion_text')->nullable();
            $table->dateTime('published_at');
            $table->string('changed_by', 64);
            $table->timestamps();

            $table->foreign('option_id')->references('id')->on('warranty_options')->onDelete('cascade');
            $table->unique(['option_id', 'version_no'], 'uniq_option_version');
        });

        Schema::create('order_warranty_entitlements', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->enum('source_kind', ['GOODS', 'SERVICE']);
            $table->string('order_id', 64);
            $table->string('merchant_order_id', 64)->nullable();
            $table->string('order_item_key', 64);
            $table->string('customer_id', 64);
            $table->enum('owner_org_type', ['MERCHANT', 'PROVIDER']);
            $table->string('owner_org_id', 64);
            $table->string('catalog_ref', 64);
            $table->string('warranty_option_version_id', 36)->nullable();
            $table->string('snapshot_name', 128);
            $table->unsignedInteger('snapshot_duration_days');
            $table->text('snapshot_coverage')->nullable();
            $table->text('snapshot_exclusion')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->enum('status', ['PENDING_START', 'ACTIVE', 'EXPIRED', 'CANCELLED'])->default('PENDING_START');
            $table->dateTime('ordered_at')->nullable();
            $table->dateTime('source_completed_at')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->string('source_event_id', 64)->nullable();
            $table->timestamps();

            $table->unique(['source_kind', 'order_id', 'order_item_key'], 'uniq_order_item_entitlement');
            $table->index(['customer_id', 'status'], 'idx_cust_entitlement_status');
            $table->index(['owner_org_id', 'status'], 'idx_owner_entitlement_status');
            $table->index(['expires_at', 'status'], 'idx_expiry_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_warranty_entitlements');
        Schema::dropIfExists('warranty_option_versions');
        Schema::dropIfExists('warranty_options');
    }
};

