<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Only create triggers on MySQL
        if (DB::getDriverName() === 'mysql') {
            DB::unprepared("
                CREATE TRIGGER trg_category_masters_no_update
                BEFORE UPDATE ON category_masters
                FOR EACH ROW
                BEGIN
                    IF NEW.code <> OLD.code OR NEW.id <> OLD.id THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CATEGORY_MASTER_IMMUTABLE';
                    END IF;
                END
            ");

            DB::unprepared("
                CREATE TRIGGER trg_category_masters_no_delete
                BEFORE DELETE ON category_masters
                FOR EACH ROW
                BEGIN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CATEGORY_MASTER_CANNOT_BE_DELETED';
                END
            ");

            DB::unprepared("
                CREATE TRIGGER trg_categories_parent_immutable
                BEFORE UPDATE ON categories
                FOR EACH ROW
                BEGIN
                    IF NEW.master_id <> OLD.master_id THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CATEGORY_PARENT_IMMUTABLE';
                    END IF;
                END
            ");

            DB::unprepared("
                CREATE TRIGGER trg_subcategories_parent_immutable
                BEFORE UPDATE ON subcategories
                FOR EACH ROW
                BEGIN
                    IF NEW.category_id <> OLD.category_id THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SUBCATEGORY_PARENT_IMMUTABLE';
                    END IF;
                END
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_subcategories_parent_immutable");
            DB::unprepared("DROP TRIGGER IF EXISTS trg_categories_parent_immutable");
            DB::unprepared("DROP TRIGGER IF EXISTS trg_category_masters_no_delete");
            DB::unprepared("DROP TRIGGER IF EXISTS trg_category_masters_no_update");
        }
    }
};
