<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $indices = \Illuminate\Support\Facades\DB::select("SHOW INDEXES FROM service_warranty_jobs WHERE Key_name = 'uniq_service_warranty_jobs_case_id'");
        if (empty($indices)) {
            Schema::table('service_warranty_jobs', function (Blueprint $table) {
                $table->unique('case_id', 'uniq_service_warranty_jobs_case_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('service_warranty_jobs', function (Blueprint $table) {
            $table->dropUnique('uniq_service_warranty_jobs_case_id');
        });
    }
};

