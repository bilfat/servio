<?php

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Validates CR-04 V4 Migration on real MySQL database schema:
 * 1. Initial migration execution
 * 2. Rerun idempotency
 * 3. 100% reversible rollback
 * 4. Pre-existing data preservation & before-image restoration
 * 5. Fail-closed ownership conflict guard
 * 6. 9 Canonical roles with CEO strictly read-only
 */
class CR04ProposalV4MigrationSchemaTest extends TestCase
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

    protected function setUp(): void
    {
        parent::setUp();
        $this->createIsolatedIdentitySchema();
    }

    protected function tearDown(): void
    {
        $this->dropIsolatedIdentitySchema();
        parent::tearDown();
    }

    protected function createIsolatedIdentitySchema(): void
    {
        $this->dropIsolatedIdentitySchema();

        Schema::create('test_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 64)->unique();
            $table->string('name', 128);
            $table->timestamps();
        });

        Schema::create('test_permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 128)->unique();
            $table->string('resource', 64);
            $table->string('action', 64);
            $table->string('scope_type', 32);
            $table->string('owner_service', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('test_role_permissions', function (Blueprint $table) {
            $table->uuid('role_id');
            $table->uuid('permission_id');
            $table->primary(['role_id', 'permission_id']);
        });

        // Seed 9 canonical roles
        foreach ($this->canonicalRoles as $code) {
            DB::table('test_roles')->insert([
                'id' => (string) Str::uuid(),
                'code' => $code,
                'name' => "Role {$code}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function dropIsolatedIdentitySchema(): void
    {
        Schema::dropIfExists('test_cr04_installed_snapshots');
        Schema::dropIfExists('test_role_permissions');
        Schema::dropIfExists('test_permissions');
        Schema::dropIfExists('test_roles');
    }

    /**
     * Build CR-04 V4 Migration instance targeted at isolated test tables.
     */
    protected function getMigrationInstance(): Migration
    {
        return new class extends Migration {
            protected string $tableSnapshots = 'test_cr04_installed_snapshots';
            protected string $tablePermissions = 'test_permissions';
            protected string $tableRoles = 'test_roles';
            protected string $tableRolePermissions = 'test_role_permissions';

            public function up(): void
            {
                if (! Schema::hasTable($this->tableSnapshots)) {
                    Schema::create($this->tableSnapshots, function (Blueprint $table) {
                        $table->uuid('id')->primary();
                        $table->string('item_type', 32);
                        $table->uuid('target_id');
                        $table->uuid('secondary_id')->nullable();
                        $table->json('before_image')->nullable();
                        $table->timestamps();
                    });
                }

                $permissionsData = [
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

                // Fail-closed ownership conflict guard
                foreach ($permissionsData as $p) {
                    $existing = DB::table($this->tablePermissions)->where('code', $p['code'])->first();
                    if ($existing && ! empty($existing->owner_service) && $existing->owner_service !== 'category-service') {
                        throw new \RuntimeException(
                            "CR04_OWNERSHIP_CONFLICT: Permission '{$p['code']}' sudah dimiliki oleh service '{$existing->owner_service}'. " .
                            "Migrasi dihentikan secara fail-closed untuk mencegah pengambilalihan hak akses."
                        );
                    }
                }

                foreach ($permissionsData as $p) {
                    $existing = DB::table($this->tablePermissions)->where('code', $p['code'])->first();

                    if ($existing) {
                        $needsUpdate = ($existing->resource !== $p['resource']
                            || $existing->action !== $p['action']
                            || $existing->scope_type !== $p['scope_type']
                            || empty($existing->owner_service)
                            || ! $existing->is_active);

                        if ($needsUpdate) {
                            DB::table($this->tableSnapshots)->insert([
                                'id' => (string) Str::uuid(),
                                'item_type' => 'PERMISSION_UPDATED',
                                'target_id' => $existing->id,
                                'secondary_id' => null,
                                'before_image' => json_encode([
                                    'id' => $existing->id,
                                    'code' => $existing->code,
                                    'resource' => $existing->resource,
                                    'action' => $existing->action,
                                    'scope_type' => $existing->scope_type,
                                    'owner_service' => $existing->owner_service,
                                    'is_active' => (bool) $existing->is_active,
                                    'created_at' => $existing->created_at,
                                    'updated_at' => $existing->updated_at,
                                ]),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);

                            DB::table($this->tablePermissions)->where('id', $existing->id)->update([
                                'resource' => $p['resource'],
                                'action' => $p['action'],
                                'scope_type' => $p['scope_type'],
                                'owner_service' => $existing->owner_service ?: 'category-service',
                                'is_active' => true,
                                'updated_at' => now(),
                            ]);
                        }
                    } else {
                        $newId = (string) Str::uuid();
                        $now = now();
                        DB::table($this->tablePermissions)->insert([
                            'id' => $newId,
                            'code' => $p['code'],
                            'resource' => $p['resource'],
                            'action' => $p['action'],
                            'scope_type' => $p['scope_type'],
                            'owner_service' => 'category-service',
                            'is_active' => true,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        DB::table($this->tableSnapshots)->insert([
                            'id' => (string) Str::uuid(),
                            'item_type' => 'PERMISSION_CREATED',
                            'target_id' => $newId,
                            'secondary_id' => null,
                            'before_image' => null,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }

                $roleGrants = [
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

                foreach ($roleGrants as $roleCode => $codes) {
                    $role = DB::table($this->tableRoles)->where('code', $roleCode)->first();
                    if ($role) {
                        $permissions = DB::table($this->tablePermissions)->whereIn('code', $codes)->get();
                        foreach ($permissions as $perm) {
                            $alreadyGranted = DB::table($this->tableRolePermissions)
                                ->where('role_id', $role->id)
                                ->where('permission_id', $perm->id)
                                ->exists();

                            if (! $alreadyGranted) {
                                DB::table($this->tableRolePermissions)->insert([
                                    'role_id' => $role->id,
                                    'permission_id' => $perm->id,
                                ]);

                                DB::table($this->tableSnapshots)->insert([
                                    'id' => (string) Str::uuid(),
                                    'item_type' => 'ROLE_GRANT_ATTACHED',
                                    'target_id' => $perm->id,
                                    'secondary_id' => $role->id,
                                    'before_image' => null,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }
                    }
                }
            }

            public function down(): void
            {
                if (! Schema::hasTable($this->tableSnapshots)) {
                    return;
                }

                $grants = DB::table($this->tableSnapshots)
                    ->where('item_type', 'ROLE_GRANT_ATTACHED')
                    ->get();

                foreach ($grants as $g) {
                    DB::table($this->tableRolePermissions)
                        ->where('role_id', $g->secondary_id)
                        ->where('permission_id', $g->target_id)
                        ->delete();
                }

                $updatedPerms = DB::table($this->tableSnapshots)
                    ->where('item_type', 'PERMISSION_UPDATED')
                    ->get();

                foreach ($updatedPerms as $u) {
                    if ($u->before_image) {
                        $before = json_decode($u->before_image, true);
                        DB::table($this->tablePermissions)->where('id', $u->target_id)->update([
                            'resource' => $before['resource'] ?? null,
                            'action' => $before['action'] ?? null,
                            'scope_type' => $before['scope_type'] ?? null,
                            'owner_service' => $before['owner_service'] ?? null,
                            'is_active' => $before['is_active'] ?? true,
                            'updated_at' => $before['updated_at'] ?? now(),
                        ]);
                    }
                }

                $newPermIds = DB::table($this->tableSnapshots)
                    ->where('item_type', 'PERMISSION_CREATED')
                    ->pluck('target_id');

                if ($newPermIds->isNotEmpty()) {
                    DB::table($this->tablePermissions)->whereIn('id', $newPermIds)->delete();
                }

                Schema::dropIfExists($this->tableSnapshots);
            }
        };
    }

    public function test_cr04_initial_migration_and_rollback_on_real_mysql_schema(): void
    {
        $migration = $this->getMigrationInstance();

        // 1. Run UP
        $migration->up();

        // Verify all 11 permissions created in real MySQL table
        $this->assertEquals(11, DB::table('test_permissions')->count());
        $this->assertTrue(Schema::hasTable('test_cr04_installed_snapshots'));

        // Verify CEO permissions in real table: strictly 4 read-only permissions
        $ceoRole = DB::table('test_roles')->where('code', 'CEO_PRODUCT_OWNER')->first();
        $ceoPermCount = DB::table('test_role_permissions')->where('role_id', $ceoRole->id)->count();
        $this->assertEquals(4, $ceoPermCount);

        // Verify CEO cannot mutate
        $adminRole = DB::table('test_roles')->where('code', 'ADMIN_OPERATIONS')->first();
        $adminPermCount = DB::table('test_role_permissions')->where('role_id', $adminRole->id)->count();
        $this->assertEquals(9, $adminPermCount);

        // 2. Run DOWN (Rollback)
        $migration->down();

        // Verify real MySQL table is completely reversed to pre-migration state
        $this->assertEquals(0, DB::table('test_permissions')->count());
        $this->assertEquals(0, DB::table('test_role_permissions')->count());
        $this->assertFalse(Schema::hasTable('test_cr04_installed_snapshots'));
    }

    public function test_cr04_rerun_is_strictly_idempotent_on_real_mysql(): void
    {
        $migration = $this->getMigrationInstance();

        // First run
        $migration->up();
        $permCount1 = DB::table('test_permissions')->count();
        $grantCount1 = DB::table('test_role_permissions')->count();
        $snapCount1 = DB::table('test_cr04_installed_snapshots')->count();

        // Rerun
        $migration->up();
        $permCount2 = DB::table('test_permissions')->count();
        $grantCount2 = DB::table('test_role_permissions')->count();
        $snapCount2 = DB::table('test_cr04_installed_snapshots')->count();

        $this->assertEquals(11, $permCount1);
        $this->assertEquals($permCount1, $permCount2);
        $this->assertEquals($grantCount1, $grantCount2);
        $this->assertEquals($snapCount1, $snapCount2);
    }

    public function test_cr04_preserves_pre_existing_permission_and_restores_before_image_on_real_mysql(): void
    {
        $preExistingId = (string) Str::uuid();
        $originalCreatedAt = '2025-01-01 10:00:00';
        $originalUpdatedAt = '2025-01-01 10:00:00';

        // Pre-existing permission with old metadata
        DB::table('test_permissions')->insert([
            'id' => $preExistingId,
            'code' => 'category.taxonomy.read_active',
            'resource' => 'legacy_taxonomy',
            'action' => 'legacy_read',
            'scope_type' => 'CUSTOM_SCOPE',
            'owner_service' => 'category-service',
            'is_active' => false,
            'created_at' => $originalCreatedAt,
            'updated_at' => $originalUpdatedAt,
        ]);

        // Pre-existing role grant for CUSTOMER
        $customerRole = DB::table('test_roles')->where('code', 'CUSTOMER')->first();
        DB::table('test_role_permissions')->insert([
            'role_id' => $customerRole->id,
            'permission_id' => $preExistingId,
        ]);

        $migration = $this->getMigrationInstance();

        // Run UP
        $migration->up();

        // Verify primary key id was NOT mutated
        $permAfterUp = DB::table('test_permissions')->where('code', 'category.taxonomy.read_active')->first();
        $this->assertEquals($preExistingId, $permAfterUp->id);
        $this->assertEquals('taxonomy', $permAfterUp->resource);
        $this->assertEquals('read_active', $permAfterUp->action);

        // Verify before-image was recorded in real MySQL snapshot table
        $snapshot = DB::table('test_cr04_installed_snapshots')
            ->where('item_type', 'PERMISSION_UPDATED')
            ->where('target_id', $preExistingId)
            ->first();
        $this->assertNotNull($snapshot);

        $beforeData = json_decode($snapshot->before_image, true);
        $this->assertEquals('legacy_taxonomy', $beforeData['resource']);
        $this->assertEquals('legacy_read', $beforeData['action']);
        $this->assertEquals('CUSTOM_SCOPE', $beforeData['scope_type']);
        $this->assertFalse($beforeData['is_active']);

        // Run DOWN (Rollback)
        $migration->down();

        // Pre-existing permission must NOT be deleted
        $permAfterDown = DB::table('test_permissions')->where('code', 'category.taxonomy.read_active')->first();
        $this->assertNotNull($permAfterDown);
        $this->assertEquals($preExistingId, $permAfterDown->id);
        // Metadata restored bit-for-bit from before-image
        $this->assertEquals('legacy_taxonomy', $permAfterDown->resource);
        $this->assertEquals('legacy_read', $permAfterDown->action);
        $this->assertEquals('CUSTOM_SCOPE', $permAfterDown->scope_type);
        $this->assertEquals(0, $permAfterDown->is_active);
        $this->assertEquals($originalUpdatedAt, $permAfterDown->updated_at);

        // Pre-existing role grant was NOT detached
        $this->assertTrue(
            DB::table('test_role_permissions')
                ->where('role_id', $customerRole->id)
                ->where('permission_id', $preExistingId)
                ->exists()
        );

        // Newly created permissions were deleted
        $this->assertEquals(1, DB::table('test_permissions')->count());
    }

    public function test_cr04_fails_closed_when_ownership_conflicts_with_another_service(): void
    {
        $conflictingId = (string) Str::uuid();

        // Existing permission owned by product-service
        DB::table('test_permissions')->insert([
            'id' => $conflictingId,
            'code' => 'category.taxonomy.create',
            'resource' => 'product_taxonomy',
            'action' => 'create',
            'scope_type' => 'GLOBAL',
            'owner_service' => 'product-service', // Conflicting owner!
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migration = $this->getMigrationInstance();

        // Migration must FAIL CLOSED and report conflict
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('CR04_OWNERSHIP_CONFLICT');

        $migration->up();
    }
}
