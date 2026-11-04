<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$orgId = '0740d857-b665-4191-aaf5-d7dd3611dc1d';

try {
    $rows = DB::table('servio_identity_db.memberships as m')
        ->join('servio_identity_db.users as u', 'm.user_id', '=', 'u.id')
        ->leftJoin('servio_identity_db.user_profiles as p', 'u.id', '=', 'p.user_id')
        ->where('m.organization_id', $orgId)
        ->where('m.kind', 'WORKER')
        ->select([
            'm.user_id as worker_id',
            'p.display_name',
            'p.legal_name',
            'u.email',
            'p.photo_path',
            'p.employee_id',
        ])
        ->get();
    echo "Success! Count: " . $rows->count() . "\n";
    foreach ($rows as $r) {
        echo "Worker: {$r->worker_id} | Name: " . ($r->display_name ?: ($r->legal_name ?: $r->email)) . " | Photo: {$r->photo_path} | EmpID: {$r->employee_id}\n";
    }
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
