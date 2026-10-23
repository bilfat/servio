<?php

namespace Database\Seeders;

use App\Models\ServiceDefinition;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServiceDefinitionSeeder extends Seeder
{
    public function run(): void
    {
        // Canonical definitions for active JASA subcategories
        $definitions = [
            [
                'id' => '22590cbc-e4f1-471e-9859-8a421e022b16',
                'category_id' => '2e379ce0-0a88-4c9e-8085-1a37fb487b62',
                'subcategory_id' => '1d2bb065-6e45-45ab-b631-e18be36e552f',
                'code' => 'DEF-AC-STD-01',
                'name' => 'Cuci dan Servis AC Split Standar',
                'description' => 'Pembersihan kompresor, filter, dan pipa AC split rumah tangga.',
            ],
            [
                'id' => '80eca5af-d5af-4519-a1a0-ac06550a4f32',
                'category_id' => '92438132-1530-4711-8bf2-4d1c631fabf0',
                'subcategory_id' => '045f9fe7-7fc0-4a27-bc03-9d623b4f9ca9',
                'code' => 'DEF-ATAP-ANTI-BOC-81',
                'name' => 'Atap & Anti Bocor (Waterproofing)',
                'description' => 'Layanan standar untuk Atap & Anti Bocor (Waterproofing)',
            ],
            [
                'id' => '7fbb959c-b514-4e00-b3d1-29e2448c1325',
                'category_id' => '4e7f1415-07ae-4c93-966c-b44172ba4d67',
                'subcategory_id' => '114880e1-0ebe-427a-8365-64bcb78b41ed',
                'code' => 'DEF-CUCI-KASUR-SOF-21',
                'name' => 'Cuci Kasur, Sofa & Karpet',
                'description' => 'Layanan standar untuk Cuci Kasur, Sofa & Karpet',
            ],
            [
                'id' => '5e0cff95-9787-4430-8e75-d1e792ea5ab5',
                'category_id' => '4e7f1415-07ae-4c93-966c-b44172ba4d67',
                'subcategory_id' => 'b7e7e7c3-1ae9-4480-86cb-b8a63bf9b906',
                'code' => 'DEF-DEEP-CLEANING-P-48',
                'name' => 'Deep Cleaning Pasca Renovasi',
                'description' => 'Layanan standar untuk Deep Cleaning Pasca Renovasi',
            ],
            [
                'id' => '6df04fc7-7a3c-40f4-8e4d-93f7ae1d1e33',
                'category_id' => '2e379ce0-0a88-4c9e-8085-1a37fb487b62',
                'subcategory_id' => 'f63ca951-939b-4247-8256-4061ac37fb1a',
                'code' => 'DEF-KELISTRIKAN-P-30',
                'name' => 'Kelistrikan & Panel Listrik',
                'description' => 'Layanan standar untuk Kelistrikan & Panel Listrik',
            ],
            [
                'id' => 'd4637143-6ca5-4853-8328-63ee9be2b0d7',
                'category_id' => '2e379ce0-0a88-4c9e-8085-1a37fb487b62',
                'subcategory_id' => '3de4453c-ac62-49a2-ae3e-1944c2831197',
                'code' => 'DEF-KULKAS-MESIN-95',
                'name' => 'Kulkas & Mesin Cuci',
                'description' => 'Layanan standar untuk Kulkas & Mesin Cuci',
            ],
            [
                'id' => '48452756-a172-449e-b9d0-295eec658cfe',
                'category_id' => '06e8f70c-6a07-417c-ba04-38cf26976aef',
                'subcategory_id' => '85771a7b-7c57-4a53-8d99-fa34f1d7873d',
                'code' => 'DEF-MONTIR-MOBIL-PA-96',
                'name' => 'Montir Mobil Panggilan (Home Service)',
                'description' => 'Layanan standar untuk Montir Mobil Panggilan (Home Service)',
            ],
            [
                'id' => '4473cda8-4c80-4fa9-a52d-75026795618f',
                'category_id' => '8c927438-8b79-41ff-a8f4-9e2288e8b5b8',
                'subcategory_id' => 'a98ed78b-436e-43d6-a28e-3899f3c4c9eb',
                'code' => 'DEF-PAKET-SERVIS-AC-34',
                'name' => 'Paket Servis AC Rutin (3 Bulanan)',
                'description' => 'Layanan standar untuk Paket Servis AC Rutin (3 Bulanan)',
            ],
            [
                'id' => '167088eb-d2e9-4e4f-a0f0-70445d81b18c',
                'category_id' => '48cadd7a-6707-4139-b650-4cadc74ca76b',
                'subcategory_id' => '48bb01e2-642d-47c6-be29-6428246aab6c',
                'code' => 'DEF-PENGENDALIAN-RA-45',
                'name' => 'Pengendalian Rayap & Hama (Pest Control)',
                'description' => 'Layanan standar untuk Pengendalian Rayap & Hama (Pest Control)',
            ],
            [
                'id' => '5b2ec846-ee3b-4c6d-8559-11602adb1285',
                'category_id' => '8c927438-8b79-41ff-a8f4-9e2288e8b5b8',
                'subcategory_id' => '90c3e55c-6848-4528-888f-62ff05386466',
                'code' => 'DEF-PENGGANTIAN-FIL-17',
                'name' => 'Penggantian Filter Air & Media Karbon',
                'description' => 'Layanan standar untuk Penggantian Filter Air & Media Karbon',
            ],
            [
                'id' => 'f7163c58-600d-4a6c-994b-0e9349c21468',
                'category_id' => '92438132-1530-4711-8bf2-4d1c631fabf0',
                'subcategory_id' => '4d4d07b3-83e1-4dae-843c-4528d8310cd0',
                'code' => 'DEF-PIPA-AIR-SALU-12',
                'name' => 'Pipa Air & Saluran Mampet',
                'description' => 'Layanan standar untuk Pipa Air & Saluran Mampet',
            ],
            [
                'id' => 'c3e5dc39-c695-4ff3-957a-c8a438a5e42a',
                'category_id' => '48cadd7a-6707-4139-b650-4cadc74ca76b',
                'subcategory_id' => 'b8ba6b07-eea7-4a8c-9849-9b72df539894',
                'code' => 'DEF-POTONG-POHON-40',
                'name' => 'Potong Pohon & Perawatan Taman',
                'description' => 'Layanan standar untuk Potong Pohon & Perawatan Taman',
            ],
            [
                'id' => 'a383fd3b-09f7-4507-9e0e-6913542822a3',
                'category_id' => '06e8f70c-6a07-417c-ba04-38cf26976aef',
                'subcategory_id' => '5751568d-1e28-4014-a3d6-4f1e77db109f',
                'code' => 'DEF-SERVIS-RINGAN-M-44',
                'name' => 'Servis Ringan Motor Injeksi',
                'description' => 'Layanan standar untuk Servis Ringan Motor Injeksi',
            ],
        ];

        foreach ($definitions as $d) {
            ServiceDefinition::updateOrCreate(
                ['id' => $d['id']],
                [
                    'code' => $d['code'],
                    'name' => $d['name'],
                    'normalized_name' => mb_strtolower(trim($d['name'])),
                    'category_id' => $d['category_id'],
                    'subcategory_id' => $d['subcategory_id'],
                    'description' => $d['description'],
                    'status' => 'ACTIVE',
                    'created_by_user_id' => '00000000-0000-0000-0000-000000000000',
                    'lock_version' => 1,
                ]
            );
        }
    }
}
