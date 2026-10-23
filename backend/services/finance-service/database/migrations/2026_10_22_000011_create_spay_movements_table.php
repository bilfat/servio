<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spay_movements', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('spay_account_id', 26);
            $table->string('movement_type', 40); // MERCHANT_RELEASE, REFUND_CREDIT, WITHDRAWAL_LOCK, WITHDRAWAL_SUCCEEDED, WITHDRAWAL_UNLOCK, REVERSAL
            $table->string('direction', 12); // CREDIT, DEBIT, LOCK, UNLOCK
            $table->bigInteger('amount_idr');
            $table->string('source_type', 40);
            $table->string('source_id', 64);
            $table->bigInteger('available_before_idr');
            $table->bigInteger('available_after_idr');
            $table->bigInteger('locked_before_idr');
            $table->bigInteger('locked_after_idr');
            $table->dateTime('created_at', 6);

            $table->foreign('spay_account_id')->references('id')->on('spay_accounts')->onDelete('restrict');
            $table->unique(['source_type', 'source_id', 'movement_type'], 'spay_mov_src_type_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spay_movements');
    }
};
