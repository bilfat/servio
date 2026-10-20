<?php

namespace Database\Seeders;

use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationProfile;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\StaffOnboarding;
use App\Models\StaffOnboardingStep;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed the 9 Canonical Roles
        $rolesData = [
            'CUSTOMER' => 'Customer / Pengguna Jasa',
            'SERVICE_PROVIDER' => 'Service Provider / Mitra Bengkel',
            'WORKER_TECHNICIAN' => 'Worker Technician / Teknisi Lapangan',
            'MERCHANT' => 'Merchant / Toko Sparepart Retail',
            'SUPPLIER' => 'Supplier / Distributor B2B Principal',
            'CUSTOMER_SUPPORT' => 'Customer Support / Layanan Bantuan',
            'FINANCE_PAYMENT_OPS' => 'Finance & Escrow / Operasional Keuangan',
            'ADMIN_OPERATIONS' => 'Admin Operations / Verifikasi',
            'CEO_PRODUCT_OWNER' => 'CEO & Product Owner / Eksekutif',
        ];

        $roles = [];
        foreach ($rolesData as $code => $name) {
            $roles[$code] = Role::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'is_system' => true,
                    'is_active' => true,
                ]
            );
        }

        // 2. Seed Identity Permissions Registry
        $permissionsData = [
            ['code' => 'identity.profile.read_own', 'resource' => 'profile', 'action' => 'read', 'scope_type' => 'OWN'],
            ['code' => 'identity.profile.update_own', 'resource' => 'profile', 'action' => 'update', 'scope_type' => 'OWN'],
            ['code' => 'identity.kyc.submit_own', 'resource' => 'kyc', 'action' => 'submit', 'scope_type' => 'OWN'],
            ['code' => 'identity.kyc.review', 'resource' => 'kyc', 'action' => 'review', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.profile.sensitive_change.review', 'resource' => 'profile', 'action' => 'review_sensitive', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.business.application.create', 'resource' => 'business_application', 'action' => 'create', 'scope_type' => 'OWN'],
            ['code' => 'identity.business.application.update_own', 'resource' => 'business_application', 'action' => 'update', 'scope_type' => 'OWN'],
            ['code' => 'identity.business.application.review', 'resource' => 'business_application', 'action' => 'review', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.organization.profile.manage', 'resource' => 'organization', 'action' => 'manage', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'identity.provider.worker.manage', 'resource' => 'worker', 'action' => 'manage', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'identity.staff.create', 'resource' => 'staff', 'action' => 'create', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.staff.read', 'resource' => 'staff', 'action' => 'read', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.staff.access.manage', 'resource' => 'staff', 'action' => 'manage_access', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.staff.lifecycle.manage', 'resource' => 'staff', 'action' => 'manage_lifecycle', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.account.suspend', 'resource' => 'account', 'action' => 'suspend', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.account.read_scoped', 'resource' => 'account', 'action' => 'read_scoped', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.audit.read_scoped', 'resource' => 'audit', 'action' => 'read', 'scope_type' => 'GLOBAL'],
            ['code' => 'identity.auth.session.manage_own', 'resource' => 'session', 'action' => 'manage', 'scope_type' => 'OWN'],
        ];

        $permissions = [];
        foreach ($permissionsData as $pData) {
            $permissions[$pData['code']] = Permission::updateOrCreate(
                ['code' => $pData['code']],
                array_merge($pData, ['owner_service' => 'identity-service', 'is_active' => true])
            );
        }

        // 3. Map Roles to Permissions
        $rolePermissions = [
            'CEO_PRODUCT_OWNER' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
                'identity.staff.create',
                'identity.staff.read',
                'identity.staff.access.manage',
                'identity.staff.lifecycle.manage',
                'identity.audit.read_scoped',
            ],
            'ADMIN_OPERATIONS' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
                'identity.kyc.review',
                'identity.profile.sensitive_change.review',
                'identity.business.application.review',
                'identity.account.suspend',
                'identity.account.read_scoped',
                'identity.audit.read_scoped',
            ],
            'SERVICE_PROVIDER' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
                'identity.business.application.update_own',
                'identity.organization.profile.manage',
                'identity.provider.worker.manage',
            ],
            'MERCHANT' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
                'identity.business.application.update_own',
                'identity.organization.profile.manage',
            ],
            'SUPPLIER' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
                'identity.business.application.update_own',
                'identity.organization.profile.manage',
            ],
            'CUSTOMER' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
                'identity.kyc.submit_own',
                'identity.business.application.create',
                'identity.business.application.update_own',
            ],
            'WORKER_TECHNICIAN' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
            ],
            'CUSTOMER_SUPPORT' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
            ],
            'FINANCE_PAYMENT_OPS' => [
                'identity.profile.read_own',
                'identity.profile.update_own',
                'identity.auth.session.manage_own',
            ],
        ];

        foreach ($rolePermissions as $rCode => $permCodes) {
            $roleModel = $roles[$rCode] ?? null;
            if ($roleModel) {
                $permIds = [];
                foreach ($permCodes as $pCode) {
                    if (isset($permissions[$pCode])) {
                        $permIds[] = $permissions[$pCode]->id;
                    }
                }
                $roleModel->permissions()->syncWithoutDetaching($permIds);
            }
        }

        // 4. Seed Canonical 9 Users from GLOBAL DEVELOPMENT RULES
        $defaultPassword = Hash::make('12345678');
        $ceoPassword = Hash::make('ServioCeo2026!'); // CEO fallback also accepts 12345678

        $accounts = [
            'CEO_PRODUCT_OWNER' => [
                'name' => 'Michael Surya',
                'email' => 'ceo@servio.id',
                'phone' => '+628119988771',
                'password' => $defaultPassword,
                'employee_id' => 'CEO-001',
                'department' => 'Executive Office',
                'role' => 'CEO_PRODUCT_OWNER',
            ],
            'ADMIN_OPERATIONS' => [
                'name' => 'Siti Rahmawati',
                'email' => 'admin@servio.id',
                'phone' => '+628121122334',
                'password' => $defaultPassword,
                'employee_id' => 'ADM-001',
                'department' => 'Operations & Verification',
                'role' => 'ADMIN_OPERATIONS',
            ],
            'CUSTOMER' => [
                'name' => 'Ahmad Fauzi',
                'email' => 'customer@servio.id',
                'phone' => '+6281234567890',
                'password' => $defaultPassword,
                'role' => 'CUSTOMER',
            ],
            'SERVICE_PROVIDER' => [
                'name' => 'Budi Santoso',
                'email' => 'provider@servio.id',
                'phone' => '+628163344556',
                'password' => $defaultPassword,
                'role' => 'SERVICE_PROVIDER',
                'org_name' => 'PT Servio Mandiri Teknik',
                'org_type' => 'PROVIDER',
                'reg_no' => 'REG-2026-0001',
                'nib' => '9120001234567',
            ],
            'MERCHANT' => [
                'name' => 'Ko Hendra',
                'email' => 'merchant@servio.id',
                'phone' => '+628174455667',
                'password' => $defaultPassword,
                'role' => 'MERCHANT',
                'org_name' => 'Sinar AC & Sparepart Glodok',
                'org_type' => 'MERCHANT',
                'reg_no' => 'REG-2026-0002',
                'nib' => '8120009922331',
            ],
            'SUPPLIER' => [
                'name' => 'Suryanto Wijaya',
                'email' => 'supplier@servio.id',
                'phone' => '+628185566778',
                'password' => $defaultPassword,
                'role' => 'SUPPLIER',
                'org_name' => 'PT Nusantara Parts Prima',
                'org_type' => 'SUPPLIER',
                'reg_no' => 'REG-2026-0003',
                'nib' => '9120005544332',
            ],
            'WORKER_TECHNICIAN' => [
                'name' => 'Bambang Sudirman',
                'email' => 'worker@servio.id',
                'phone' => '+628196677889',
                'password' => $defaultPassword,
                'employee_id' => 'WRK-001',
                'role' => 'WORKER_TECHNICIAN',
            ],
            'CUSTOMER_SUPPORT' => [
                'name' => 'Rina Oktaviani',
                'email' => 'support@servio.id',
                'phone' => '+628127788990',
                'password' => $defaultPassword,
                'employee_id' => 'CS-001',
                'department' => 'Customer Care & Mediation',
                'role' => 'CUSTOMER_SUPPORT',
            ],
            'CUSTOMER_SUPPORT_CS' => [
                'name' => 'Customer Support Servio',
                'email' => 'cs@servio.id',
                'phone' => '+628127788999',
                'password' => $defaultPassword,
                'employee_id' => 'CS-002',
                'department' => 'Customer Care & Mediation',
                'role' => 'CUSTOMER_SUPPORT',
            ],
            'FINANCE_PAYMENT_OPS' => [
                'name' => 'Hendrik Wijaya',
                'email' => 'finance@servio.id',
                'phone' => '+628138899001',
                'password' => $defaultPassword,
                'employee_id' => 'FIN-001',
                'department' => 'Finance & Escrow',
                'role' => 'FINANCE_PAYMENT_OPS',
            ],
        ];

        $createdUsers = [];
        $createdOrgs = [];

        foreach ($accounts as $roleKey => $acc) {
            $user = User::updateOrCreate(
                ['email' => $acc['email']],
                [
                    'phone_e164' => $acc['phone'],
                    'password_hash' => $acc['password'],
                    'status' => 'ACTIVE',
                    'authz_version' => 1,
                    'email_verified_at' => now(),
                    'phone_verified_at' => now(),
                    'last_login_at' => now(),
                ]
            );

            UserProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'display_name' => $acc['name'],
                    'employee_id' => $acc['employee_id'] ?? null,
                    'department' => $acc['department'] ?? null,
                    'photo_path' => '/brand/logo.png',
                    'locale' => 'id_ID',
                ]
            );

            $createdUsers[$roleKey] = $user;

            // Handle Organization for business accounts
            $membershipId = null;
            if (isset($acc['org_name'])) {
                $existingOrgProf = OrganizationProfile::where('legal_name', $acc['org_name'])->first();
                if ($existingOrgProf) {
                    $org = Organization::find($existingOrgProf->organization_id);
                } else {
                    $org = Organization::create([
                        'type' => $acc['org_type'],
                        'status' => 'ACTIVE',
                        'activated_at' => now(),
                    ]);

                    OrganizationProfile::create([
                        'organization_id' => $org->id,
                        'legal_name' => $acc['org_name'],
                        'display_name' => $acc['org_name'],
                        'business_email' => $acc['email'],
                        'business_phone' => $acc['phone'],
                        'nib_ciphertext' => Crypt::encryptString($acc['nib']),
                        'nib_lookup_hash' => hash('sha256', $acc['nib']),
                        'npwp_ciphertext' => Crypt::encryptString('01.234.567.8-901.000'),
                        'npwp_lookup_hash' => hash('sha256', '01.234.567.8-901.000'),
                    ]);
                }

                $membership = Membership::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'organization_id' => $org->id,
                        'kind' => 'OWNER',
                    ],
                    [
                        'status' => 'ACTIVE',
                        'started_at' => now(),
                    ]
                );

                $membershipId = $membership->id;
                $createdOrgs[$acc['org_type']] = $org;
            }

            // Assign main role
            $roleModel = $roles[$acc['role']];
            RoleAssignment::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'role_id' => $roleModel->id,
                ],
                [
                    'membership_id' => $membershipId,
                    'status' => 'ACTIVE',
                    'assigned_at' => now(),
                ]
            );

            // Staff Onboarding for CS, Finance, Admin
            if (in_array($acc['role'], ['ADMIN_OPERATIONS', 'CUSTOMER_SUPPORT', 'FINANCE_PAYMENT_OPS'])) {
                $ceoUser = $createdUsers['CEO_PRODUCT_OWNER'] ?? $user;
                $onboarding = StaffOnboarding::updateOrCreate(
                    ['staff_user_id' => $user->id],
                    [
                        'status' => 'OPERATIONAL_READY',
                        'completed_at' => now(),
                        'created_by' => $ceoUser->id,
                        'last_verified_at' => now(),
                    ]
                );

                foreach (['PROFILE', 'EMPLOYEE_KYC', 'NDA', 'ACCESS_CONFIRMATION'] as $stepKey) {
                    StaffOnboardingStep::updateOrCreate(
                        [
                            'onboarding_id' => $onboarding->id,
                            'step_key' => $stepKey,
                        ],
                        [
                            'status' => 'COMPLETED',
                            'document_version' => '1.0',
                            'completed_at' => now(),
                            'reviewed_by' => $ceoUser->id,
                        ]
                    );
                }
            }
        }

        // Link Worker to Provider's Organization
        $workerUser = $createdUsers['WORKER_TECHNICIAN'];
        $providerOrg = $createdOrgs['PROVIDER'] ?? Organization::where('type', 'PROVIDER')->first();
        if ($workerUser && $providerOrg) {
            $existingWorkerMembership = Membership::where('user_id', $workerUser->id)
                ->where('kind', 'WORKER')
                ->where('status', 'ACTIVE')
                ->first();

            $workerMembership = $existingWorkerMembership ?? Membership::create([
                'user_id' => $workerUser->id,
                'organization_id' => $providerOrg->id,
                'kind' => 'WORKER',
                'status' => 'ACTIVE',
                'started_at' => now(),
            ]);

            RoleAssignment::where('user_id', $workerUser->id)
                ->where('role_id', $roles['WORKER_TECHNICIAN']->id)
                ->update(['membership_id' => $workerMembership->id]);
        }

        // Seed default addresses for Customer
        $customerUser = $createdUsers['CUSTOMER'] ?? User::where('email', 'customer@servio.id')->first();
        if ($customerUser) {
            \App\Models\UserAddress::updateOrCreate(
                [
                    'user_id' => $customerUser->id,
                    'label' => 'Rumah Utama',
                ],
                [
                    'recipient_name' => 'Ahmad Fauzi',
                    'phone' => '+628163344556',
                    'address_line' => 'Jl. Sudirman No. 45',
                    'district' => 'Kebayoran Baru',
                    'city' => 'Jakarta Selatan',
                    'province' => 'DKI Jakarta',
                    'postal_code' => '12190',
                    'latitude' => -6.2297,
                    'longitude' => 106.8075,
                    'is_default' => true,
                    'status' => 'ACTIVE',
                ]
            );

            \App\Models\UserAddress::updateOrCreate(
                [
                    'user_id' => $customerUser->id,
                    'label' => 'Kantor',
                ],
                [
                    'recipient_name' => 'Ahmad Fauzi',
                    'phone' => '+628163344556',
                    'address_line' => 'Gedung BEI Tower 2 Lt. 14, SCBD',
                    'district' => 'Kebayoran Baru',
                    'city' => 'Jakarta Selatan',
                    'province' => 'DKI Jakarta',
                    'postal_code' => '12190',
                    'latitude' => -6.2235,
                    'longitude' => 106.8088,
                    'is_default' => false,
                    'status' => 'ACTIVE',
                ]
            );
        }
    }
}
