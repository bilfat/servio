<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_profiles') && !Schema::hasColumn('user_profiles', 'legal_name')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                $table->string('legal_name', 160)->nullable()->after('display_name');
            });
        }

        if (Schema::hasTable('staff_onboarding')) {
            Schema::table('staff_onboarding', function (Blueprint $table) {
                if (!Schema::hasColumn('staff_onboarding', 'revision_notes')) {
                    $table->text('revision_notes')->nullable()->after('status');
                }
                if (!Schema::hasColumn('staff_onboarding', 'rejection_reason')) {
                    $table->text('rejection_reason')->nullable()->after('revision_notes');
                }
                if (!Schema::hasColumn('staff_onboarding', 'reviewed_by')) {
                    $table->char('reviewed_by', 36)->nullable()->after('rejection_reason');
                    $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('staff_onboarding')) {
            Schema::table('staff_onboarding', function (Blueprint $table) {
                if (Schema::hasColumn('staff_onboarding', 'reviewed_by')) {
                    $table->dropForeign(['reviewed_by']);
                    $table->dropColumn('reviewed_by');
                }
                if (Schema::hasColumn('staff_onboarding', 'rejection_reason')) {
                    $table->dropColumn('rejection_reason');
                }
                if (Schema::hasColumn('staff_onboarding', 'revision_notes')) {
                    $table->dropColumn('revision_notes');
                }
            });
        }

        if (Schema::hasTable('user_profiles') && Schema::hasColumn('user_profiles', 'legal_name')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                $table->dropColumn('legal_name');
            });
        }
    }
};
