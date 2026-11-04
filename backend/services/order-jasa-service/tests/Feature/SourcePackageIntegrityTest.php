<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;
use ZipArchive;

class SourcePackageIntegrityTest extends TestCase
{
    /**
     * Item 9: Ensure clean source-only package integrity.
     * Verifies that the exported ZIP does not contain PHP caches, real secrets, logs, or vendor.
     */
    public function test_source_only_zip_package_is_clean_and_complete(): void
    {
        $zipPath = base_path('order-jasa-service-source-only.zip');

        if (!file_exists($zipPath)) {
            $this->markTestSkipped('Source ZIP has not been generated yet. Run packaging script first.');
        }

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($zipPath), 'Failed to open source-only ZIP archive');

        $hasEnvExample = false;
        $hasComposerLock = false;
        $hasComposerJson = false;
        $forbiddenFiles = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entry = $zip->getNameIndex($i);

            if ($entry === '.env.example') {
                $hasEnvExample = true;
            }
            if ($entry === 'composer.lock') {
                $hasComposerLock = true;
            }
            if ($entry === 'composer.json') {
                $hasComposerJson = true;
            }

            // Forbidden patterns
            if (preg_match('/(^|\/)\.env(\.|$)(?!example)/', $entry)) {
                $forbiddenFiles[] = "Forbidden env file: {$entry}";
            }
            if (str_contains($entry, 'vendor/')) {
                $forbiddenFiles[] = "Forbidden vendor directory: {$entry}";
            }
            if (preg_match('/bootstrap\/cache\/.*\.php$/', $entry)) {
                $forbiddenFiles[] = "Forbidden bootstrap cache file: {$entry}";
            }
            if (str_contains($entry, '.git/')) {
                $forbiddenFiles[] = "Forbidden git directory: {$entry}";
            }
            if (str_contains($entry, 'phpunit.result.cache')) {
                $forbiddenFiles[] = "Forbidden phpunit cache: {$entry}";
            }
            if (preg_match('/storage\/logs\/.*\.log$/', $entry)) {
                $forbiddenFiles[] = "Forbidden log file: {$entry}";
            }
        }

        $zip->close();

        $this->assertTrue($hasComposerJson, 'ZIP must contain composer.json');
        $this->assertTrue($hasComposerLock, 'ZIP must contain composer.lock');
        $this->assertTrue($hasEnvExample, 'ZIP must contain .env.example');
        $this->assertEmpty($forbiddenFiles, 'ZIP contains forbidden files: ' . implode(', ', $forbiddenFiles));
    }
}

