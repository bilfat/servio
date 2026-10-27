<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_stock_reservations', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->char('order_item_id', 26)->unique();
            $table->string('variant_id', 64);
            $table->string('remote_reservation_id', 64)->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('reservation_status', 24)->default('PENDING');
            $table->timestamp('reserved_until')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            $table->unsignedInteger('attempt_count')->default(0);
            $table->string('last_error_code', 64)->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('order_item_id')->references('id')->on('order_items')->onDelete('cascade');
            $table->index(['reservation_status', 'reserved_until'], 'stock_res_status_until_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_stock_reservations');
    }
};
