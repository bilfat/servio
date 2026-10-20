<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Table for customer address book (Buku Alamat Pengerjaan)
     */
    public function up(): void
    {
        if (!Schema::hasTable('user_addresses')) {
            Schema::create('user_addresses', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->char('user_id', 36)->index();
                $table->string('label', 100)->default('Rumah');
                $table->string('recipient_name', 150)->nullable();
                $table->string('phone', 50)->nullable();
                $table->text('address_line');
                $table->string('province', 100)->nullable();
                $table->string('city', 100);
                $table->string('district', 100)->nullable();
                $table->string('village', 100)->nullable();
                $table->string('postal_code', 20)->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->boolean('is_default')->default(false);
                $table->string('status', 32)->default('ACTIVE');
                $table->timestamps(6);

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_addresses');
    }
};
