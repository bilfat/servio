<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (!Schema::hasColumn('organizations', 'operational_status')) {
                $table->string('operational_status', 32)->default('ONLINE_ACCEPTING')->after('status')->index();
            }
        });

        Schema::table('organization_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('organization_profiles', 'operational_hours_json')) {
                $table->json('operational_hours_json')->nullable()->after('specialization_json');
            }
            if (!Schema::hasColumn('organization_profiles', 'service_area_json')) {
                $table->json('service_area_json')->nullable()->after('operational_hours_json');
            }
            if (!Schema::hasColumn('organization_profiles', 'competencies_json')) {
                $table->json('competencies_json')->nullable()->after('service_area_json');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organization_profiles', function (Blueprint $table) {
            $table->dropColumn(['operational_hours_json', 'service_area_json', 'competencies_json']);
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['operational_status']);
        });
    }
};
