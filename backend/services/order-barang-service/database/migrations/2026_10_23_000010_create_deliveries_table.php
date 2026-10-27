<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26)->unique();
            $table->string('service_type', 40)->default('LOCAL_MERCHANT_MANAGED');
            $table->string('status', 32)->default('NOT_STARTED');
            $table->string('courier_method', 32)->nullable();
            $table->string('provider', 32)->nullable();
            $table->string('booking_reference', 128)->nullable();
            $table->string('tracking_url', 2048)->nullable();
            $table->text('courier_name_ciphertext')->nullable();
            $table->text('courier_phone_ciphertext')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->string('recipient_name', 255)->nullable();
            $table->longText('proof_reference')->nullable();
            $table->boolean('proof_verified')->default(false);
            $table->string('last_failure_code', 64)->nullable();
            $table->unsignedInteger('attempt_count')->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->index('status');
            $table->index('delivered_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
