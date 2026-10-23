<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_offering_capabilities', function (Blueprint $table) {
            $table->foreignUuid('offering_id')->constrained('service_offerings')->cascadeOnDelete();
            $table->foreignUuid('capability_id')->constrained('capabilities')->cascadeOnDelete();
            $table->timestamps(6);

            $table->primary(['offering_id', 'capability_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_offering_capabilities');
    }
};
