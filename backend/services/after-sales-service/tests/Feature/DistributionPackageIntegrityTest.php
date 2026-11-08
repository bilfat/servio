<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;
use ZipArchive;

class DistributionPackageIntegrityTest extends TestCase
{
    /**
     * Gate 5: Automatic test proving the distribution ZIP is strictly secret-safe and sanitized.
     * FAILS if forbidden files (.env, .env.testing, vendor/, cache, logs) are present in the ZIP.
     */
    public function test_distribution_zip_contains_no_forbidden_or_sensitive_files(): void
    {
        $zipPath = base_path('../after-sales-service.zip');

        if (!file_exists($zipPath)) {
            $zipPath = base_path('after-sales-service.zip');
        }

        if (!file_exists($zipPath)) {
            $this->markTestSkipped('Distribution ZIP not found at expected path: ' . $zipPath);
        }

        $zip = new ZipArchive();
        $opened = $zip->open($zipPath, ZipArchive::RDONLY);
        $this->assertTrue($opened === true, 'Failed to open distribution ZIP.');

        $forbiddenPatterns = [
            '/(^|\/)\.env$/i',
            '/(^|\/)\.env\.(?!example$)[^\/]+$/i', // e.g. .env.testing, .env.local, .env.backup, but NEVER .env.example
            '/(^|\/)vendor(\/|$)/i',
            '/(^|\/)storage\/logs\/.*\.log$/i',
            '/(^|\/)\.phpunit\.result\.cache$/i',
            '/(^|\/)\.git(\/|$)/i',
            '/(^|\/)node_modules(\/|$)/i',
        ];

        $hasEnvExample = false;
        $violations = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $rawName = $zip->getNameIndex($i);
            // Normalize path separators
            $normalized = str_replace('\\', '/', $rawName);
            $normalized = ltrim($normalized, '/');

            // Strip optional top-level folder prefix (e.g., after-sales-service/...)
            $relPath = $normalized;
            if (preg_match('/^[^\/]+\/(.*)$/', $normalized, $matches)) {
                $rootPrefix = explode('/', $normalized)[0];
                if (str_contains(strtolower($rootPrefix), 'after-sales')) {
                    $relPath = $matches[1];
                }
            }

            $baseName = basename($normalized);

            if ($baseName === '.env.example') {
                $hasEnvExample = true;
                continue;
            }

            // Check against both normalized full path and relative path
            foreach ($forbiddenPatterns as $pattern) {
                if (preg_match($pattern, $normalized) || preg_match($pattern, $relPath)) {
                    $violations[] = $rawName;
                    break;
                }
            }

            // Additional strict check on basename
            if ($baseName === '.env' || (str_starts_with(strtolower($baseName), '.env.') && $baseName !== '.env.example')) {
                if (!in_array($rawName, $violations, true)) {
                    $violations[] = $rawName;
                }
            }
        }

        $zip->close();

        $this->assertTrue($hasEnvExample, 'Distribution ZIP MUST contain .env.example template.');
        $this->assertEmpty($violations, 'Forbidden/sensitive files found in distribution ZIP: ' . implode(', ', $violations));
    }
}

