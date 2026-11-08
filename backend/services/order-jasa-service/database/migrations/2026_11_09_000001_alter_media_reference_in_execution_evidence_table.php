<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('execution_evidence', function (Blueprint $table) {
            DB::statement('ALTER TABLE execution_evidence MODIFY media_reference LONGTEXT NOT NULL');
        });
    }

    public function down(): void
    {
        Schema::table('execution_evidence', function (Blueprint $table) {
            DB::statement('ALTER TABLE execution_evidence MODIFY media_reference VARCHAR(255) NOT NULL');
        });
    }
};
