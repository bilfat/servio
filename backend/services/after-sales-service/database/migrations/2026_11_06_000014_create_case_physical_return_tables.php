<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Case Return Instructions
        Schema::create('case_return_instructions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id')->unique();
            $table->boolean('requires_physical_return')->default(true);
            $table->text('no_return_reason')->nullable();
            $table->string('recipient_name', 100)->nullable();
            $table->string('recipient_phone', 50)->nullable();
            $table->text('return_address')->nullable();
            $table->text('packaging_instructions')->nullable();
            $table->enum('shipping_fee_payer', ['MERCHANT', 'CUSTOMER', 'THIRD_PARTY'])->default('MERCHANT');
            $table->string('shipping_fee_method', 100)->nullable();
            $table->text('reimbursement_instructions')->nullable();
            $table->dateTime('deadline_at')->nullable();
            $table->text('merchant_notes')->nullable();
            $table->string('created_by', 64);
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->cascadeOnDelete();
        });

        // 2. Case Return Shipments
        Schema::create('case_return_shipments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id')->unique();
            $table->string('courier_name', 100);
            $table->string('tracking_number', 100)->nullable();
            $table->dateTime('shipped_at');
            $table->decimal('shipping_fee_paid_idr', 14, 2)->default(0);
            $table->string('shipping_receipt_ref', 255)->nullable();
            $table->string('fee_payment_proof_ref', 255)->nullable();
            $table->text('customer_notes')->nullable();
            $table->enum('shipping_status', ['SHIPPED', 'DELIVERED', 'LOST'])->default('SHIPPED');
            $table->string('created_by', 64);
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->cascadeOnDelete();
        });

        // 3. Case Return Receipts
        Schema::create('case_return_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id')->unique();
            $table->dateTime('received_at');
            $table->string('received_by', 100);
            $table->unsignedInteger('quantity_received');
            $table->string('package_condition', 100);
            $table->string('receipt_proof_ref', 255)->nullable();
            $table->text('receipt_notes')->nullable();
            $table->enum('status', ['RECEIVED', 'DISPUTED_NOT_RECEIVED'])->default('RECEIVED');
            $table->text('dispute_reason')->nullable();
            $table->string('created_by', 64);
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->cascadeOnDelete();
        });

        // 4. Case Return Inspections
        Schema::create('case_return_inspections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id')->unique();
            $table->dateTime('inspected_at');
            $table->string('inspected_by', 100);
            $table->unsignedInteger('quantity_inspected');
            $table->unsignedInteger('quantity_approved');
            $table->string('item_condition', 100);
            $table->boolean('is_sku_matched')->default(true);
            $table->boolean('is_issue_matched')->default(true);
            $table->boolean('is_components_complete')->default(true);
            $table->enum('inspection_outcome', ['MATCHED', 'PARTIAL', 'MISMATCH']);
            $table->text('inspection_notes')->nullable();
            $table->json('evidence_refs')->nullable();
            $table->string('created_by', 64);
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->cascadeOnDelete();
        });

        // 5. Case Shipping Expenses
        Schema::create('case_shipping_expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id');
            $table->enum('expense_type', ['INITIAL_PURCHASE_SHIPPING', 'RETURN_SHIPPING', 'REPLACEMENT_SHIPPING']);
            $table->enum('fee_payer', ['MERCHANT', 'CUSTOMER', 'PLATFORM', 'CARRIER']);
            $table->decimal('actual_fee_idr', 14, 2)->default(0);
            $table->enum('paid_by', ['MERCHANT', 'CUSTOMER', 'PLATFORM', 'CARRIER']);
            $table->enum('verification_status', ['PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED', 'NOT_APPLICABLE'])->default('PENDING_VERIFICATION');
            $table->decimal('approved_reimbursement_idr', 14, 2)->default(0);
            $table->enum('reimbursement_status', ['NOT_REQUIRED', 'PENDING_FINANCE_CONTRACT', 'PROCESSING', 'SUCCEEDED', 'REJECTED'])->default('NOT_REQUIRED');
            $table->string('receipt_ref', 255)->nullable();
            $table->string('reimbursement_tx_ref', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('after_sales_cases')->cascadeOnDelete();
            $table->index(['case_id', 'expense_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_shipping_expenses');
        Schema::dropIfExists('case_return_inspections');
        Schema::dropIfExists('case_return_receipts');
        Schema::dropIfExists('case_return_shipments');
        Schema::dropIfExists('case_return_instructions');
    }
};

