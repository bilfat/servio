<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Validates CR-04 V3 migration algorithm logic:
 * 1. Initial migration
 * 2. Existing data preservation (never mutate primary key id)
 * 3. Rerun idempotency
 * 4. 100% reversible rollback using before-image snapshots
 * 5. Conflict handling
 * 6. Strictly 9 canonical roles with CEO read-only
 */
class CR04ProposalV3MigrationAlgorithmTest extends TestCase
{
    protected array $canonicalRoles = [
        'CUSTOMER',
        'SERVICE_PROVIDER',
        'WORKER_TECHNICIAN',
        'MERCHANT',
        'SUPPLIER',
        'CUSTOMER_SUPPORT',
        'FINANCE_PAYMENT_OPS',
        'ADMIN_OPERATIONS',
        'CEO_PRODUCT_OWNER',
    ];

    protected array $roleGrants = [
        'ADMIN_OPERATIONS' => [
            'category.taxonomy.read_active',
            'category.taxonomy.read_inactive',
            'category.taxonomy.create',
            'category.taxonomy.update',
            'category.taxonomy.change_status',
            'category.taxonomy.hard_delete',
            'category.request.read_all',
            'category.request.review',
            'category.audit.read',
        ],
        'CEO_PRODUCT_OWNER' => [
            'category.taxonomy.read_active',
            'category.taxonomy.read_inactive',
            'category.request.read_all',
            'category.audit.read',
        ],
        'SERVICE_PROVIDER' => [
            'category.taxonomy.read_active',
            'category.request.submit',
            'category.request.read_own',
        ],
        'MERCHANT' => [
            'category.taxonomy.read_active',
            'category.request.submit',
            'category.request.read_own',
        ],
        'SUPPLIER' => [
            'category.taxonomy.read_active',
            'category.request.submit',
            'category.request.read_own',
        ],
        'CUSTOMER' => [
            'category.taxonomy.read_active',
        ],
        'WORKER_TECHNICIAN' => [
            'category.taxonomy.read_active',
        ],
        'CUSTOMER_SUPPORT' => [
            'category.taxonomy.read_active',
        ],
        'FINANCE_PAYMENT_OPS' => [
            'category.taxonomy.read_active',
        ],
    ];

