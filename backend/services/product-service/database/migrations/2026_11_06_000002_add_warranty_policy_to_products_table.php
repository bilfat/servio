<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'warranty_policy')) {
            Schema::table('products', function (Blueprint $table) {
                $table->json('warranty_policy')->nullable()->after('lock_version');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'warranty_policy')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('warranty_policy');
            });
        }
    }
};

