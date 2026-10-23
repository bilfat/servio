<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Modul 04 Service Catalog Permission Seeder:
     * Seeds canonical service.* permissions and binds them to:
     * - SERVICE_PROVIDER: service.offering.*, service.definition_request.*, service.worker_capability.*, service.audit.read
     * - ADMIN_OPERATIONS: service.definition.*, service.capability.*, service.definition_request.*, service.offering.read_all, service.governance.read, service.audit.read
     * - CEO_PRODUCT_OWNER: service.offering.read_all, service.definition.read_all, service.capability.read_all, service.governance.read, service.audit.read
     */
    public function up(): void
    {
        if (! Schema::hasTable('cr_identity_modul04_installed_snapshots')) {
            Schema::create('cr_identity_modul04_installed_snapshots', function (Blueprint $table) {
                $table->char('id', 36)->primary();
                $table->string('item_type', 32);
                $table->char('target_id', 36);
                $table->char('secondary_id', 36)->nullable();
                $table->json('before_image')->nullable();
                $table->dateTime('created_at', 6)->nullable();
                $table->dateTime('updated_at', 6)->nullable();
            });
        }

        $permissionsData = [
            ['code' => 'service.offering.read_own', 'resource' => 'service_offering', 'action' => 'read_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.offering.create', 'resource' => 'service_offering', 'action' => 'create_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.offering.update_own', 'resource' => 'service_offering', 'action' => 'update_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.offering.publish_own', 'resource' => 'service_offering', 'action' => 'publish_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.offering.delete_own', 'resource' => 'service_offering', 'action' => 'delete_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.offering.media_manage', 'resource' => 'service_media', 'action' => 'manage', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.offering.read_all', 'resource' => 'service_offering', 'action' => 'read_all', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.definition_request.create', 'resource' => 'service_definition_request', 'action' => 'create_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.definition_request.read_own', 'resource' => 'service_definition_request', 'action' => 'read_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.definition_request.read_all', 'resource' => 'service_definition_request', 'action' => 'read_all', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.definition_request.review', 'resource' => 'service_definition_request', 'action' => 'review', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.worker.manage', 'resource' => 'worker_capability', 'action' => 'manage', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.worker_capability.manage_own_org', 'resource' => 'worker_capability', 'action' => 'manage_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'service.definition.read_all', 'resource' => 'service_definition', 'action' => 'read_all', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.definition.manage', 'resource' => 'service_definition', 'action' => 'manage', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.capability.read_all', 'resource' => 'capability', 'action' => 'read_all', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.capability.manage', 'resource' => 'capability', 'action' => 'manage', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.governance.read', 'resource' => 'service_governance', 'action' => 'read', 'scope_type' => 'GLOBAL'],
            ['code' => 'service.audit.read', 'resource' => 'service_audit', 'action' => 'read', 'scope_type' => 'GLOBAL'],
        ];

        $roleGrants = [
            'SERVICE_PROVIDER' => [
                'service.offering.read_own',
                'service.offering.create',
                'service.offering.update_own',
                'service.offering.publish_own',
                'service.offering.delete_own',
                'service.offering.media_manage',
                'service.definition_request.create',
                'service.definition_request.read_own',
                'service.worker.manage',
                'service.worker_capability.manage_own_org',
                'service.audit.read',
            ],
            'ADMIN_OPERATIONS' => [
                'service.offering.read_all',
                'service.definition.read_all',
                'service.definition.manage',
                'service.capability.read_all',
                'service.capability.manage',
                'service.definition_request.read_all',
                'service.definition_request.review',
                'service.governance.read',
                'service.audit.read',
            ],
            'CEO_PRODUCT_OWNER' => [
                'service.offering.read_all',
                'service.definition.read_all',
                'service.capability.read_all',
                'service.definition_request.read_all',
                'service.governance.read',
                'service.audit.read',
            ],
        ];

        DB::transaction(function () use ($permissionsData, $roleGrants) {
            foreach ($permissionsData as $p) {
                $existing = DB::table('permissions')->where('code', $p['code'])->first();
                if ($existing && ! empty($existing->owner_service) && $existing->owner_service !== 'service-service') {
                    throw new \RuntimeException("Permission '{$p['code']}' already owned by '{$existing->owner_service}'.");
                }
            }

            foreach ($permissionsData as $p) {
                $existing = DB::table('permissions')->where('code', $p['code'])->first();
                if (! $existing) {
                    $newId = (string) Str::uuid();
                    $now = now();
                    DB::table('permissions')->insert([
                        'id' => $newId,
                        'code' => $p['code'],
                        'resource' => $p['resource'],
                        'action' => $p['action'],
                        'scope_type' => $p['scope_type'],
                        'owner_service' => 'service-service',
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                    DB::table('cr_identity_modul04_installed_snapshots')->insert([
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

                            DB::table('cr_identity_modul04_installed_snapshots')->insert([
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

    public function down(): void
    {
        if (! Schema::hasTable('cr_identity_modul04_installed_snapshots')) {
            return;
        }

        DB::transaction(function () {
            $grants = DB::table('cr_identity_modul04_installed_snapshots')
                ->where('item_type', 'ROLE_GRANT_ATTACHED')
                ->get();

            foreach ($grants as $g) {
                DB::table('role_permissions')
                    ->where('role_id', $g->secondary_id)
                    ->where('permission_id', $g->target_id)
                    ->delete();
            }

            $newPermIds = DB::table('cr_identity_modul04_installed_snapshots')
                ->where('item_type', 'PERMISSION_CREATED')
                ->pluck('target_id');

            if ($newPermIds->isNotEmpty()) {
                DB::table('permissions')->whereIn('id', $newPermIds)->delete();
            }
        });

        Schema::dropIfExists('cr_identity_modul04_installed_snapshots');
    }
};
