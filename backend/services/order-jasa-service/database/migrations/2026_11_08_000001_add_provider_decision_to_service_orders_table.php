<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->string('provider_decision_status', 32)->default('PENDING')->after('status')->index();
            $table->dateTime('provider_decision_at', 6)->nullable()->after('provider_decision_status');
            $table->string('provider_decision_by', 64)->nullable()->after('provider_decision_at');
            $table->text('provider_rejection_reason')->nullable()->after('provider_decision_by');
        });
    }

    public function down(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropColumn([
                'provider_decision_status',
                'provider_decision_at',
                'provider_decision_by',
                'provider_rejection_reason',
            ]);
        });
    }
};

