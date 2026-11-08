<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('review_entries', 'owner_org_id')) {
                $table->string('owner_org_id', 64)->nullable()->after('target_id')->index('idx_review_entry_owner_org');
            }
        });
    }

    public function down(): void
    {
        Schema::table('review_entries', function (Blueprint $table) {
            if (Schema::hasColumn('review_entries', 'owner_org_id')) {
                $table->dropIndex('idx_review_entry_owner_org');
                $table->dropColumn('owner_org_id');
            }
        });
    }
};

