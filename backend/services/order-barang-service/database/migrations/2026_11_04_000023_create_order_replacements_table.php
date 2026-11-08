<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('order_replacements')) {
            Schema::create('order_replacements', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->string('case_id')->index();
                $table->string('source_order_id')->index();
                $table->string('merchant_org_id')->index();
                $table->string('customer_id')->index();
                $table->json('items_json');
                $table->string('status', 32)->default('PREPARING'); // PREPARING, SHIPPED, DELIVERED, CANCELLED
                $table->string('waybill_number')->nullable();
                $table->string('courier_name')->nullable();
                $table->text('proof_of_delivery')->nullable();
                $table->timestamp('shipped_at')->nullable();
                $table->timestamp('delivered_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_replacements');
    }
};

