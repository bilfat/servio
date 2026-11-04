<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_payment_attempts', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('obligation_id', 26);
            $table->integer('attempt_no');
            $table->string('finance_payment_id', 64)->unique(); // Finance payment ID strictly unique
            $table->string('finance_invoice_ref', 64)->nullable()->index();
            $table->string('method', 32)->nullable(); // QRIS, VA
            $table->string('reported_status', 32)->default('PENDING')->index(); // PENDING, PAID, EXPIRED, VOID, FAILED
            $table->unsignedBigInteger('amount_due_idr')->default(0);
            $table->dateTime('issued_at', 6);
            $table->dateTime('expires_at', 6)->nullable();
            $table->dateTime('status_last_verified_at', 6)->nullable();
            $table->string('finance_event_id', 64)->nullable()->index();
            $table->boolean('is_current')->default(true);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('obligation_id')->references('id')->on('service_payment_obligations')->onDelete('cascade');
            $table->unique(['obligation_id', 'attempt_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_payment_attempts');
    }
};
