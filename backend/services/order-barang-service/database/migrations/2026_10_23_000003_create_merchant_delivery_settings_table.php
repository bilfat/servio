<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_delivery_settings', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('merchant_org_id', 64)->unique();
            $table->boolean('is_enabled')->default(true);
            $table->string('origin_reference_id', 64);
            $table->decimal('origin_lat', 10, 7)->nullable();
            $table->decimal('origin_lng', 10, 7)->nullable();
            $table->string('origin_region_code', 32)->nullable();
            $table->decimal('maximum_distance_km', 10, 3)->default(25.000);
            $table->string('distance_method', 24)->default('HAVERSINE');
            $table->string('operational_note', 1000)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->string('last_updated_by', 64);
            $table->timestamps();

            $table->index('is_enabled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_delivery_settings');
    }
};
