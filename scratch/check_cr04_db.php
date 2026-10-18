<?php

require 'backend/services/identity-service/vendor/autoload.php';
$app = require_once 'backend/services/identity-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== PERMISSION REGISTRY (category-service) ===" . PHP_EOL;
$perms = DB::table('permissions')->where('owner_service', 'category-service')->get(['code', 'resource', 'action', 'scope_type', 'owner_service']);
echo "COUNT: " . $perms->count() . PHP_EOL;
foreach ($perms as $p) {
    echo " - {$p->code} ({$p->resource}.{$p->action}) [scope: {$p->scope_type}]" . PHP_EOL;
}

echo PHP_EOL . "=== ROLE-PERMISSION GRANTS (category-service permissions) ===" . PHP_EOL;
$roles = DB::table('roles')->get();
foreach ($roles as $r) {
    $grantCount = DB::table('role_permissions')
        ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
        ->where('role_permissions.role_id', $r->id)
        ->where('permissions.owner_service', 'category-service')
        ->count();
    $grantCodes = DB::table('role_permissions')
        ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
        ->where('role_permissions.role_id', $r->id)
        ->where('permissions.owner_service', 'category-service')
        ->pluck('permissions.code')
        ->implode(', ');
    echo "Role {$r->code} ({$grantCount} grants): [{$grantCodes}]" . PHP_EOL;
}
