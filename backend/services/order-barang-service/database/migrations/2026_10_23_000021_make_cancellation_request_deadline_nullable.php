<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cancellation_requests', function (Blueprint $table) {
            $table->dateTime('response_deadline_at')->nullable()->change();
            $table->json('operational_schedule_snapshot')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('cancellation_requests', function (Blueprint $table) {
            $table->dateTime('response_deadline_at')->nullable(false)->change();
            $table->json('operational_schedule_snapshot')->nullable(false)->change();
        });
    }
};
