<?php

declare(strict_types=1);

$zipPaths = [
    __DIR__ . '/order-barang-service.zip',
    dirname(__DIR__) . '/order-barang-service.zip',
    dirname(dirname(dirname(__DIR__))) . '/order-barang-service.zip',
];

echo "=== FIX 21 — STRICT CLEAN ZIP INSPECTION & VERIFICATION ===\n\n";

foreach ($zipPaths as $zipPath) {
    if (!file_exists($zipPath)) {
        fwrite(STDERR, "ERROR: Zip file not found at: {$zipPath}\n");
        exit(1);
    }

    $realZipPath = realpath($zipPath);
    $sizeBytes = filesize($realZipPath);
    $sizeKb = round($sizeBytes / 1024, 2);

    echo "Inspecting Archive: {$realZipPath}\n";
    echo "Size: {$sizeBytes} bytes ({$sizeKb} KB)\n";

    $zip = new ZipArchive();
    if ($zip->open($realZipPath) !== true) {
        fwrite(STDERR, "ERROR: Cannot open zip at: {$realZipPath}\n");
        exit(1);
    }

    $numFiles = $zip->numFiles;
    echo "Total entries in archive: {$numFiles}\n";

    $violations = [];
    $keyFilesFound = [];
    $allEntries = [];

    $keyChecks = [
        'app/Domain/Cancellation/CancellationService.php',
        'app/Domain/Completion/AutoCompletionService.php',
        'app/Domain/Integration/OutboxDispatcherService.php',
        'app/Domain/Integration/PaymentEventHandler.php',
        'app/Http/Controllers/InternalOrderEventController.php',
        'app/Infrastructure/Dispute/DisputeAuthorityClient.php',
        'app/Infrastructure/Finance/FinanceCheckoutClient.php',
        'database/migrations/2026_10_23_000022_add_outbox_leases_and_order_hold_sequence.php',
        'tests/Feature/Prompt03ClosingFixRegressionTest.php',
        'tests/Feature/Prompt04SecurityClosingRegressionTest.php',
        'tests/Feature/Prompt05FinalSecurityFreezeRegressionTest.php',
        'tests/Concurrency/two_process_outbox_race.php',
        '.env.example',
        'README.md',
        'INTEGRATION_DEPENDENCY_NOTES.md',
    ];

    for ($i = 0; $i < $numFiles; $i++) {
        $stat = $zip->statIndex($i);
        $name = $stat['name'];
        $allEntries[] = $name;

        // 1. Check for vendor/
        if (str_starts_with($name, 'vendor/') || str_contains($name, '/vendor/')) {
            $violations[] = "Contains vendor: {$name}";
        }

        // 2. Check for node_modules/
        if (str_starts_with($name, 'node_modules/') || str_contains($name, '/node_modules/')) {
            $violations[] = "Contains node_modules: {$name}";
        }

        // 3. Check for .env credentials
        if ($name === '.env' || str_ends_with($name, '/.env')) {
            $violations[] = "Contains live .env file: {$name}";
        }
        if ($name === '.env.testing' || str_ends_with($name, '/.env.testing')) {
            $violations[] = "Contains live .env.testing file: {$name}";
        }
        if (preg_match('/(^|\/)\.env\.(?!example$)/', $name)) {
            $violations[] = "Contains secret env file: {$name}";
        }

        // 4. Check for storage/logs
        if (str_starts_with($name, 'storage/logs/') && str_ends_with($name, '.log')) {
            $violations[] = "Contains storage log file: {$name}";
        }

        // 5. Check for logs or cache
        if (str_ends_with($name, '.log') || str_ends_with($name, '.dump') || str_ends_with($name, '.sql')) {
            $violations[] = "Contains log/database dump: {$name}";
        }
        if (str_ends_with($name, '.phpunit.result.cache')) {
            $violations[] = "Contains phpunit cache: {$name}";
        }

        // 6. Check for nested zips
        if (str_ends_with($name, '.zip')) {
            $violations[] = "Contains nested zip archive: {$name}";
        }

        // Check key expected files
        foreach ($keyChecks as $check) {
            if ($name === $check) {
                $keyFilesFound[$check] = true;
            }
        }
    }

    $zip->close();

    echo "--- Verification Results ---\n";
    echo "Violations found: " . count($violations) . "\n";
    if (count($violations) > 0) {
        foreach ($violations as $v) {
            echo "  [VIOLATION] {$v}\n";
        }
        fwrite(STDERR, "CRITICAL: FIX 21 VERIFICATION FAILED FOR {$realZipPath}\n");
        exit(1);
    }

    echo "Key files verified:\n";
    foreach ($keyChecks as $check) {
        $found = isset($keyFilesFound[$check]) ? 'PRESENT' : 'MISSING';
        echo "  [{$found}] {$check}\n";
        if (!isset($keyFilesFound[$check])) {
            fwrite(STDERR, "CRITICAL: Expected key file missing: {$check}\n");
            exit(1);
        }
    }

    echo "Clean ZIP status: [PASS] (0 secrets, 0 vendor, 0 logs, 0 nested zips, strictly source-only)\n\n";
}

echo "=== ALL ZIP ARCHIVES VERIFIED SUCCESSFULLY ===\n";
exit(0);
