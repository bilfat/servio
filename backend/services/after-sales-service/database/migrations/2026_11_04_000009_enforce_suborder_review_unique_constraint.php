<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Normalize any NULL values to empty string
        DB::table('review_submissions')->whereNull('source_merchant_order_id')->update(['source_merchant_order_id' => '']);

        Schema::table('review_submissions', function (Blueprint $table) {
            $table->string('source_merchant_order_id', 64)->default('')->change();
            $table->unique(['customer_id', 'source_kind', 'source_order_id', 'source_merchant_order_id'], 'uniq_review_cust_suborder');
        });
    }

    public function down(): void
    {
        Schema::table('review_submissions', function (Blueprint $table) {
            $table->dropUnique('uniq_review_cust_suborder');
            $table->string('source_merchant_order_id', 64)->nullable()->change();
        });
    }
};

