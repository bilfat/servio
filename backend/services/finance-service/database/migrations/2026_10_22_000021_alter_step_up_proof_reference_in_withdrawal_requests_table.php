<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Safely and idempotently modifies step_up_proof_reference column to VARCHAR(512).
     */
    public function up(): void
    {
        if (Schema::hasTable('withdrawal_requests') && Schema::hasColumn('withdrawal_requests', 'step_up_proof_reference')) {
            // Using native MySQL ALTER TABLE to preserve data and avoid doctrine/dbal requirement
            DB::statement('ALTER TABLE `withdrawal_requests` MODIFY `step_up_proof_reference` VARCHAR(512) NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('withdrawal_requests') && Schema::hasColumn('withdrawal_requests', 'step_up_proof_reference')) {
            DB::statement('ALTER TABLE `withdrawal_requests` MODIFY `step_up_proof_reference` VARCHAR(100) NULL');
        }
    }
};
