<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryMaster;
use App\Models\Subcategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class MySQLIntegrityAndTriggerTest extends TestCase
{
    use DatabaseTransactions;

    public function test_mysql_trigger_prevents_updating_category_masters(): void
    {
        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessage('CATEGORY_MASTER_IMMUTABLE');

        DB::table('category_masters')
            ->where('code', 'PRODUK')
            ->update(['code' => 'BARANG']);
    }

    public function test_mysql_trigger_prevents_deleting_category_masters(): void
    {
        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessage('CATEGORY_MASTER_CANNOT_BE_DELETED');

        DB::table('category_masters')
            ->where('code', 'PRODUK')
            ->delete();
    }

    public function test_mysql_trigger_prevents_updating_parent_category(): void
    {
        // DEC-02: Parent Category bersifat permanen/immutable
        $masterProduk = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $masterJasa = CategoryMaster::where('code', 'JASA')->firstOrFail();

        $catId = (string) Str::uuid();
        DB::table('categories')->insert([
            'id' => $catId,
            'master_id' => $masterProduk->id,
            'name' => 'Elektronik Trigger Test',
            'normalized_name' => 'elektronik trigger test',
            'status' => 'ACTIVE',
            'lock_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessage('CATEGORY_PARENT_IMMUTABLE');

        DB::table('categories')
            ->where('id', $catId)
            ->update(['master_id' => $masterJasa->id]);
    }

    public function test_mysql_trigger_prevents_updating_parent_subcategory(): void
    {
        // DEC-02: Parent Subcategory bersifat permanen/immutable
        $masterProduk = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $catA = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $masterProduk->id,
            'name' => 'Cat A',
            'normalized_name' => 'cat a',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $catB = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $masterProduk->id,
            'name' => 'Cat B',
            'normalized_name' => 'cat b',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $subId = (string) Str::uuid();
        DB::table('subcategories')->insert([
            'id' => $subId,
            'category_id' => $catA->id,
            'name' => 'Sub X',
            'normalized_name' => 'sub x',
            'status' => 'ACTIVE',
            'lock_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessage('SUBCATEGORY_PARENT_IMMUTABLE');

        DB::table('subcategories')
            ->where('id', $subId)
            ->update(['category_id' => $catB->id]);
    }

    public function test_database_enforces_unique_normalized_name_per_parent(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Perabotan Rumah',
            'normalized_name' => 'perabotan rumah',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Perabotan Rumah Duplikat',
            'normalized_name' => 'perabotan rumah',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);
    }
}
