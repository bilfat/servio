<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('execution_evidence', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('execution_id', 26);
            $table->string('evidence_type', 32); // BEFORE, AFTER, TEST, OTHER
            $table->string('media_reference', 255);
            $table->string('sha256', 64)->nullable();
            $table->string('mime', 64)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->dateTime('capture_at', 6)->nullable();
            $table->string('uploaded_by', 64);
            $table->integer('ordinal')->default(1);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->foreign('execution_id')->references('id')->on('service_executions')->onDelete('cascade');
            $table->unique(['execution_id', 'evidence_type', 'ordinal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('execution_evidence');
    }
};
