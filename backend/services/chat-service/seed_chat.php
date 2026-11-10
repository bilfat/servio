<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\UserPresence;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

echo "Seeding live chat database...\n";

// Clear previous test records
DB::statement('SET FOREIGN_KEY_CHECKS=0;');
Message::truncate();
ConversationParticipant::truncate();
Conversation::truncate();
UserPresence::truncate();
DB::statement('SET FOREIGN_KEY_CHECKS=1;');

$now = now();

// Canonical Users
$customer = [
    'id' => '692f03fd-2362-485a-9a23-a672bbb4533f',
    'name' => 'Ahmad Fauzi',
    'entity_type' => 'customer',
    'avatar' => '/brand/logo.png',
];

$worker = [
    'id' => 'acfdfc27-9ba5-472f-bec1-3c372f47fff6',
    'entity_id' => 'acfdfc27-9ba5-472f-bec1-3c372f47fff6',
    'name' => 'Ahmad Teknisi',
    'entity_type' => 'worker',
    'avatar' => '/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg',
];

$provider = [
    'id' => '8ecc27f5-d30e-401e-89d5-aceec765a19a',
    'entity_id' => '0740d857-b665-4191-aaf5-d7dd3611dc1d',
    'name' => 'sukses gembira (Budi Santoso)',
    'entity_type' => 'provider',
    'avatar' => '/brand/logo.png',
];

$merchant = [
    'id' => '4bee4c28-6799-4054-87a3-321e29811921',
    'entity_id' => '0c1467e7-af68-4b26-ae84-daa41d51aed0',
    'name' => 'BUDIAJASA (Ko Hendra)',
    'entity_type' => 'merchant',
    'avatar' => '/brand/logo.png',
];

// 1. Presences
foreach ([$customer, $worker, $provider, $merchant] as $u) {
    UserPresence::create([
        'user_id' => $u['id'],
        'is_online' => true,
        'last_seen_at' => $now,
    ]);
}

// -------------------------------------------------------------
// Conversation 1: Customer <-> Worker (Ahmad Teknisi)
// -------------------------------------------------------------
$conv1 = Conversation::create([
    'id' => (string) Str::uuid(),
    'type' => 'direct',
    'created_at' => $now->copy()->subMinutes(30),
    'updated_at' => $now->copy()->subMinutes(2),
]);

ConversationParticipant::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv1->id,
    'user_id' => $customer['id'],
    'entity_type' => 'customer',
    'entity_id' => $customer['id'],
    'display_name' => $customer['name'],
    'avatar_url' => $customer['avatar'],
    'unread_count' => 0,
    'last_read_at' => $now,
]);

ConversationParticipant::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv1->id,
    'user_id' => $worker['id'],
    'entity_type' => 'worker',
    'entity_id' => $worker['id'],
    'display_name' => $worker['name'],
    'avatar_url' => $worker['avatar'],
    'unread_count' => 0,
    'last_read_at' => $now,
]);

$m1_1 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv1->id,
    'sender_id' => $worker['id'],
    'sender_entity_type' => 'worker',
    'client_msg_id' => 'seed-1-1',
    'type' => 'text',
    'body' => 'Selamat siang Pak Ahmad, saya teknisi dari PT Servio Mandiri Teknik yang bertugas untuk pengerjaan Cuci AC hari ini.',
    'status' => 'read',
    'created_at' => $now->copy()->subMinutes(25),
]);

$m1_2 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv1->id,
    'sender_id' => $customer['id'],
    'sender_entity_type' => 'customer',
    'client_msg_id' => 'seed-1-2',
    'type' => 'text',
    'body' => 'Siang Mas Ahmad. Kira-kira estimasi tiba jam berapa ya?',
    'status' => 'read',
    'created_at' => $now->copy()->subMinutes(20),
]);

$m1_3 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv1->id,
    'sender_id' => $worker['id'],
    'sender_entity_type' => 'worker',
    'client_msg_id' => 'seed-1-3',
    'type' => 'text',
    'body' => 'Sekitar 15 menit lagi Pak. Saya membawa peralatan steam bertekanan dan cover plastik pelindung dinding.',
    'status' => 'read',
    'created_at' => $now->copy()->subMinutes(15),
]);

$m1_4 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv1->id,
    'sender_id' => $worker['id'],
    'sender_entity_type' => 'worker',
    'client_msg_id' => 'seed-1-4',
    'type' => 'text',
    'body' => 'Halo Pak Ahmad, saya sudah dekat komplek. Tolong bantu infokan ke pos satpam ya.',
    'status' => 'delivered',
    'created_at' => $now->copy()->subMinutes(2),
]);

