<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * CR-IDENTITY-004 Migration:
     * 1. Schema separation (DDL snapshot table outside transaction)
     * 2. Atomic MySQL data transaction (permissions, role_permissions, snapshots)
     * 3. Fail-closed ownership conflict guard
     * 4. Full before-image snapshot and rollback restoration
     * 5. Accurate role_permissions schema matching Identity (role_id, permission_id, created_at)
     * 6. Strictly maps product.* permissions to canonical SERVIO roles:
     *    - MERCHANT: product.own.*, product.variant.manage, product.media.manage, product.audit.read
     *    - ADMIN_OPERATIONS: product.governance.read, product.audit.read
     *    - CEO_PRODUCT_OWNER: product.governance.read, product.audit.read
     */
    public function up(): void
    {
        // 1. DDL: Create tracker snapshot table outside transaction
        if (! Schema::hasTable('cr_identity_004_installed_snapshots')) {
            Schema::create('cr_identity_004_installed_snapshots', function (Blueprint $table) {
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
            ['code' => 'product.own.read', 'resource' => 'product', 'action' => 'read_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'product.own.create', 'resource' => 'product', 'action' => 'create_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'product.own.update', 'resource' => 'product', 'action' => 'update_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'product.own.status', 'resource' => 'product', 'action' => 'status_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'product.own.delete', 'resource' => 'product', 'action' => 'delete_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'product.variant.manage', 'resource' => 'product_variant', 'action' => 'manage', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'product.media.manage', 'resource' => 'product_media', 'action' => 'manage', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'product.governance.read', 'resource' => 'product_governance', 'action' => 'read', 'scope_type' => 'GLOBAL'],
            ['code' => 'product.audit.read', 'resource' => 'product_audit', 'action' => 'read', 'scope_type' => 'GLOBAL'],
        ];

        $roleGrants = [
            'MERCHANT' => [
                'product.own.read',
                'product.own.create',
                'product.own.update',
                'product.own.status',
                'product.own.delete',
                'product.variant.manage',
                'product.media.manage',
                'product.audit.read',
            ],
            'ADMIN_OPERATIONS' => [
                'product.governance.read',
                'product.audit.read',
            ],
            'CEO_PRODUCT_OWNER' => [
                'product.governance.read',
                'product.audit.read',
            ],
        ];

        // 2. Atomic data transaction
        DB::transaction(function () use ($permissionsData, $roleGrants) {
            // A. Fail-closed ownership conflict guard
            foreach ($permissionsData as $p) {
                $existing = DB::table('permissions')->where('code', $p['code'])->first();
                if ($existing && ! empty($existing->owner_service) && $existing->owner_service !== 'product-service') {
                    throw new \RuntimeException(
                        "CR_IDENTITY_004_OWNERSHIP_CONFLICT: Permission '{$p['code']}' sudah dimiliki oleh service '{$existing->owner_service}'. " .
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
                        DB::table('cr_identity_004_installed_snapshots')->insert([
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
                            'owner_service' => $existing->owner_service ?: 'product-service',
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
                        'owner_service' => 'product-service',
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                    DB::table('cr_identity_004_installed_snapshots')->insert([
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

                            DB::table('cr_identity_004_installed_snapshots')->insert([
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
        if (! Schema::hasTable('cr_identity_004_installed_snapshots')) {
            return;
        }

        DB::transaction(function () {
            // 1. Detach newly attached role grants
            $grants = DB::table('cr_identity_004_installed_snapshots')
                ->where('item_type', 'ROLE_GRANT_ATTACHED')
                ->get();

            foreach ($grants as $g) {
                DB::table('role_permissions')
                    ->where('role_id', $g->secondary_id)
                    ->where('permission_id', $g->target_id)
                    ->delete();
            }

            // 2. Restore modified permissions from before-image snapshot
            $updatedPerms = DB::table('cr_identity_004_installed_snapshots')
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
            $newPermIds = DB::table('cr_identity_004_installed_snapshots')
                ->where('item_type', 'PERMISSION_CREATED')
                ->pluck('target_id');

            if ($newPermIds->isNotEmpty()) {
                DB::table('permissions')->whereIn('id', $newPermIds)->delete();
            }
        });

        // 4. Drop snapshot table outside transaction
        Schema::dropIfExists('cr_identity_004_installed_snapshots');
    }
};
