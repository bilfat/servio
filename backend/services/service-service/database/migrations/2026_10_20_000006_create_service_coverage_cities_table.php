<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_coverage_cities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('offering_id')->constrained('service_offerings')->cascadeOnDelete();
            $table->string('city_code', 32);
            $table->string('city_label_snapshot', 160)->nullable();
            $table->timestamps(6);

            $table->unique(['offering_id', 'city_code']);
            $table->index(['city_code', 'offering_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_coverage_cities');
    }
};
