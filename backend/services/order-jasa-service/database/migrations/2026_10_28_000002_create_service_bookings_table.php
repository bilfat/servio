<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_bookings', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26)->unique();
            $table->string('customer_id', 64)->index();
            $table->string('provider_org_id', 64)->index();
            $table->dateTime('scheduled_start_at', 6);
            $table->dateTime('scheduled_end_at', 6);
            $table->string('timezone', 32)->default('Asia/Jakarta');
            $table->string('slot_reference', 64)->nullable();
            $table->string('status', 32)->default('REQUESTED')->index();
            $table->integer('schedule_revision')->default(0);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
            $table->index(['provider_org_id', 'scheduled_start_at', 'status']);
            $table->index(['order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_bookings');
    }
};
