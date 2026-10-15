<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BusinessApplication;
use App\Models\IdentityVerificationRequest;
use App\Models\ApplicationDecision;

$biz = BusinessApplication::where('application_code', 'like', '%APP-UI%')->latest()->first();
echo "Business Application:\n";
echo "  Code: {$biz->application_code}\n";
echo "  Status: {$biz->status}\n";

$dec = ApplicationDecision::where('application_id', $biz->id)->first();
echo "  Decision: " . ($dec?->decision ?? 'NONE') . "\n";
echo "  Reviewer: " . ($dec?->reviewer_user_id ?? 'NONE') . "\n";

$kyc = IdentityVerificationRequest::where('kind', 'EMPLOYEE_KYC')->latest()->first();
echo "Employee KYC:\n";
echo "  ID: {$kyc->id}\n";
echo "  Status: {$kyc->status}\n";
echo "  Reviewed By: {$kyc->reviewed_by}\n";
echo "  Reviewed At: {$kyc->reviewed_at}\n";
