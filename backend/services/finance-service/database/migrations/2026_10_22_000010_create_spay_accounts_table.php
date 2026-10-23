<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spay_accounts', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('owner_type', 32); // CUSTOMER, MERCHANT_ORGANIZATION
            $table->string('owner_external_id', 64);
            $table->char('currency', 3)->default('IDR');
            $table->bigInteger('available_idr')->default(0);
            $table->bigInteger('withdrawal_locked_idr')->default(0);
            $table->string('account_status', 24)->default('ACTIVE');
            $table->dateTime('last_movement_at', 6)->nullable();
            $table->timestamps(6);

            $table->unique(['owner_type', 'owner_external_id', 'currency']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spay_accounts');
    }
};
