<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('cart_id', 26);
            $table->string('merchant_org_id', 64);
            $table->string('product_id', 64);
            $table->string('variant_id', 64);
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamp('added_at')->useCurrent();
            $table->timestamps();

            $table->foreign('cart_id')->references('id')->on('carts')->onDelete('cascade');
            $table->unique(['cart_id', 'variant_id']);
            $table->index('merchant_org_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
