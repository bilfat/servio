<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_delivery_tiers', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('delivery_setting_id', 26);
            $table->unsignedInteger('setting_version')->default(1);
            $table->decimal('from_km', 10, 3);
            $table->decimal('to_km', 10, 3);
            $table->unsignedBigInteger('shipping_fee_idr');
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->foreign('delivery_setting_id')->references('id')->on('merchant_delivery_settings')->onDelete('cascade');
            $table->unique(['delivery_setting_id', 'setting_version', 'position'], 'merchant_tiers_setting_ver_pos_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_delivery_tiers');
    }
};
