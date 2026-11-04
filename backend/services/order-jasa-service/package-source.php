<?php

declare(strict_types=1);

$baseDir = __DIR__;
$zipFile = $baseDir . DIRECTORY_SEPARATOR . 'order-jasa-service-source-only.zip';

if (file_exists($zipFile)) {
    unlink($zipFile);
}

$zip = new ZipArchive();
if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    fwrite(STDERR, "Cannot create zip archive\n");
    exit(1);
}

$excludedDirs = [
    'vendor',
    '.git',
    'bootstrap/cache',
];

$excludedFiles = [
    '.env',
    '.env.testing',
    '.phpunit.result.cache',
    'phpunit.result.cache',
    'order-jasa-service-source-only.zip',
    'package-source.php',
    'prompt_v4.txt',
];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

foreach ($iterator as $item) {
    $filePath = $item->getRealPath();
    $relativePath = str_replace('\\', '/', substr($filePath, strlen($baseDir) + 1));

    // Check excluded directories
    $skip = false;
    foreach ($excludedDirs as $dir) {
        if ($relativePath === $dir || str_starts_with($relativePath, $dir . '/')) {
            $skip = true;
            break;
        }
    }
    if ($skip) {
        continue;
    }

    // Check excluded files
    if (in_array(basename($relativePath), $excludedFiles, true)) {
        continue;
    }

    if (preg_match('/(^|\/)\.env(\.|$)(?!example)/', $relativePath)) {
        continue;
    }

    if (preg_match('/storage\/logs\/.*\.log$/', $relativePath)) {
        continue;
    }

    if ($item->isDir()) {
        $zip->addEmptyDir($relativePath);
    } elseif ($item->isFile()) {
        $zip->addFile($filePath, $relativePath);
    }
}

// Ensure bootstrap/cache exists as an empty directory with .gitignore
$zip->addEmptyDir('bootstrap/cache');
$zip->addFromString('bootstrap/cache/.gitignore', "*\n!.gitignore\n");

// Ensure storage subdirectories exist
$storageDirs = [
    'storage/app',
    'storage/framework/cache',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/logs',
];
foreach ($storageDirs as $sDir) {
    $zip->addEmptyDir($sDir);
    $zip->addFromString($sDir . '/.gitignore', "*\n!.gitignore\n");
}

$zip->close();

echo "Successfully generated clean source-only package: {$zipFile}\n";

