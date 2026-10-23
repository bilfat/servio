<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('spay_account_id', 26);
            $table->char('bank_destination_id', 26);
            $table->string('requested_by_user_id', 64);
            $table->bigInteger('requested_amount_idr');
            $table->bigInteger('transfer_fee_idr');
            $table->bigInteger('net_to_bank_idr');
            $table->string('status', 24)->default('PENDING'); // PENDING, PROCESSING, SUCCEEDED, FAILED
            $table->char('idempotency_key_hash', 64);
            $table->string('provider', 32)->default('MOCK');
            $table->string('provider_reference', 100)->nullable();
            $table->string('step_up_proof_reference', 100)->nullable();
            $table->json('bank_snapshot_masked');
            $table->dateTime('initiated_at', 6);
            $table->dateTime('completed_at', 6)->nullable();
            $table->string('failure_code', 64)->nullable();
            $table->timestamps(6);

            $table->foreign('spay_account_id')->references('id')->on('spay_accounts')->onDelete('restrict');
            $table->foreign('bank_destination_id')->references('id')->on('bank_destinations')->onDelete('restrict');
            $table->unique(['spay_account_id', 'idempotency_key_hash'], 'withdraw_acc_idem_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');
    }
};
