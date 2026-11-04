<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_work_items', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('diagnosis_version_id', 26);
            $table->integer('line_no');
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('unit', 32)->default('item');
            $table->unsignedBigInteger('unit_price_idr')->default(0);
            $table->unsignedBigInteger('subtotal_idr')->default(0);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('diagnosis_version_id')->references('id')->on('diagnosis_versions')->onDelete('cascade');
            $table->unique(['diagnosis_version_id', 'line_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_work_items');
    }
};
