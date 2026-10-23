<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capabilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 128)->unique();
            $table->string('name', 160);
            $table->string('normalized_name', 160);
            $table->text('description')->nullable();
            $table->string('status', 16)->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->uuid('created_by_user_id')->nullable();
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->softDeletesTz('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['status', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capabilities');
    }
};
