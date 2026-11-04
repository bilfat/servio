<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_part_items', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('diagnosis_version_id', 26);
            $table->integer('line_no');
            $table->string('part_name', 160);
            $table->text('specification')->nullable();
            $table->string('source', 32); // PROVIDER_SUPPLIED, SERVIO_MERCHANT, CUSTOMER_SUPPLIED
            $table->unsignedInteger('quantity')->default(1);
            $table->string('unit', 32)->default('pcs');
            $table->unsignedBigInteger('unit_price_idr')->nullable();
            $table->unsignedBigInteger('subtotal_idr')->default(0);
            $table->string('related_product_id', 64)->nullable();
            $table->string('related_product_order_id', 64)->nullable();
            $table->string('availability_status', 32)->default('NOT_CHECKED');
            $table->string('compatibility_check_status', 32)->default('NOT_CHECKED');
            $table->text('worker_note')->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('diagnosis_version_id')->references('id')->on('diagnosis_versions')->onDelete('cascade');
            $table->unique(['diagnosis_version_id', 'line_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_part_items');
    }
};
