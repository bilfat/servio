<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_profiles') && !Schema::hasColumn('user_profiles', 'initial_password_ciphertext')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                $table->text('initial_password_ciphertext')->nullable()->after('locale');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('user_profiles') && Schema::hasColumn('user_profiles', 'initial_password_ciphertext')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                $table->dropColumn('initial_password_ciphertext');
            });
        }
    }
};
