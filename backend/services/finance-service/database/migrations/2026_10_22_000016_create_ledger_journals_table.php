<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_journals', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('journal_type', 48); // PAYMENT_SETTLEMENT, HELD_RELEASE, CANCELLATION_REFUND, WITHDRAWAL_SETTLEMENT
            $table->string('source_type', 48);
            $table->string('source_id', 64);
            $table->char('payment_intent_id', 26)->nullable();
            $table->char('refund_transaction_id', 26)->nullable();
            $table->char('withdrawal_request_id', 26)->nullable();
            $table->char('currency', 3)->default('IDR');
            $table->dateTime('posted_at', 6);
            $table->string('description', 255)->nullable();
            $table->dateTime('created_at', 6);

            $table->foreign('payment_intent_id')->references('id')->on('payment_intents')->onDelete('restrict');
            $table->foreign('refund_transaction_id')->references('id')->on('refund_transactions')->onDelete('restrict');
            $table->foreign('withdrawal_request_id')->references('id')->on('withdrawal_requests')->onDelete('restrict');
            $table->unique(['source_type', 'source_id', 'journal_type'], 'ledger_journal_source_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_journals');
    }
};
