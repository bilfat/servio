<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_payment_obligations', function (Blueprint $table) {
            $table->json('fee_snapshot')->nullable()->after('currency');
        });
    }

    public function down(): void
    {
        Schema::table('service_payment_obligations', function (Blueprint $table) {
            $table->dropColumn('fee_snapshot');
        });
    }
};

