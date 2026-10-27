<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('is_hold_active')->default(false)->after('active_cancellation_request_id');
            $table->string('hold_reason', 255)->nullable()->after('is_hold_active');
            $table->timestamp('hold_applied_at')->nullable()->after('hold_reason');
            $table->string('hold_event_id', 64)->nullable()->after('hold_applied_at');
            $table->string('hold_source_service', 64)->nullable()->after('hold_event_id');

            $table->index('is_hold_active');
        });

        Schema::table('checkout_groups', function (Blueprint $table) {
            $table->json('selected_cart_item_ids')->nullable()->after('selected_items_hash');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['is_hold_active']);
            $table->dropColumn([
                'is_hold_active',
                'hold_reason',
                'hold_applied_at',
                'hold_event_id',
                'hold_source_service',
            ]);
        });

        Schema::table('checkout_groups', function (Blueprint $table) {
            $table->dropColumn('selected_cart_item_ids');
        });
    }
};
