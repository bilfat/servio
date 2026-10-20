<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Models\UserAddress;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CustomerAddressBookTest extends TestCase
{
    use DatabaseTransactions;

    protected User $customer;
    protected User $otherCustomer;

    protected function setUp(): void
    {
        parent::setUp();

        $custRole = Role::firstOrCreate(['code' => 'CUSTOMER'], ['name' => 'Customer', 'is_active' => true]);

        $this->customer = User::create([
            'email' => 'test_cust_' . uniqid() . '@servio.id',
            'phone_e164' => '+62811' . rand(1000000, 9999999),
            'password_hash' => bcrypt('Password123!'),
            'status' => 'ACTIVE',
        ]);
        UserProfile::create([
            'user_id' => $this->customer->id,
            'display_name' => 'Test Customer',
        ]);
        RoleAssignment::create([
            'user_id' => $this->customer->id,
            'role_id' => $custRole->id,
            'status' => 'ACTIVE',
        ]);

        $this->otherCustomer = User::create([
            'email' => 'other_cust_' . uniqid() . '@servio.id',
            'phone_e164' => '+62812' . rand(1000000, 9999999),
            'password_hash' => bcrypt('Password123!'),
            'status' => 'ACTIVE',
        ]);
        UserProfile::create([
            'user_id' => $this->otherCustomer->id,
            'display_name' => 'Other Customer',
        ]);
    }

    public function test_customer_can_list_work_addresses_from_database(): void
    {
        UserAddress::create([
            'user_id' => $this->customer->id,
            'label' => 'Rumah Utama',
            'recipient_name' => 'Test Customer',
            'phone' => '+62811223344',
            'address_line' => 'Jl. Gatot Subroto No. 12',
            'city' => 'Jakarta Selatan',
            'province' => 'DKI Jakarta',
            'district' => 'Kebayoran Baru',
            'postal_code' => '12190',
            'is_default' => true,
            'status' => 'ACTIVE',
        ]);

        $res = $this->actingAs($this->customer, 'web')
            ->getJson('/api/v1/me/addresses');

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('Rumah Utama', $res->json('data.0.label'));
        $this->assertEquals('Jl. Gatot Subroto No. 12', $res->json('data.0.addressLine'));
        $this->assertTrue($res->json('data.0.isDefault'));
    }

    public function test_customer_can_create_new_address_persisting_to_database(): void
    {
        $payload = [
            'label' => 'Apartemen Sudirman',
            'recipientName' => 'Budi Santoso',
            'phone' => '081299887766',
            'addressLine' => 'Tower A Lantai 15 Unit 02',
            'city' => 'Jakarta Selatan',
            'district' => 'Setiabudi',
            'province' => 'DKI Jakarta',
            'postalCode' => '12920',
            'latitude' => -6.2155,
            'longitude' => 106.8200,
            'isDefault' => true,
        ];

        $res = $this->actingAs($this->customer, 'web')
            ->postJson('/api/v1/me/addresses', $payload);

        $res->assertStatus(201);
        $res->assertJsonPath('success', true);
        $this->assertEquals('Apartemen Sudirman', $res->json('data.label'));
        $this->assertEquals('Tower A Lantai 15 Unit 02', $res->json('data.addressLine'));

        // Verify in MySQL database
        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $this->customer->id,
            'label' => 'Apartemen Sudirman',
            'address_line' => 'Tower A Lantai 15 Unit 02',
            'city' => 'Jakarta Selatan',
            'district' => 'Setiabudi',
            'postal_code' => '12920',
            'is_default' => 1,
        ]);
    }

    public function test_customer_can_update_address_and_toggle_default(): void
    {
        $addr1 = UserAddress::create([
            'user_id' => $this->customer->id,
            'label' => 'Alamat Awal',
            'address_line' => 'Jl. Tebet Raya No. 1',
            'city' => 'Jakarta Selatan',
            'is_default' => true,
        ]);

        $addr2 = UserAddress::create([
            'user_id' => $this->customer->id,
            'label' => 'Alamat Kedua',
            'address_line' => 'Jl. Tebet Barat No. 5',
            'city' => 'Jakarta Selatan',
            'is_default' => false,
        ]);

        // Update addr2 to be default
        $res = $this->actingAs($this->customer, 'web')
            ->patchJson("/api/v1/me/addresses/{$addr2->id}", [
                'label' => 'Alamat Kedua (Updated)',
                'isDefault' => true,
            ]);

        $res->assertStatus(200);
        $this->assertEquals('Alamat Kedua (Updated)', $res->json('data.label'));
        $this->assertTrue($res->json('data.isDefault'));

        // Verify addr1 is no longer default in database
        $this->assertDatabaseHas('user_addresses', [
            'id' => $addr1->id,
            'is_default' => 0,
        ]);
        $this->assertDatabaseHas('user_addresses', [
            'id' => $addr2->id,
            'label' => 'Alamat Kedua (Updated)',
            'is_default' => 1,
        ]);
    }

    public function test_customer_can_delete_address_and_promote_remaining(): void
    {
        $addr1 = UserAddress::create([
            'user_id' => $this->customer->id,
            'label' => 'Alamat 1',
            'address_line' => 'Jl. Mampang No. 1',
            'city' => 'Jakarta Selatan',
            'is_default' => true,
        ]);

        $addr2 = UserAddress::create([
            'user_id' => $this->customer->id,
            'label' => 'Alamat 2',
            'address_line' => 'Jl. Kuningan No. 2',
            'city' => 'Jakarta Selatan',
            'is_default' => false,
        ]);

        $res = $this->actingAs($this->customer, 'web')
            ->deleteJson("/api/v1/me/addresses/{$addr1->id}");

        $res->assertStatus(200);

        // Verify deleted from database
        $this->assertDatabaseMissing('user_addresses', [
            'id' => $addr1->id,
        ]);

        // Verify remaining address promoted to default
        $this->assertDatabaseHas('user_addresses', [
            'id' => $addr2->id,
            'is_default' => 1,
        ]);
    }

    public function test_customer_cannot_modify_other_user_address(): void
    {
        $otherAddr = UserAddress::create([
            'user_id' => $this->otherCustomer->id,
            'label' => 'Private Other',
            'address_line' => 'Jl. Rahasia',
            'city' => 'Bandung',
            'is_default' => true,
        ]);

        $res = $this->actingAs($this->customer, 'web')
            ->deleteJson("/api/v1/me/addresses/{$otherAddr->id}");

        $res->assertStatus(404);
        $this->assertDatabaseHas('user_addresses', [
            'id' => $otherAddr->id,
        ]);
    }
}
