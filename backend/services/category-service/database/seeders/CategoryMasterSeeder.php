<?php

namespace Database\Seeders;

use App\Models\CategoryMaster;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategoryMasterSeeder extends Seeder
{
    public function run(): void
    {
        $masters = [
            ['code' => 'PRODUK', 'name' => 'Produk', 'order' => 1],
            ['code' => 'JASA', 'name' => 'Jasa', 'order' => 2],
        ];

        foreach ($masters as $item) {
            CategoryMaster::firstOrCreate(
                ['code' => $item['code']],
                [
                    'id' => (string) Str::uuid(),
                    'name' => $item['name'],
                    'status' => 'ACTIVE',
                    'sort_order' => $item['order'],
                ]
            );
        }
    }
}
