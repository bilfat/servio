<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('after_sales_cases', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('case_number', 64)->unique();
            $table->enum('case_type', ['GOODS_WARRANTY', 'SERVICE_WARRANTY', 'GOODS_RETURN']);
            $table->string('customer_id', 64);
            $table->string('owner_org_id', 64);
            $table->enum('owner_org_type', ['MERCHANT', 'PROVIDER']);
            $table->enum('source_order_kind', ['GOODS', 'SERVICE']);
            $table->string('source_order_id', 64);
            $table->string('source_merchant_order_id', 64)->nullable();
            $table->string('entitlement_id', 36)->nullable();
            $table->enum('initial_solution', ['REPLACEMENT', 'REWORK', 'REFUND']);
            $table->enum('agreed_solution', ['REPLACEMENT', 'REWORK', 'REFUND', 'REPAIR_GOODS'])->nullable();
            $table->string('reason_code', 64);
            $table->text('description');
            $table->enum('main_status', [
                'SUBMITTED',
                'UNDER_REVIEW',
                'AWAITING_RETURN',
                'IN_RESOLUTION',
                'COMPLETED',
                'REJECTED',
                'CANCELLED',
            ])->default('SUBMITTED');
            $table->enum('substate', [
                'NONE',
                'AWAITING_CUSTOMER_INFO',
                'AWAITING_CUSTOMER_CONSENT',
            ])->default('NONE');
            $table->dateTime('response_due_at'); // 72 jam kalender
            $table->enum('response_state', ['WAITING', 'RESPONDED', 'OVERDUE'])->default('WAITING');
            $table->dateTime('first_meaningful_response_at')->nullable();
            $table->dateTime('overdue_first_detected_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->text('reject_reason')->nullable();
            $table->dateTime('reported_to_support_at')->nullable();
            $table->string('support_ticket_ref', 64)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['customer_id', 'created_at'], 'idx_cust_case_created');
            $table->index(['owner_org_id', 'main_status', 'created_at'], 'idx_owner_case_status');
            $table->index(['source_order_kind', 'source_order_id'], 'idx_source_order');
            $table->index(['response_due_at', 'response_state'], 'idx_sla_response');
        });

        Schema::create('case_items', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('case_id', 36);
            $table->string('source_item_ref', 64);
            $table->json('catalog_snapshot')->nullable();
            $table->unsignedInteger('quantity_requested')->default(1);
            $table->unsignedInteger('quantity_allocated')->default(0);
            $table->boolean('is_service')->default(false);
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->onDelete('cascade');
            $table->index(['case_id', 'source_item_ref'], 'idx_case_item_ref');
        });

        Schema::create('case_evidence', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('case_id', 36);
            $table->string('uploaded_by', 64);
            $table->string('media_ref', 255);
            $table->string('content_type', 128);
            $table->unsignedBigInteger('size_bytes');
            $table->string('sha256', 64)->nullable();
            $table->enum('visibility', ['CASE_PARTIES', 'PUBLIC', 'ADMIN_ONLY'])->default('CASE_PARTIES');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->onDelete('cascade');
            $table->index(['case_id', 'created_at'], 'idx_case_evidence_time');
        });

        Schema::create('case_events', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('case_id', 36);
            $table->unsignedInteger('sequence');
            $table->string('event_type', 64);
            $table->string('from_state', 64)->nullable();
            $table->string('to_state', 64)->nullable();
            $table->enum('actor_kind', ['CUSTOMER', 'MERCHANT', 'PROVIDER', 'ADMIN', 'SYSTEM']);
            $table->string('actor_id', 64);
            $table->text('reason')->nullable();
            $table->json('data_json')->nullable();
            $table->dateTime('occurred_at');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->onDelete('cascade');
            $table->unique(['case_id', 'sequence'], 'uniq_case_seq');
            $table->index(['case_id', 'occurred_at'], 'idx_case_event_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_events');
        Schema::dropIfExists('case_evidence');
        Schema::dropIfExists('case_items');
        Schema::dropIfExists('after_sales_cases');
    }
};

