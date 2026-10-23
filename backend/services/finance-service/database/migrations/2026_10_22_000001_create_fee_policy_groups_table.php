<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_policy_groups', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('slug', 100)->unique();
            $table->string('display_name', 180);
            $table->text('description')->nullable();
            $table->string('business_status', 24)->default('ACTIVE');
            $table->string('created_by_user_id', 64);
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_policy_groups');
    }
};