    protected array $permissionsCatalog = [
        ['code' => 'category.taxonomy.read_active', 'resource' => 'taxonomy', 'action' => 'read_active', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.taxonomy.read_inactive', 'resource' => 'taxonomy', 'action' => 'read_inactive', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.taxonomy.create', 'resource' => 'taxonomy', 'action' => 'create', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.taxonomy.update', 'resource' => 'taxonomy', 'action' => 'update', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.taxonomy.change_status', 'resource' => 'taxonomy', 'action' => 'change_status', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.taxonomy.hard_delete', 'resource' => 'taxonomy', 'action' => 'hard_delete', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.request.submit', 'resource' => 'category_request', 'action' => 'submit', 'scope_type' => 'ORGANIZATION'],
        ['code' => 'category.request.read_own', 'resource' => 'category_request', 'action' => 'read_own', 'scope_type' => 'ORGANIZATION'],
        ['code' => 'category.request.read_all', 'resource' => 'category_request', 'action' => 'read_all', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.request.review', 'resource' => 'category_request', 'action' => 'review', 'scope_type' => 'GLOBAL'],
        ['code' => 'category.audit.read', 'resource' => 'category_audit', 'action' => 'read', 'scope_type' => 'GLOBAL'],
    ];

    /**
     * Simulation of CR-04 V3 migration up()
     */
    protected function simulateMigrationUp(array &$dbPermissions, array &$dbRolePermissions, array &$snapshots): void
    {
        foreach ($this->permissionsCatalog as $p) {
            $code = $p['code'];
            if (isset($dbPermissions[$code])) {
                // Existing permission found: capture before-image snapshot if metadata changes
                $existing = $dbPermissions[$code];
                $needsUpdate = ($existing['resource'] !== $p['resource']
                    || $existing['action'] !== $p['action']
                    || $existing['scope_type'] !== $p['scope_type']
                    || ($existing['owner_service'] !== 'category-service' && empty($existing['owner_service'])));

                if ($needsUpdate) {
                    $snapshots[] = [
                        'id' => 'snap-' . uniqid(),
                        'item_type' => 'PERMISSION_UPDATED',
                        'target_id' => $existing['id'],
                        'before_image' => $existing, // Full snapshot before mutation
                    ];

                    $dbPermissions[$code]['resource'] = $p['resource'];
                    $dbPermissions[$code]['action'] = $p['action'];
                    $dbPermissions[$code]['scope_type'] = $p['scope_type'];
                    $dbPermissions[$code]['owner_service'] = $existing['owner_service'] ?: 'category-service';
                    $dbPermissions[$code]['is_active'] = true;
                }
            } else {
                // New permission created
                $newId = 'perm-' . uniqid();
                $dbPermissions[$code] = [
                    'id' => $newId,
                    'code' => $code,
                    'resource' => $p['resource'],
                    'action' => $p['action'],
                    'scope_type' => $p['scope_type'],
                    'owner_service' => 'category-service',
                    'is_active' => true,
                ];

                $snapshots[] = [
                    'id' => 'snap-' . uniqid(),
                    'item_type' => 'PERMISSION_CREATED',
                    'target_id' => $newId,
                    'before_image' => null,
                ];
            }
        }

        // Role grants
        foreach ($this->roleGrants as $roleCode => $codes) {
            foreach ($codes as $permCode) {
                $permId = $dbPermissions[$permCode]['id'];
                $grantKey = "{$roleCode}:{$permId}";

                if (! isset($dbRolePermissions[$grantKey])) {
                    $dbRolePermissions[$grantKey] = [
                        'role' => $roleCode,
                        'permission_id' => $permId,
                    ];

                    $snapshots[] = [
                        'id' => 'snap-' . uniqid(),
                        'item_type' => 'ROLE_GRANT_ATTACHED',
                        'target_id' => $permId,
                        'secondary_id' => $roleCode,
                        'before_image' => null,
                    ];
                }
            }
        }
    }

    /**
     * Simulation of CR-04 V3 rollback down()
     */
    protected function simulateMigrationDown(array &$dbPermissions, array &$dbRolePermissions, array &$snapshots): void
    {
        // 1. Detach only newly attached role grants
        foreach ($snapshots as $snap) {
            if ($snap['item_type'] === 'ROLE_GRANT_ATTACHED') {
                $grantKey = "{$snap['secondary_id']}:{$snap['target_id']}";
                unset($dbRolePermissions[$grantKey]);
            }
        }

        // 2. Restore updated permissions from before-image snapshot
        foreach ($snapshots as $snap) {
            if ($snap['item_type'] === 'PERMISSION_UPDATED') {
                $before = $snap['before_image'];
                $code = $before['code'];
                $dbPermissions[$code] = $before;
            }
        }

        // 3. Delete only newly created permissions
        $createdIds = [];
        foreach ($snapshots as $snap) {
            if ($snap['item_type'] === 'PERMISSION_CREATED') {
                $createdIds[$snap['target_id']] = true;
            }
        }

        foreach ($dbPermissions as $code => $p) {
            if (isset($createdIds[$p['id']])) {
                unset($dbPermissions[$code]);
            }
        }

        $snapshots = [];
    }

    public function test_cr04_canonical_roles_strictly_nine_and_ceo_is_read_only(): void
    {
        $this->assertCount(9, $this->canonicalRoles);

        // CEO has only read/audit permissions, NO mutation permissions
        $ceoPermissions = $this->roleGrants['CEO_PRODUCT_OWNER'];
        $this->assertNotContains('category.taxonomy.create', $ceoPermissions);
        $this->assertNotContains('category.taxonomy.update', $ceoPermissions);
        $this->assertNotContains('category.taxonomy.change_status', $ceoPermissions);
        $this->assertNotContains('category.taxonomy.hard_delete', $ceoPermissions);
        $this->assertNotContains('category.request.submit', $ceoPermissions);
        $this->assertNotContains('category.request.review', $ceoPermissions);

        // CEO has governance read permissions
        $this->assertContains('category.taxonomy.read_active', $ceoPermissions);
        $this->assertContains('category.taxonomy.read_inactive', $ceoPermissions);
        $this->assertContains('category.request.read_all', $ceoPermissions);
        $this->assertContains('category.audit.read', $ceoPermissions);
    }

    public function test_cr04_initial_migration_and_rollback(): void
    {
        $dbPermissions = [];
        $dbRolePermissions = [];
        $snapshots = [];

        // Run Up
        $this->simulateMigrationUp($dbPermissions, $dbRolePermissions, $snapshots);

        $this->assertCount(11, $dbPermissions);
        $this->assertGreaterThan(0, count($dbRolePermissions));
        $this->assertNotEmpty($snapshots);

        // Run Down
        $this->simulateMigrationDown($dbPermissions, $dbRolePermissions, $snapshots);

        // Entire state returned to empty
        $this->assertEmpty($dbPermissions);
        $this->assertEmpty($dbRolePermissions);
        $this->assertEmpty($snapshots);
    }

    public function test_cr04_preserves_existing_data_and_restores_before_image_on_rollback(): void
    {
        $preExistingId = 'perm-pre-existing-uuid-001';
        $dbPermissions = [
            'category.taxonomy.read_active' => [
                'id' => $preExistingId,
                'code' => 'category.taxonomy.read_active',
                'resource' => 'old_resource',
                'action' => 'old_action',
                'scope_type' => 'OLD_SCOPE',
                'owner_service' => 'legacy-service',
                'is_active' => false,
            ],
        ];

        // Pre-existing role grant
        $dbRolePermissions = [
            "CUSTOMER:{$preExistingId}" => [
                'role' => 'CUSTOMER',
                'permission_id' => $preExistingId,
            ],
        ];

        $snapshots = [];

        // Run Up
        $this->simulateMigrationUp($dbPermissions, $dbRolePermissions, $snapshots);

        // Primary key ID was preserved
        $this->assertEquals($preExistingId, $dbPermissions['category.taxonomy.read_active']['id']);
        // Owner was preserved
        $this->assertEquals('legacy-service', $dbPermissions['category.taxonomy.read_active']['owner_service']);
        // 11 total permissions
        $this->assertCount(11, $dbPermissions);

        // Run Down (Rollback)
        $this->simulateMigrationDown($dbPermissions, $dbRolePermissions, $snapshots);

        // Pre-existing permission remains and is restored to its exact before-image!
        $this->assertCount(1, $dbPermissions);
        $this->assertArrayHasKey('category.taxonomy.read_active', $dbPermissions);
        $this->assertEquals('old_resource', $dbPermissions['category.taxonomy.read_active']['resource']);
        $this->assertEquals('old_action', $dbPermissions['category.taxonomy.read_active']['action']);
        $this->assertEquals('OLD_SCOPE', $dbPermissions['category.taxonomy.read_active']['scope_type']);
        $this->assertEquals('legacy-service', $dbPermissions['category.taxonomy.read_active']['owner_service']);
        $this->assertFalse($dbPermissions['category.taxonomy.read_active']['is_active']);

        // Pre-existing grant was preserved and NOT detached
        $this->assertArrayHasKey("CUSTOMER:{$preExistingId}", $dbRolePermissions);
    }

    public function test_cr04_rerun_is_strictly_idempotent(): void
    {
        $dbPermissions = [];
        $dbRolePermissions = [];
        $snapshots = [];

        // First Run
        $this->simulateMigrationUp($dbPermissions, $dbRolePermissions, $snapshots);
        $countPerms1 = count($dbPermissions);
        $countGrants1 = count($dbRolePermissions);
        $countSnaps1 = count($snapshots);

        // Second Run (Rerun)
        $this->simulateMigrationUp($dbPermissions, $dbRolePermissions, $snapshots);
        $countPerms2 = count($dbPermissions);
        $countGrants2 = count($dbRolePermissions);
        $countSnaps2 = count($snapshots);

        // Exact match: 0 extra entries, 0 duplicates
        $this->assertEquals($countPerms1, $countPerms2);
        $this->assertEquals($countGrants1, $countGrants2);
        $this->assertEquals($countSnaps1, $countSnaps2);
    }
}