$conv1->update([
    'last_message_id' => $m1_4->id,
    'last_message_at' => $m1_4->created_at,
]);

// -------------------------------------------------------------
// Conversation 2: Customer <-> Provider Jasa (Budi Santoso)
// -------------------------------------------------------------
$conv2 = Conversation::create([
    'id' => (string) Str::uuid(),
    'type' => 'direct',
    'created_at' => $now->copy()->subHours(2),
    'updated_at' => $now->copy()->subMinutes(10),
]);

ConversationParticipant::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv2->id,
    'user_id' => $customer['id'],
    'entity_type' => 'customer',
    'entity_id' => $customer['id'],
    'display_name' => $customer['name'],
    'avatar_url' => $customer['avatar'],
    'unread_count' => 0,
    'last_read_at' => $now,
]);

ConversationParticipant::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv2->id,
    'user_id' => $provider['id'],
    'entity_type' => 'provider',
    'entity_id' => $provider['entity_id'],
    'display_name' => $provider['name'],
    'avatar_url' => $provider['avatar'],
    'unread_count' => 0,
    'last_read_at' => $now,
]);

$m2_1 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv2->id,
    'sender_id' => $customer['id'],
    'sender_entity_type' => 'customer',
    'client_msg_id' => 'seed-2-1',
    'type' => 'context_order',
    'body' => 'Halo admin Budi, apakah garansi pengerjaan 30 hari sudah termasuk penggantian freon?',
    'context_metadata' => [
        'order_id' => 'ORD-JASA-2026-9901',
        'title' => 'Perbaikan & Servis AC Bocor 1 PK',
        'price' => 175000,
        'status' => 'Teknisi Menuju Lokasi',
    ],
    'status' => 'read',
    'created_at' => $now->copy()->subMinutes(40),
]);

$m2_2 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv2->id,
    'sender_id' => $provider['id'],
    'sender_entity_type' => 'provider',
    'client_msg_id' => 'seed-2-2',
    'type' => 'text',
    'body' => 'Halo Pak Ahmad, betul sekali! Garansi pengerjaan 30 hari mencakup pemeriksaan kebocoran ulang dan garansi dingin tanpa biaya tambahan.',
    'status' => 'read',
    'created_at' => $now->copy()->subMinutes(10),
]);

$conv2->update([
    'last_message_id' => $m2_2->id,
    'last_message_at' => $m2_2->created_at,
]);

// -------------------------------------------------------------
// Conversation 3: Customer <-> Merchant Toko (Ko Hendra)
// -------------------------------------------------------------
$conv3 = Conversation::create([
    'id' => (string) Str::uuid(),
    'type' => 'direct',
    'created_at' => $now->copy()->subHours(4),
    'updated_at' => $now->copy()->subMinutes(5),
]);

ConversationParticipant::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv3->id,
    'user_id' => $customer['id'],
    'entity_type' => 'customer',
    'entity_id' => $customer['id'],
    'display_name' => $customer['name'],
    'avatar_url' => $customer['avatar'],
    'unread_count' => 0,
    'last_read_at' => $now,
]);

ConversationParticipant::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv3->id,
    'user_id' => $merchant['id'],
    'entity_type' => 'merchant',
    'entity_id' => $merchant['entity_id'],
    'display_name' => $merchant['name'],
    'avatar_url' => $merchant['avatar'],
    'unread_count' => 0,
    'last_read_at' => $now,
]);

$m3_1 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv3->id,
    'sender_id' => $customer['id'],
    'sender_entity_type' => 'customer',
    'client_msg_id' => 'seed-3-1',
    'type' => 'context_catalog',
    'body' => 'Siang Ko Hendra, apakah stok kapasitor ini original dan ready kirim hari ini?',
    'context_metadata' => [
        'catalog_id' => 'prod-cap-01',
        'title' => 'Kapasitor AC Panasonic 25uF 450V Original',
        'price' => 45000,
        'status' => 'Stok Tersedia',
    ],
    'status' => 'read',
    'created_at' => $now->copy()->subMinutes(30),
]);

$m3_2 = Message::create([
    'id' => (string) Str::uuid(),
    'conversation_id' => $conv3->id,
    'sender_id' => $merchant['id'],
    'sender_entity_type' => 'merchant',
    'client_msg_id' => 'seed-3-2',
    'type' => 'text',
    'body' => 'Siang Pak! Barang original 100%, stok ready dan bisa langsung dipickup kurir instan siang ini.',
    'status' => 'read',
    'created_at' => $now->copy()->subMinutes(5),
]);

$conv3->update([
    'last_message_id' => $m3_2->id,
    'last_message_at' => $m3_2->created_at,
]);

echo "Seeded 3 real conversations successfully!\n";

