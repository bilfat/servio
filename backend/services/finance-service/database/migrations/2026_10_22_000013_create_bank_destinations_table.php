<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_destinations', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('owner_type', 32); // CUSTOMER, MERCHANT_ORGANIZATION
            $table->string('owner_external_id', 64);
            $table->string('bank_code', 30);
            $table->text('account_number_ciphertext');
            $table->char('account_number_hmac', 64);
            $table->char('account_last4', 4);
            $table->text('account_holder_name_ciphertext');
            $table->string('account_holder_name_masked', 150);
            $table->string('verification_status', 24)->default('PENDING'); // PENDING, VERIFIED, REJECTED, REVOKED
            $table->string('verification_method', 40)->nullable()->default('MOCK');
            $table->dateTime('verified_at', 6)->nullable();
            $table->tinyInteger('is_default')->default(0);
            $table->string('created_by_user_id', 64);
            $table->timestamps(6);

            $table->index(['owner_type', 'owner_external_id', 'verification_status'], 'bank_dest_owner_status_idx');
            $table->unique(['owner_type', 'owner_external_id', 'bank_code', 'account_number_hmac'], 'bank_dest_owner_acc_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_destinations');
    }
};
