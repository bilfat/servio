<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add warranty_config to service_offerings if missing
        if (Schema::hasTable('service_offerings') && !Schema::hasColumn('service_offerings', 'warranty_config')) {
            Schema::table('service_offerings', function (Blueprint $table) {
                $table->json('warranty_config')->nullable()->after('lock_version');
            });
        }

        // Drop service_coverage_cities table per user instruction
        // Providers manage geographic reach via Area & Cakupan Layanan (work_radius_km)
        Schema::dropIfExists('service_coverage_cities');
    }

    public function down(): void
    {
        if (Schema::hasTable('service_offerings') && Schema::hasColumn('service_offerings', 'warranty_config')) {
            Schema::table('service_offerings', function (Blueprint $table) {
                $table->dropColumn('warranty_config');
            });
        }

        if (!Schema::hasTable('service_coverage_cities')) {
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
    }
};

