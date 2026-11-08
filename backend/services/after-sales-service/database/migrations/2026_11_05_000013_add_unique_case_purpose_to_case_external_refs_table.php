<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('case_external_refs', function (Blueprint $table) {
            $table->unique(['case_id', 'purpose'], 'uniq_case_purpose');
        });
    }

    public function down(): void
    {
        Schema::table('case_external_refs', function (Blueprint $table) {
            $table->dropUnique('uniq_case_purpose');
        });
    }
};
