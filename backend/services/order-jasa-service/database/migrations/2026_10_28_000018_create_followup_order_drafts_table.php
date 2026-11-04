<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('followup_order_drafts', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('origin_order_id', 26);
            $table->string('customer_id', 64)->index();
            $table->string('provider_org_id', 64)->index();
            $table->char('diagnosis_version_id', 26);
            $table->string('service_offering_id', 64);
            $table->json('draft_snapshot');
            $table->string('diagnosis_reuse_entitlement_hash', 64)->unique(); // Prevents multiple free diagnosis reuse
            $table->string('status', 32)->default('DRAFT')->index(); // DRAFT, ACTIVATED, EXPIRED, INELIGIBLE
            $table->char('activated_order_id', 26)->nullable()->unique();
            $table->string('eligibility_reason', 72);
            $table->dateTime('expires_at', 6)->nullable();
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('origin_order_id')->references('id')->on('service_orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('followup_order_drafts');
    }
};
