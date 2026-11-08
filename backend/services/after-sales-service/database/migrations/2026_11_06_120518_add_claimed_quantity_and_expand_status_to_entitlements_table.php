<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Expand status enum to support CLAIM_LOCKED and CONSUMED
        DB::statement("ALTER TABLE order_warranty_entitlements MODIFY COLUMN status ENUM('PENDING_START', 'ACTIVE', 'CLAIM_LOCKED', 'CONSUMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_START'");

        // 2. Add claimed_quantity column if not exists
        if (!Schema::hasColumn('order_warranty_entitlements', 'claimed_quantity')) {
            Schema::table('order_warranty_entitlements', function (Blueprint $table) {
                $table->unsignedInteger('claimed_quantity')->default(0)->after('quantity');
            });
        }

        // 3. Historical Data Reconciliation:
        // Update entitlements that already have completed cases to CONSUMED
        $completedCases = DB::table('after_sales_cases')
            ->where('main_status', 'COMPLETED')
            ->whereNotNull('entitlement_id')
            ->get();

        foreach ($completedCases as $case) {
            DB::table('order_warranty_entitlements')
                ->where('id', $case->entitlement_id)
                ->where('status', 'ACTIVE')
                ->update([
                    'status' => 'CONSUMED',
                    'claimed_quantity' => DB::raw('quantity'),
                    'updated_at' => now(),
                ]);
        }

        // Update entitlements that have in-progress cases to CLAIM_LOCKED
        $activeCases = DB::table('after_sales_cases')
            ->whereIn('main_status', ['SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'IN_RESOLUTION'])
            ->whereNotNull('entitlement_id')
            ->get();

        foreach ($activeCases as $case) {
            DB::table('order_warranty_entitlements')
                ->where('id', $case->entitlement_id)
                ->where('status', 'ACTIVE')
                ->update([
                    'status' => 'CLAIM_LOCKED',
                    'claimed_quantity' => DB::raw('quantity'),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_warranty_entitlements', 'claimed_quantity')) {
            Schema::table('order_warranty_entitlements', function (Blueprint $table) {
                $table->dropColumn('claimed_quantity');
            });
        }

        DB::statement("ALTER TABLE order_warranty_entitlements MODIFY COLUMN status ENUM('PENDING_START', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_START'");
    }
};
