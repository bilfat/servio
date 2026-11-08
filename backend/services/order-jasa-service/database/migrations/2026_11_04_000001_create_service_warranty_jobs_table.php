<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('service_warranty_jobs')) {
            Schema::create('service_warranty_jobs', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->string('case_id')->index();
                $table->string('source_order_id')->index();
                $table->string('provider_org_id')->index();
                $table->string('customer_id')->index();
                $table->string('badge', 32)->default('GARANSI');
                $table->text('scope_description');
                $table->integer('price_idr')->default(0);
                $table->string('status', 32)->default('ASSIGNED'); // ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
                $table->string('worker_id')->nullable();
                $table->text('completion_evidence')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('service_warranty_jobs');
    }
};

