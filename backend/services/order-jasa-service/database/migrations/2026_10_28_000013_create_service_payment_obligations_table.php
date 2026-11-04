<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_payment_obligations', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->string('purpose', 32); // DIAGNOSIS, SERVICE_EXECUTION
            $table->string('pricing_snapshot_id', 64)->nullable();
            $table->char('approved_diagnosis_version_id', 26)->nullable();
            $table->unsignedBigInteger('principal_idr')->default(0);
            $table->string('currency', 3)->default('IDR');
            $table->string('state', 32)->default('NOT_REQUIRED')->index(); // NOT_REQUIRED, REQUIRES_INVOICE, INVOICE_PENDING, PAID, OVERDUE, SETTLED, CLOSED
            $table->string('finance_obligation_ref', 64)->nullable();
            $table->string('active_finance_payment_id', 64)->nullable()->index();
            $table->dateTime('paid_at', 6)->nullable();
            $table->dateTime('payment_due_at', 6)->nullable();
            $table->unsignedBigInteger('version')->default(1);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->unique(['order_id', 'purpose']); // Strictly one obligation per purpose per order!
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_payment_obligations');
    }
};
