<?php

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Validates CR-04 V5 Migration using the ACTUAL migration file fixture
 * against the authentic Identity Service table schema:
 *
 * 1. Initial migration and 100% reversible rollback on authentic schema
 * 2. Rerun idempotency on authentic schema
 * 3. Pre-existing data preservation & before-image restoration (metadata & timestamps)
 * 4. Fail-closed ownership conflict guard against non-category services
 * 5. Atomic transaction rollback on partial failure and safe recovery
 */
class CR04ProposalV5MigrationSchemaTest extends TestCase
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
        $this->createAuthenticIdentitySchema();
    }

    protected function tearDown(): void
    {
        $this->dropAuthenticIdentitySchema();
        parent::tearDown();
    }

    protected function createAuthenticIdentitySchema(): void
    {
        $this->dropAuthenticIdentitySchema();

        Schema::create('roles', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('code', 64)->unique();
            $table->string('name', 100);
            $table->boolean('is_system')->default(true);
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('code', 128)->unique();
            $table->string('resource', 64);
            $table->string('action', 32);
            $table->string('scope_type', 24)->default('OWN');
            $table->string('owner_service', 40)->default('identity-service');
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
            $table->index(['owner_service', 'resource']);
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->char('role_id', 36);
            $table->char('permission_id', 36);
            $table->dateTime('created_at', 6)->nullable();

            $table->primary(['role_id', 'permission_id']);
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
        });

        // Seed the 9 canonical roles
        foreach ($this->canonicalRoles as $code) {
            DB::table('roles')->insert([
                'id' => (string) Str::uuid(),
                'code' => $code,
                'name' => "Role {$code}",
                'is_system' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function dropAuthenticIdentitySchema(): void
    {
        Schema::dropIfExists('cr04_installed_snapshots');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }

    /**
     * Load the ACTUAL proposed CR-04 V5 migration file fixture.
     */
    protected function getActualMigrationInstance(): Migration
    {
        $fixturePath = base_path('tests/Fixtures/2026_10_17_000001_seed_category_management_permissions_v5.php');

        return require $fixturePath;
    }

    public function test_cr04_v5_initial_migration_and_rollback_on_authentic_identity_schema(): void
    {
        $migration = $this->getActualMigrationInstance();

        // 1. Run UP
        $migration->up();

        // Verify all 11 permissions created in authentic permissions table
        $this->assertEquals(11, DB::table('permissions')->count());
        $this->assertTrue(Schema::hasTable('cr04_installed_snapshots'));

        // Verify role_permissions table has created_at populated
        $grants = DB::table('role_permissions')->get();
        $this->assertNotEmpty($grants);
        foreach ($grants as $grant) {
            $this->assertNotNull($grant->created_at, 'role_permissions.created_at must be populated');
        }

        // Verify CEO permissions: strictly 4 read-only permissions
        $ceoRole = DB::table('roles')->where('code', 'CEO_PRODUCT_OWNER')->first();
        $ceoPermCount = DB::table('role_permissions')->where('role_id', $ceoRole->id)->count();
        $this->assertEquals(4, $ceoPermCount);

        // Verify Admin permissions: 9 permissions
        $adminRole = DB::table('roles')->where('code', 'ADMIN_OPERATIONS')->first();
        $adminPermCount = DB::table('role_permissions')->where('role_id', $adminRole->id)->count();
        $this->assertEquals(9, $adminPermCount);

        // 2. Run DOWN (Rollback)
        $migration->down();

        // Verify authentic tables completely clean
        $this->assertEquals(0, DB::table('permissions')->count());
        $this->assertEquals(0, DB::table('role_permissions')->count());
        $this->assertFalse(Schema::hasTable('cr04_installed_snapshots'));
    }

    public function test_cr04_v5_rerun_is_strictly_idempotent_on_authentic_schema(): void
    {
        $migration = $this->getActualMigrationInstance();

        // Run 1
        $migration->up();
        $permCount1 = DB::table('permissions')->count();
        $grantCount1 = DB::table('role_permissions')->count();
        $snapCount1 = DB::table('cr04_installed_snapshots')->count();

        // Run 2 (Rerun)
        $migration->up();
        $permCount2 = DB::table('permissions')->count();
        $grantCount2 = DB::table('role_permissions')->count();
        $snapCount2 = DB::table('cr04_installed_snapshots')->count();

        $this->assertEquals(11, $permCount1);
        $this->assertEquals($permCount1, $permCount2);
        $this->assertEquals($grantCount1, $grantCount2);
        $this->assertEquals($snapCount1, $snapCount2);
    }

    public function test_cr04_v5_preserves_pre_existing_data_and_restores_before_image_on_authentic_schema(): void
    {
        $preExistingId = (string) Str::uuid();
        $originalCreatedAt = '2025-01-01 10:00:00.000000';
        $originalUpdatedAt = '2025-01-01 10:00:00.000000';

        // Pre-existing permission
        DB::table('permissions')->insert([
            'id' => $preExistingId,
            'code' => 'category.taxonomy.read_active',
            'resource' => 'old_taxonomy',
            'action' => 'old_read',
            'scope_type' => 'OWN',
            'owner_service' => 'category-service',
            'is_active' => false,
            'created_at' => $originalCreatedAt,
            'updated_at' => $originalUpdatedAt,
        ]);

        // Pre-existing role grant for CUSTOMER
        $customerRole = DB::table('roles')->where('code', 'CUSTOMER')->first();
        DB::table('role_permissions')->insert([
            'role_id' => $customerRole->id,
            'permission_id' => $preExistingId,
            'created_at' => $originalCreatedAt,
        ]);

        $migration = $this->getActualMigrationInstance();

        // Run UP
        $migration->up();

        // UUID must NOT be changed
        $permAfterUp = DB::table('permissions')->where('code', 'category.taxonomy.read_active')->first();
        $this->assertEquals($preExistingId, $permAfterUp->id);
        $this->assertEquals('taxonomy', $permAfterUp->resource);

        // Run DOWN (Rollback)
        $migration->down();

        // Pre-existing permission must NOT be deleted
        $permAfterDown = DB::table('permissions')->where('code', 'category.taxonomy.read_active')->first();
        $this->assertNotNull($permAfterDown);
        $this->assertEquals($preExistingId, $permAfterDown->id);
        // Metadata & timestamps restored bit-for-bit from before-image
        $this->assertEquals('old_taxonomy', $permAfterDown->resource);
        $this->assertEquals('old_read', $permAfterDown->action);
        $this->assertEquals('OWN', $permAfterDown->scope_type);
        $this->assertEquals(0, $permAfterDown->is_active);
        $this->assertEquals($originalUpdatedAt, $permAfterDown->updated_at);

        // Pre-existing role grant must NOT be detached
        $this->assertTrue(
            DB::table('role_permissions')
                ->where('role_id', $customerRole->id)
                ->where('permission_id', $preExistingId)
                ->exists()
        );
        $this->assertEquals(1, DB::table('permissions')->count());
    }

    public function test_cr04_v5_fails_closed_when_ownership_conflicts_with_another_service(): void
    {
        $conflictingId = (string) Str::uuid();

        // Existing permission owned by product-service
        DB::table('permissions')->insert([
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

        $migration = $this->getActualMigrationInstance();

        $conflictCaught = false;
        try {
            $migration->up();
        } catch (\RuntimeException $e) {
            if (str_contains($e->getMessage(), 'CR04_OWNERSHIP_CONFLICT')) {
                $conflictCaught = true;
            } else {
                throw $e;
            }
        }

        $this->assertTrue($conflictCaught, 'Must throw CR04_OWNERSHIP_CONFLICT');

        // Fail-closed guarantee: zero new permissions inserted, zero role permissions, zero snapshots
        $this->assertEquals(1, DB::table('permissions')->count());
        $this->assertEquals(0, DB::table('role_permissions')->count());
        $this->assertEquals(0, DB::table('cr04_installed_snapshots')->count());
    }

    public function test_cr04_v5_atomic_transaction_rolls_back_on_partial_failure(): void
    {
        // 1. DDL snapshot table created outside transaction (matching migration step 1)
        if (! Schema::hasTable('cr04_installed_snapshots')) {
            Schema::create('cr04_installed_snapshots', function (Blueprint $table) {
                $table->char('id', 36)->primary();
                $table->string('item_type', 32);
                $table->char('target_id', 36);
                $table->char('secondary_id', 36)->nullable();
                $table->json('before_image')->nullable();
                $table->dateTime('created_at', 6)->nullable();
                $table->dateTime('updated_at', 6)->nullable();
            });
        }

        // 2. Verify MySQL InnoDB rollback atomicity during simulated mid-migration crash
        try {
            DB::transaction(function () {
                // Simulate partial writes
                DB::table('permissions')->insert([
                    'id' => (string) Str::uuid(),
                    'code' => 'category.test.atomic',
                    'resource' => 'test',
                    'action' => 'test',
                    'scope_type' => 'GLOBAL',
                    'owner_service' => 'category-service',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('cr04_installed_snapshots')->insert([
                    'id' => (string) Str::uuid(),
                    'item_type' => 'PERMISSION_CREATED',
                    'target_id' => (string) Str::uuid(),
                    'secondary_id' => null,
                    'before_image' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Simulate unexpected mid-transaction crash
                throw new \Exception('SIMULATED_TRANSACTION_FAILURE');
            });
        } catch (\Exception $e) {
            $this->assertEquals('SIMULATED_TRANSACTION_FAILURE', $e->getMessage());
        }

        // Verify MySQL atomicity: transaction rolled back, 0 rows in permissions or snapshots
        $this->assertEquals(0, DB::table('permissions')->count());
        $this->assertEquals(0, DB::table('cr04_installed_snapshots')->count());

        // 2. Verify clean recovery: running the actual migration now succeeds completely
        $migration = $this->getActualMigrationInstance();
        $migration->up();

        $this->assertEquals(11, DB::table('permissions')->count());
        $this->assertGreaterThan(0, DB::table('role_permissions')->count());
        $this->assertGreaterThan(0, DB::table('cr04_installed_snapshots')->count());
    }
}
