<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * CR-04 V5 Migration with:
     * 1. Schema separation (DDL snapshot table outside transaction)
     * 2. Atomic MySQL data transaction (permissions, role_permissions, snapshots)
     * 3. Fail-closed ownership conflict guard
     * 4. Full before-image snapshot and rollback restoration (including timestamps)
     * 5. Accurate role_permissions schema matching Identity (role_id, permission_id, created_at)
     */
    public function up(): void
    {
        // 1. DDL: Create tracker snapshot table outside transaction (MySQL DDL triggers implicit commit)
        if (! Schema::hasTable('cr04_installed_snapshots')) {
            Schema::create('cr04_installed_snapshots', function (Blueprint $table) {
                $table->char('id', 36)->primary();
                $table->string('item_type', 32); // 'PERMISSION_CREATED', 'PERMISSION_UPDATED', 'ROLE_GRANT_ATTACHED'
                $table->char('target_id', 36);   // permission_id
                $table->char('secondary_id', 36)->nullable(); // role_id for ROLE_GRANT
                $table->json('before_image')->nullable();
                $table->dateTime('created_at', 6)->nullable();
                $table->dateTime('updated_at', 6)->nullable();
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

        // 2. Atomic data transaction: all permission insertions, updates, snapshots, and role grants are strictly atomic
        DB::transaction(function () use ($permissionsData, $roleGrants) {
            // A. Pre-flight check: Fail-closed ownership conflict guard
            // If an existing permission is owned by a different service, abort without mutating data!
            foreach ($permissionsData as $p) {
                $existing = DB::table('permissions')->where('code', $p['code'])->first();
                if ($existing && ! empty($existing->owner_service) && $existing->owner_service !== 'category-service') {
                    throw new \RuntimeException(
                        "CR04_OWNERSHIP_CONFLICT: Permission '{$p['code']}' sudah dimiliki oleh service '{$existing->owner_service}'. " .
                        "Migrasi dihentikan secara fail-closed untuk mencegah pengambilalihan hak akses tanpa persetujuan."
                    );
                }
            }

            // B. Upsert permissions with before-image snapshot tracking
            foreach ($permissionsData as $p) {
                $existing = DB::table('permissions')->where('code', $p['code'])->first();

                if ($existing) {
                    $needsUpdate = ($existing->resource !== $p['resource']
                        || $existing->action !== $p['action']
                        || $existing->scope_type !== $p['scope_type']
                        || empty($existing->owner_service)
                        || ! $existing->is_active);

                    if ($needsUpdate) {
                        $now = now();
                        DB::table('cr04_installed_snapshots')->insert([
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
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        DB::table('permissions')->where('id', $existing->id)->update([
                            'resource' => $p['resource'],
                            'action' => $p['action'],
                            'scope_type' => $p['scope_type'],
                            'owner_service' => $existing->owner_service ?: 'category-service',
                            'is_active' => true,
                            'updated_at' => $now,
                        ]);
                    }
                } else {
                    $newId = (string) Str::uuid();
                    $now = now();
                    DB::table('permissions')->insert([
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

                    DB::table('cr04_installed_snapshots')->insert([
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

            // C. Role grants with exact matching schema (role_id, permission_id, created_at)
            foreach ($roleGrants as $roleCode => $codes) {
                $role = DB::table('roles')->where('code', $roleCode)->first();
                if ($role) {
                    $permissions = DB::table('permissions')->whereIn('code', $codes)->get();
                    foreach ($permissions as $perm) {
                        $alreadyGranted = DB::table('role_permissions')
                            ->where('role_id', $role->id)
                            ->where('permission_id', $perm->id)
                            ->exists();

                        if (! $alreadyGranted) {
                            $now = now();
                            DB::table('role_permissions')->insert([
                                'role_id' => $role->id,
                                'permission_id' => $perm->id,
                                'created_at' => $now,
                            ]);

                            DB::table('cr04_installed_snapshots')->insert([
                                'id' => (string) Str::uuid(),
                                'item_type' => 'ROLE_GRANT_ATTACHED',
                                'target_id' => $perm->id,
                                'secondary_id' => $role->id,
                                'before_image' => null,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ]);
                        }
                    }
                }
            }
        });
    }

    /**
     * Reverse migrations strictly using snapshots, restoring exact pre-migration state.
     */
    public function down(): void
    {
        if (! Schema::hasTable('cr04_installed_snapshots')) {
            return;
        }

        DB::transaction(function () {
            // 1. Detach newly attached role grants
            $grants = DB::table('cr04_installed_snapshots')
                ->where('item_type', 'ROLE_GRANT_ATTACHED')
                ->get();

            foreach ($grants as $g) {
                DB::table('role_permissions')
                    ->where('role_id', $g->secondary_id)
                    ->where('permission_id', $g->target_id)
                    ->delete();
            }

            // 2. Restore modified permissions from before-image snapshot
            $updatedPerms = DB::table('cr04_installed_snapshots')
                ->where('item_type', 'PERMISSION_UPDATED')
                ->get();

            foreach ($updatedPerms as $u) {
                if ($u->before_image) {
                    $before = json_decode($u->before_image, true);
                    DB::table('permissions')->where('id', $u->target_id)->update([
                        'resource' => $before['resource'] ?? null,
                        'action' => $before['action'] ?? null,
                        'scope_type' => $before['scope_type'] ?? null,
                        'owner_service' => $before['owner_service'] ?? null,
                        'is_active' => $before['is_active'] ?? true,
                        'updated_at' => $before['updated_at'] ?? now(),
                    ]);
                }
            }

            // 3. Delete only newly created permissions
            $newPermIds = DB::table('cr04_installed_snapshots')
                ->where('item_type', 'PERMISSION_CREATED')
                ->pluck('target_id');

            if ($newPermIds->isNotEmpty()) {
                DB::table('permissions')->whereIn('id', $newPermIds)->delete();
            }
        });

        // 4. Drop snapshot table outside transaction
        Schema::dropIfExists('cr04_installed_snapshots');
    }
};
