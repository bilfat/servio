<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_orders', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->string('order_no', 48)->unique();
            $table->string('customer_id', 64)->index();
            $table->string('provider_org_id', 64)->index();
            $table->string('service_offering_id', 64);
            $table->string('service_offering_version', 64)->nullable();
            $table->json('service_snapshot');
            $table->json('recipient_snapshot');
            $table->json('address_snapshot');
            $table->text('complaint_text');
            $table->json('symptoms_json')->nullable();
            $table->json('customer_media_refs')->nullable();
            $table->unsignedBigInteger('diagnosis_fee_idr')->default(0);
            $table->string('diagnosis_fee_exemption_type', 40)->nullable();
            $table->string('status', 32)->default('CREATED')->index();
            $table->string('phase', 48)->default('DIAGNOSIS_PAYMENT_PENDING')->index();
            $table->string('cancel_reason_code', 72)->nullable()->index();
            $table->char('original_order_id', 26)->nullable()->index();
            $table->unsignedBigInteger('version')->default(1);
            $table->dateTime('completed_at', 6)->nullable();
            $table->dateTime('cancelled_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->index(['customer_id', 'created_at']);
            $table->index(['provider_org_id', 'status', 'created_at']);
            $table->index(['status', 'phase', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_orders');
    }
};
