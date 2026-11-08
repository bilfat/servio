<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_submissions', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->enum('source_kind', ['GOODS', 'SERVICE']);
            $table->string('source_order_id', 64);
            $table->string('source_merchant_order_id', 64)->nullable();
            $table->string('customer_id', 64);
            $table->dateTime('submitted_at');
            $table->string('idempotency_key', 64)->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'source_kind', 'source_order_id'], 'uniq_cust_source_review');
            $table->index(['source_order_id', 'source_kind'], 'idx_source_review');
        });

        Schema::create('review_entries', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('submission_id', 36);
            $table->string('source_item_key', 64)->nullable();
            $table->enum('target_type', ['PRODUCT', 'SERVICE', 'MERCHANT', 'PROVIDER']);
            $table->string('target_id', 64);
            $table->unsignedTinyInteger('rating'); // 1..5
            $table->text('text')->nullable();
            $table->json('media_refs')->nullable();
            $table->enum('status', ['VISIBLE', 'HIDDEN'])->default('VISIBLE');
            $table->dateTime('submitted_at');
            $table->timestamps();

            $table->foreign('submission_id')->references('id')->on('review_submissions')->onDelete('cascade');
            $table->unique(['submission_id', 'target_type', 'target_id'], 'uniq_submission_target_review');
            $table->index(['target_type', 'target_id', 'status'], 'idx_target_rating');
        });

        Schema::create('review_replies', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('review_entry_id', 36)->unique();
            $table->string('owner_org_id', 64);
            $table->text('text');
            $table->string('replied_by', 64);
            $table->timestamps();

            $table->foreign('review_entry_id')->references('id')->on('review_entries')->onDelete('cascade');
            $table->index(['owner_org_id', 'created_at'], 'idx_owner_replies');
        });

        Schema::create('review_moderations', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('review_entry_id', 36);
            $table->string('admin_id', 64);
            $table->enum('action', ['HIDE', 'RESTORE']);
            $table->text('reason');
            $table->dateTime('occurred_at');
            $table->timestamps();

            $table->foreign('review_entry_id')->references('id')->on('review_entries')->onDelete('cascade');
            $table->index(['review_entry_id', 'occurred_at'], 'idx_review_mod_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_moderations');
        Schema::dropIfExists('review_replies');
        Schema::dropIfExists('review_entries');
        Schema::dropIfExists('review_submissions');
    }
};

