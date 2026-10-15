<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_nik_records', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
            $table->text('nik_ciphertext');
            $table->timestamp('format_validated_at', 6);
            $table->timestamp('locked_at', 6);
            $table->timestamps(6);
        });

        DB::unprepared("
            CREATE TRIGGER user_nik_records_prevent_update
            BEFORE UPDATE ON user_nik_records
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'NIK_RECORD_IMMUTABLE';
            END;
        ");

        DB::unprepared("
            CREATE TRIGGER user_nik_records_prevent_delete
            BEFORE DELETE ON user_nik_records
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'NIK_RECORD_IMMUTABLE';
            END;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("DROP TRIGGER IF EXISTS user_nik_records_prevent_update");
        DB::unprepared("DROP TRIGGER IF EXISTS user_nik_records_prevent_delete");
        Schema::dropIfExists('user_nik_records');
    }
};
