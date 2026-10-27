<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('customer_id', 64);
            $table->string('cart_state', 20)->default('ACTIVE');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['customer_id', 'cart_state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};
