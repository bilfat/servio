<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_profiles')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                if (!Schema::hasColumn('user_profiles', 'gender')) {
                    $table->string('gender', 20)->nullable()->after('legal_name');
                }
                if (!Schema::hasColumn('user_profiles', 'birth_date')) {
                    $table->date('birth_date')->nullable()->after('gender');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('user_profiles')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                if (Schema::hasColumn('user_profiles', 'birth_date')) {
                    $table->dropColumn('birth_date');
                }
                if (Schema::hasColumn('user_profiles', 'gender')) {
                    $table->dropColumn('gender');
                }
            });
        }
    }
};
