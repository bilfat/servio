<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

use App\Contracts\MediaStorageInterface;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LocalMediaStorage implements MediaStorageInterface
{
    public function storeEvidence(string $path, string $contents, array $options = []): array
    {
        $sha256 = hash('sha256', $contents);
        $sizeBytes = strlen($contents);
        $storageKey = $path . '/' . Str::random(16);

        Storage::disk('local')->put($storageKey, $contents);

        return [
            'storage_key' => $storageKey,
            'public_url' => "/media/evidence/{$storageKey}",
            'size_bytes' => $sizeBytes,
            'sha256' => $sha256,
        ];
    }

    public function getTemporaryUrl(string $storageKey, int $expirationMinutes = 30): string
    {
        return "/media/evidence/{$storageKey}?token=" . Str::random(32);
    }
}

