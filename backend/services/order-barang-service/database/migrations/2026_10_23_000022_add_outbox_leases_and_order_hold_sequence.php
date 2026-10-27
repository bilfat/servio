<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('integration_outbox_events', function (Blueprint $table) {
            $table->string('claimed_by', 64)->nullable()->after('status');
            $table->timestamp('claimed_at')->nullable()->after('claimed_by');
            $table->timestamp('lease_expires_at')->nullable()->after('claimed_at');

            $table->index(['status', 'lease_expires_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('hold_sequence')->default(0)->after('hold_reason');
        });
    }

    public function down(): void
    {
        Schema::table('integration_outbox_events', function (Blueprint $table) {
            $table->dropIndex(['status', 'lease_expires_at']);
            $table->dropColumn(['claimed_by', 'claimed_at', 'lease_expires_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['hold_sequence']);
        });
    }
};
