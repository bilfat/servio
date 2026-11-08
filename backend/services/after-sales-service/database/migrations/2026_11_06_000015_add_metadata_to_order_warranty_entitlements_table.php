<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_warranty_entitlements', function (Blueprint $table) {
            $table->string('item_title', 255)->nullable()->after('catalog_ref');
            $table->text('item_image_url')->nullable()->after('item_title');
            $table->string('organization_name', 128)->nullable()->after('owner_org_id');
            $table->string('order_number', 64)->nullable()->after('merchant_order_id');
            $table->json('catalog_snapshot')->nullable()->after('snapshot_exclusion');
        });
    }

    public function down(): void
    {
        Schema::table('order_warranty_entitlements', function (Blueprint $table) {
            $table->dropColumn([
                'item_title',
                'item_image_url',
                'organization_name',
                'order_number',
                'catalog_snapshot',
            ]);
        });
    }
};

