<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_attempts', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('delivery_id', 26);
            $table->unsignedInteger('attempt_no');
            $table->string('courier_method', 32)->nullable();
            $table->string('failure_reason_code', 64)->nullable();
            $table->string('outcome', 24);
            $table->timestamp('attempted_at')->useCurrent();
            $table->string('note', 1000)->nullable();
            $table->timestamps();

            $table->foreign('delivery_id')->references('id')->on('deliveries')->onDelete('cascade');
            $table->unique(['delivery_id', 'attempt_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_attempts');
    }
};
