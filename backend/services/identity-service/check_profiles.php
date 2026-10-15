<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$profiles = App\Models\UserProfile::with('user')->get();
foreach ($profiles as $p) {
    echo "User: " . ($p->user?->email ?? 'no user') . "\n";
    echo "  Display Name: " . $p->display_name . "\n";
    echo "  Photo Path: " . $p->photo_path . "\n";
    echo "  Gender: " . $p->gender . "\n";
    echo "  Birth Date: " . $p->birth_date . "\n";
}

$verifications = App\Models\IdentityVerificationRequest::with('documents')->get();
foreach ($verifications as $v) {
    echo "\nVerification: " . $v->id . " user: " . $v->user_id . "\n";
    foreach ($v->documents as $d) {
        echo "  Doc: " . $d->id . " type: " . $d->type . " key: " . $d->private_storage_key . " mime: " . $d->mime . "\n";
    }
}
