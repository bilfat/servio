<?php

namespace Tests\Feature;

use App\Models\BusinessApplication;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationProfile;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class AddressPersistenceCR04Test extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Seed standard roles if not present
        if (!Role::where('code', 'CUSTOMER')->exists()) {
            Role::create(['code' => 'CUSTOMER', 'name' => 'Pelanggan', 'scope_type' => 'OWN']);
        }
        if (!Role::where('code', 'SERVICE_PROVIDER')->exists()) {
            Role::create(['code' => 'SERVICE_PROVIDER', 'name' => 'Mitra Bengkel', 'scope_type' => 'ORGANIZATION']);
        }
        if (!Role::where('code', 'ADMIN_OPERATIONS')->exists()) {
            Role::create(['code' => 'ADMIN_OPERATIONS', 'name' => 'Admin Operasional', 'scope_type' => 'PLATFORM']);
        }
    }

    public function test_customer_registration_persists_structured_address_to_database()
    {
        $addressPayload = [
            'province_id' => '31',
            'province_name' => 'DKI JAKARTA',
            'city_id' => '3171',
            'city_name' => 'KOTA JAKARTA SELATAN',
            'district_id' => '3171010',
            'district_name' => 'TEBET',
            'village_id' => '3171010001',
            'village_name' => 'TEBET BARAT',
            'postal_code' => '12810',
            'street_address' => 'Jl. Tebet Barat Raya No. 10',
            'rt_rw' => '003/005',
            'landmark' => 'Sebelah Apotek',
        ];

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi Customer',
            'email' => 'budi.addr.' . uniqid() . '@example.com',
            'phone' => '+62812' . rand(10000000, 99999999),
            'password' => 'Password123!',
            'registration_type' => 'CUSTOMER',
            'address' => $addressPayload,
        ]);

        $response->assertStatus(201);
        $userId = $response->json('data.user_id');

        $profile = UserProfile::where('user_id', $userId)->first();
        $this->assertNotNull($profile);
        $this->assertNotNull($profile->address_json);
        $this->assertEquals('DKI JAKARTA', $profile->address_json['province_name']);
        $this->assertEquals('KOTA JAKARTA SELATAN', $profile->address_json['city_name']);
        $this->assertEquals('TEBET', $profile->address_json['district_name']);
        $this->assertEquals('TEBET BARAT', $profile->address_json['village_name']);
        $this->assertEquals('12810', $profile->address_json['postal_code']);
        $this->assertEquals('Jl. Tebet Barat Raya No. 10', $profile->address_json['street_address']);
    }

    public function test_customer_can_update_address_via_my_profile_without_changing_active_status()
    {
        $user = User::create([
            'email' => 'cust.update.' . uniqid() . '@example.com',
            'password_hash' => bcrypt('Password123!'),
            'status' => 'ACTIVE',
            'authz_version' => 1,
        ]);

        $profile = UserProfile::create([
            'user_id' => $user->id,
            'display_name' => 'Customer Existing',
            'locale' => 'id_ID',
            'address_json' => null, // existing without address
        ]);

        $this->actingAs($user);

        // Verify existing profile has empty address but ACTIVE status
        $getRes = $this->getJson('/api/v1/profiles/me');
        $getRes->assertStatus(200);
        $this->assertEquals('ACTIVE', $getRes->json('data.account_status'));
        $this->assertNull($getRes->json('data.address'));

        // Customer updates address
        $newAddress = [
            'province_id' => '32',
            'province_name' => 'JAWA BARAT',
            'city_id' => '3273',
            'city_name' => 'KOTA BANDUNG',
            'district_id' => '3273010',
            'district_name' => 'COBLONG',
            'village_id' => '3273010001',
            'village_name' => 'DAGO',
            'postal_code' => '40135',
            'street_address' => 'Jl. Ir. H. Juanda No. 100',
            'rt_rw' => '001/002',
            'landmark' => 'Dekat Simpang Dago',
        ];

        $patchRes = $this->patchJson('/api/v1/profiles/me', [
            'address' => $newAddress,
        ]);

        $patchRes->assertStatus(200);
        $this->assertEquals('JAWA BARAT', $patchRes->json('data.address.province_name'));
        $this->assertEquals('KOTA BANDUNG', $patchRes->json('data.address.city_name'));

        // Verify persisted directly in MySQL
        $refreshed = UserProfile::where('user_id', $user->id)->first();
        $this->assertNotNull($refreshed->address_json);
        $this->assertEquals('KOTA BANDUNG', $refreshed->address_json['city_name']);
        $this->assertEquals('ACTIVE', $user->fresh()->status);
    }

    public function test_business_application_persists_address_and_populates_organization_profile_on_approval()
    {
        $admin = User::create([
            'email' => 'admin.' . uniqid() . '@example.com',
            'password_hash' => bcrypt('Password123!'),
            'status' => 'ACTIVE',
            'authz_version' => 1,
        ]);
        $adminRole = Role::where('code', 'ADMIN_OPERATIONS')->first();
        RoleAssignment::create([
            'user_id' => $admin->id,
            'role_id' => $adminRole->id,
            'status' => 'ACTIVE',
            'assigned_at' => now(),
        ]);

        $applicant = User::create([
            'email' => 'applicant.' . uniqid() . '@example.com',
            'password_hash' => bcrypt('Password123!'),
            'status' => 'ACTIVE',
            'authz_version' => 1,
        ]);
        UserProfile::create([
            'user_id' => $applicant->id,
            'display_name' => 'Mitra Pemilik',
            'locale' => 'id_ID',
        ]);

        $structuredAddress = [
            'province_id' => '31',
            'province_name' => 'DKI JAKARTA',
            'city_id' => '3174',
            'city_name' => 'KOTA JAKARTA BARAT',
            'district_id' => '3174020',
            'district_name' => 'KEBON JERUK',
            'village_id' => '3174020004',
            'village_name' => 'KEBON JERUK',
            'postal_code' => '11530',
            'street_address' => 'Jl. Kebon Jeruk Raya No. 45',
            'rt_rw' => '002/008',
            'landmark' => 'Depan Ruko Sentra',
        ];

        $app = BusinessApplication::create([
            'application_code' => 'APP-TEST-' . rand(1000, 9999),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'SERVICE_PROVIDER',
            'status' => 'PENDING_REVIEW',
            'revision_no' => 0,
            'lock_version' => 1,
            'submitted_at' => now(),
            'draft_data_ciphertext' => Crypt::encryptString(json_encode([
                'business' => [
                    'legal_name' => 'PT Jaya Servis Mandiri',
                    'brand_name' => 'Jaya Servis AC',
                    'address' => 'Jl. Kebon Jeruk Raya No. 45',
                    'address_json' => $structuredAddress,
                ],
                'legal' => ['nib' => '9120001234567'],
                'pic' => ['full_name' => 'Mitra Pemilik'],
            ])),
        ]);

        // Admin approves
        $this->actingAs($admin);
        $decisionRes = $this->postJson("/api/v1/admin/business/applications/{$app->id}/decisions", [
            'decision' => 'APPROVE',
            'reason' => 'Data dan alamat valid.',
        ]);

        $decisionRes->assertStatus(200);

        // Verify organization profile has the structured address
        $org = Organization::where('approved_application_id', $app->id)->first();
        $this->assertNotNull($org);
        $orgProf = OrganizationProfile::where('organization_id', $org->id)->first();
        $this->assertNotNull($orgProf);
        $this->assertNotNull($orgProf->address_json);
        $this->assertEquals('KOTA JAKARTA BARAT', $orgProf->address_json['city_name']);
        $this->assertEquals('KEBON JERUK', $orgProf->address_json['district_name']);
        $this->assertEquals('11530', $orgProf->address_json['postal_code']);
    }

    public function test_organization_address_update_authorization()
    {
        $owner = User::create([
            'email' => 'owner.' . uniqid() . '@example.com',
            'password_hash' => bcrypt('Password123!'),
            'status' => 'ACTIVE',
            'authz_version' => 1,
        ]);
        $stranger = User::create([
            'email' => 'stranger.' . uniqid() . '@example.com',
            'password_hash' => bcrypt('Password123!'),
            'status' => 'ACTIVE',
            'authz_version' => 1,
        ]);

        $org = Organization::create([
            'type' => 'MERCHANT',
            'status' => 'ACTIVE',
        ]);
        $prof = OrganizationProfile::create([
            'organization_id' => $org->id,
            'legal_name' => 'Toko Hendra Elektronik',
            'display_name' => 'Hendra Parts',
            'address_json' => ['city_name' => 'KOTA JAKARTA BARAT'],
        ]);

        Membership::create([
            'user_id' => $owner->id,
            'organization_id' => $org->id,
            'kind' => 'OWNER',
            'status' => 'ACTIVE',
        ]);

        // Stranger attempts to edit org address -> 403
        $this->actingAs($stranger);
        $failRes = $this->patchJson("/api/v1/organizations/{$org->id}", [
            'address' => ['city_name' => 'KOTA SURABAYA'],
        ]);
        $failRes->assertStatus(403);

        // Owner edits org address -> 200
        $this->actingAs($owner);
        $okRes = $this->patchJson("/api/v1/organizations/{$org->id}", [
            'address_json' => [
                'province_name' => 'DKI JAKARTA',
                'city_name' => 'KOTA JAKARTA BARAT',
                'district_name' => 'TAMAN SARI',
                'village_name' => 'GLODOK',
                'postal_code' => '11180',
                'street_address' => 'Harco Glodok Blok A No. 15',
            ],
        ]);
        $okRes->assertStatus(200);

        $prof->refresh();
        $this->assertEquals('GLODOK', $prof->address_json['village_name']);
        $this->assertEquals('11180', $prof->address_json['postal_code']);
    }
}
