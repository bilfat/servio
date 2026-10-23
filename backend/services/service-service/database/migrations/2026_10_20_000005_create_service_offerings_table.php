<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_offerings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('provider_organization_id'); // External Identity scalar, no FK
            $table->foreignUuid('service_definition_id')->constrained('service_definitions')->restrictOnDelete();
            $table->uuid('created_by_user_id');       // External Identity scalar, no FK
            $table->string('display_name', 191);
            $table->string('normalized_display_name', 191);
            $table->text('description')->nullable();
            $table->json('included_items')->nullable();
            $table->json('excluded_items')->nullable();
            $table->json('customer_requirements')->nullable();
            $table->string('price_model', 16)->default('RANGE'); // FREE, RANGE, AFTER_SURVEY
            $table->unsignedBigInteger('min_price_idr')->nullable();
            $table->unsignedBigInteger('max_price_idr')->nullable();
            $table->char('currency', 3)->default('IDR');
            $table->string('survey_availability', 20)->default('NOT_AVAILABLE'); // NOT_AVAILABLE, AVAILABLE
            $table->string('survey_requirement', 16)->nullable();                // OPTIONAL, REQUIRED
            $table->string('survey_fee_model', 16)->nullable();                  // FREE, PAID
            $table->unsignedBigInteger('survey_fee_idr')->nullable();
            $table->unsignedInteger('duration_min')->nullable();
            $table->unsignedInteger('duration_max')->nullable();
            $table->string('duration_unit', 12)->nullable();                     // MINUTE, HOUR, DAY
            $table->string('status', 16)->default('DRAFT');                      // DRAFT, ACTIVE, INACTIVE
            $table->unsignedBigInteger('lock_version')->default(1);
            $table->dateTime('activated_at', 6)->nullable();
            $table->softDeletesTz('deleted_at', 6);
            $table->timestamps(6);

            $table->index(['provider_organization_id', 'status', 'deleted_at'], 'idx_so_prov_status_del');
            $table->index(['service_definition_id', 'status'], 'idx_so_def_status');
            $table->index(['status', 'created_at', 'id'], 'idx_so_status_created_id');
        });

        // Add MySQL check constraints
        DB::statement("
            ALTER TABLE service_offerings
            ADD CONSTRAINT chk_service_status CHECK (status IN ('DRAFT','ACTIVE','INACTIVE')),
            ADD CONSTRAINT chk_service_price_model CHECK (price_model IN ('FREE','RANGE','AFTER_SURVEY')),
            ADD CONSTRAINT chk_service_survey_avail CHECK (survey_availability IN ('NOT_AVAILABLE','AVAILABLE')),
            ADD CONSTRAINT chk_service_currency CHECK (currency = 'IDR'),
            ADD CONSTRAINT chk_service_price_when_active CHECK (
                status <> 'ACTIVE'
                OR (price_model = 'RANGE' AND min_price_idr IS NOT NULL AND max_price_idr IS NOT NULL AND max_price_idr >= min_price_idr)
                OR (price_model IN ('FREE','AFTER_SURVEY') AND min_price_idr IS NULL AND max_price_idr IS NULL)
            )
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('service_offerings');
    }
};
