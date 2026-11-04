<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_audit_logs', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('request_id', 64)->nullable()->index();
            $table->string('actor', 128)->index();
            $table->string('action', 64)->index();
            $table->string('resource', 128)->index();
            $table->unsignedBigInteger('old_version')->nullable();
            $table->unsignedBigInteger('new_version')->nullable();
            $table->text('reason')->nullable();
            $table->string('ip_hash', 64)->nullable();
            $table->dateTime('created_at', 6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_audit_logs');
    }
};
