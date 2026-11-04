<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_finance_entitlement_refs', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('order_id', 26);
            $table->string('purpose', 32); // DIAGNOSIS, SERVICE_EXECUTION
            $table->string('finance_entitlement_id', 64)->nullable()->index();
            $table->string('finance_event_id', 64)->unique(); // Finance event ID strictly unique
            $table->string('hold_status', 32)->default('HELD')->index(); // HELD, AVAILABLE, RELEASED, FORFEITED
            $table->dateTime('release_eligible_at', 6)->nullable();
            $table->unsignedBigInteger('net_provider_idr')->default(0);
            $table->string('payment_allocation_reference', 64)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('order_id')->references('id')->on('service_orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_finance_entitlement_refs');
    }
};
