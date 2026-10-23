<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_lines', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('ledger_journal_id', 26);
            $table->string('account_code', 64);
            $table->string('owner_type', 32)->nullable();
            $table->string('owner_external_id', 64)->nullable();
            $table->string('entry_side', 6); // DEBIT, CREDIT
            $table->bigInteger('amount_idr');
            $table->dateTime('created_at', 6);

            $table->foreign('ledger_journal_id')->references('id')->on('ledger_journals')->onDelete('cascade');
            $table->index(['account_code', 'owner_external_id']);
            $table->index('ledger_journal_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_lines');
    }
};
