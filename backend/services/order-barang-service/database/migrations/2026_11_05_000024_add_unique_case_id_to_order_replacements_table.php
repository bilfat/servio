<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_replacements', function (Blueprint $table) {
            $table->unique('case_id', 'uniq_order_replacements_case_id');
        });
    }

    public function down(): void
    {
        Schema::table('order_replacements', function (Blueprint $table) {
            $table->dropUnique('uniq_order_replacements_case_id');
        });
    }
};

