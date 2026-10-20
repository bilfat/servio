<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('merchant_organization_id');
            $table->uuid('created_by_user_id');
            $table->string('name', 191);
            $table->string('normalized_name', 191);
            $table->longText('description')->nullable();
            $table->string('brand_name', 160)->nullable();
            $table->string('brand_normalized', 160)->nullable();
            $table->uuid('category_id')->nullable();
            $table->uuid('subcategory_id')->nullable();
            $table->string('status', 16)->default('DRAFT');
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->softDeletes('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['merchant_organization_id', 'status', 'deleted_at'], 'idx_products_merchant_status');
            $table->index(['category_id', 'subcategory_id', 'status'], 'idx_products_taxonomy_status');
            $table->index(['brand_normalized', 'status'], 'idx_products_brand_status');
            $table->index(['normalized_name'], 'idx_products_normalized_name');
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->restrictOnDelete();
            $table->json('attributes_json');
            $table->char('attribute_signature', 64);
            $table->string('display_name', 191)->nullable();
            $table->unsignedBigInteger('price_idr')->default(0);
            $table->unsignedBigInteger('stock_qty')->default(0);
            $table->string('status', 16)->default('INACTIVE');
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->softDeletes('deleted_at', 6);
            $table->timestamps(6);

            $table->unique(['id', 'product_id'], 'uk_variant_product');
            $table->index(['product_id', 'status', 'deleted_at'], 'idx_variants_product_status');
        });

        // Add generated column and partial unique constraint for active variants
        try {
            DB::statement("ALTER TABLE product_variants ADD COLUMN active_variant_guard TINYINT GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL");
            DB::statement("ALTER TABLE product_variants ADD UNIQUE KEY uk_product_attr_guard (product_id, attribute_signature, active_variant_guard)");
        } catch (\Throwable $e) {
            // Fallback for engines without virtual column support
        }

        Schema::create('product_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->restrictOnDelete();
            $table->uuid('variant_id')->nullable();
            $table->string('scope', 16); // GENERAL, VARIANT
            $table->string('storage_disk', 32)->default('local');
            $table->string('storage_key', 512);
            $table->string('original_filename', 191)->nullable();
            $table->string('mime_type', 80);
            $table->unsignedBigInteger('bytes')->default(0);
            $table->char('sha256', 64);
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->string('storage_state', 16)->default('PENDING'); // PENDING, READY, FAILED
            $table->softDeletes('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['product_id', 'scope', 'sort_order', 'deleted_at'], 'idx_media_product_scope');
            $table->index(['variant_id', 'sort_order'], 'idx_media_variant_order');
        });

        Schema::create('product_category_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->restrictOnDelete();
            $table->uuid('category_id');
            $table->uuid('subcategory_id');
            $table->uuid('assigned_by_user_id');
            $table->dateTime('effective_from', 6);
            $table->dateTime('effective_to', 6)->nullable();
            $table->uuid('category_claim_id')->nullable();
            $table->uuid('subcategory_claim_id')->nullable();
            $table->uuid('operation_id')->nullable();
            $table->timestamps(6);

            $table->index('category_id', 'idx_assignments_category');
            $table->index('subcategory_id', 'idx_assignments_subcategory');
            $table->index(['product_id', 'effective_to'], 'idx_assignments_product_eff');
        });

        Schema::create('product_stock_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignUuid('variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->uuid('actor_user_id');
            $table->uuid('actor_org_id')->nullable();
            $table->unsignedBigInteger('before_qty');
            $table->bigInteger('delta_qty');
            $table->unsignedBigInteger('after_qty');
            $table->string('reason_code', 48);
            $table->text('note')->nullable();
            $table->uuid('operation_id')->nullable();
            $table->dateTime('occurred_at', 6);

            $table->index(['variant_id', 'occurred_at'], 'idx_stock_adj_variant');
            $table->index(['product_id', 'occurred_at'], 'idx_stock_adj_product');
        });

        Schema::create('product_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->uuid('actor_user_id');
            $table->string('actor_role', 64);
            $table->uuid('actor_org_id')->nullable();
            $table->string('action', 80);
            $table->string('entity_type', 32);
            $table->uuid('entity_id');
            $table->json('before_safe')->nullable();
            $table->json('after_safe')->nullable();
            $table->text('reason')->nullable();
            $table->string('request_id', 96);
            $table->string('correlation_id', 96)->nullable();
            $table->dateTime('occurred_at', 6);

            $table->index(['product_id', 'occurred_at'], 'idx_audit_product');
            $table->index(['actor_user_id', 'occurred_at'], 'idx_audit_actor');
            $table->index(['entity_type', 'entity_id', 'occurred_at'], 'idx_audit_entity');
        });

        Schema::create('product_outbox_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->string('event_type', 128);
            $table->unsignedBigInteger('aggregate_version')->default(1);
            $table->json('payload');
            $table->dateTime('occurred_at', 6);
            $table->dateTime('published_at', 6)->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->string('correlation_id', 96)->nullable();

            $table->index(['published_at', 'occurred_at'], 'idx_outbox_publish');
            $table->index(['product_id', 'aggregate_version'], 'idx_outbox_aggregate');
        });

        Schema::create('product_inbox_consumptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_service', 40);
            $table->uuid('event_id');
            $table->uuid('aggregate_id');
            $table->unsignedBigInteger('aggregate_version')->default(1);
            $table->dateTime('processed_at', 6);
            $table->char('payload_hash', 64);

            $table->unique(['source_service', 'event_id'], 'uk_inbox_source_event');
        });

        Schema::create('product_idempotency_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('actor_user_id');
            $table->string('idempotency_key', 191);
            $table->char('request_hash', 64);
            $table->unsignedSmallInteger('response_status')->default(0);
            $table->json('response_body');
            $table->dateTime('expires_at', 6);
            $table->timestamps(6);

            $table->unique(['actor_user_id', 'idempotency_key'], 'uk_idempotency_actor_key');
            $table->index('expires_at', 'idx_idempotency_expires');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_idempotency_records');
        Schema::dropIfExists('product_inbox_consumptions');
        Schema::dropIfExists('product_outbox_events');
        Schema::dropIfExists('product_audit_logs');
        Schema::dropIfExists('product_stock_adjustments');
        Schema::dropIfExists('product_category_assignments');
        Schema::dropIfExists('product_media');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
    }
};
