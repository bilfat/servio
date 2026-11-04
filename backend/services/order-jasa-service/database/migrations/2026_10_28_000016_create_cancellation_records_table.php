<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cancellation_records', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26)->unique(); // Strictly one terminal cancellation per order
            $table->string('cancelled_by_type', 32); // CUSTOMER, PROVIDER, ADMIN, SYSTEM
            $table->string('cancelled_by_id', 64);
            $table->string('reason_code', 72)->index();
            $table->text('reason_text')->nullable();
            $table->string('status_at_cancel', 32);
            $table->boolean('diagnosis_fulfilled')->default(false);
            $table->string('diagnosis_evidence_ref', 255)->nullable();
            $table->string('refund_eligibility_snapshot', 64)->default('NONE'); // FULL_REFUND, NO_REFUND, NONE
            $table->string('refund_finance_ref', 64)->nullable()->index();
            $table->dateTime('cancelled_at', 6);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cancellation_records');
    }
};
