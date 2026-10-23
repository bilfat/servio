<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_rule_references', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('tax_code', 64);
            $table->integer('version_no');
            $table->string('tax_type', 64);
            $table->string('liable_party', 32);
            $table->string('taxable_base_code', 64);
            $table->decimal('rate', 12, 6)->nullable();
            $table->text('source_reference')->nullable();
            $table->string('verification_status', 36)->default('MOCK'); // UNCONFIGURED, MOCK, VERIFIED
            $table->dateTime('effective_from', 6)->nullable();
            $table->dateTime('effective_until', 6)->nullable();
            $table->string('reviewed_by_user_id', 64)->nullable();
            $table->timestamps(6);

            $table->unique(['tax_code', 'version_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rule_references');
    }
};
