<?php

declare(strict_types=1);

$sourceDir = realpath(__DIR__);
$zipFileName = 'order-barang-service.zip';
$tempZipPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'clean_' . uniqid() . '.zip';

echo "Source directory: {$sourceDir}\n";
echo "Packaging temporary path: {$tempZipPath}\n";

$zip = new ZipArchive();
if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    fwrite(STDERR, "FATAL: Could not create zip archive\n");
    exit(1);
}

// Exclude patterns
$excludedDirNames = [
    'vendor',
    'node_modules',
    '.git',
];

$excludedRelativePrefixes = [
    'storage/logs',
    'storage/framework/cache',
    'storage/framework/sessions',
    'storage/framework/views',
];

$excludedFileNames = [
    '.env',
    '.env.testing',
    '.env.local',
    '.phpunit.result.cache',
    'order-barang-service.zip',
];

$excludedExtensions = [
    'log',
    'sql',
    'dump',
    'zip',
];

$filesAdded = 0;
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($sourceDir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

foreach ($iterator as $item) {
    $realPath = $item->getRealPath();
    $relativePath = str_replace('\\', '/', substr($realPath, strlen($sourceDir) + 1));

    // Check directory exclusions
    $parts = explode('/', $relativePath);
    $shouldExclude = false;

    foreach ($parts as $part) {
        if (in_array($part, $excludedDirNames, true)) {
            $shouldExclude = true;
            break;
        }
    }

    if ($shouldExclude) {
        continue;
    }

    foreach ($excludedRelativePrefixes as $prefix) {
        if (str_starts_with($relativePath, $prefix)) {
            $shouldExclude = true;
            break;
        }
    }

    if ($shouldExclude) {
        continue;
    }

    if ($item->isDir()) {
        // Keep empty storage structure directories
        if (in_array($relativePath, ['storage', 'storage/app', 'storage/framework', 'storage/logs'], true)) {
            $zip->addEmptyDir($relativePath);
        }
        continue;
    }

    $filename = $item->getFilename();
    if (in_array($filename, $excludedFileNames, true)) {
        continue;
    }

    // Exclude any .env.* except .env.example
    if (str_starts_with($filename, '.env.') && $filename !== '.env.example') {
        continue;
    }

    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    if (in_array($ext, $excludedExtensions, true)) {
        continue;
    }

    // Add file
    $zip->addFile($realPath, $relativePath);
    $filesAdded++;
}

$zip->close();

$tempSize = filesize($tempZipPath);
echo "Successfully created clean zip archive. Added {$filesAdded} files. Size: " . number_format($tempSize) . " bytes (" . round($tempSize / 1024, 2) . " KB).\n";

// Deploy to target paths:
// 1. backend/services/order-barang-service/order-barang-service.zip
// 2. backend/services/order-barang-service.zip
// 3. order-barang-service.zip (workspace root)
$targetPaths = [
    $sourceDir . DIRECTORY_SEPARATOR . $zipFileName,
    dirname($sourceDir) . DIRECTORY_SEPARATOR . $zipFileName,
    dirname(dirname(dirname($sourceDir))) . DIRECTORY_SEPARATOR . $zipFileName,
];

foreach ($targetPaths as $target) {
    if (copy($tempZipPath, $target)) {
        echo "Deployed clean ZIP to: {$target} (" . filesize($target) . " bytes)\n";
    } else {
        fwrite(STDERR, "Failed to copy zip to: {$target}\n");
    }
}

unlink($tempZipPath);
echo "=== ZIP CREATION COMPLETE ===\n";
