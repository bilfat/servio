<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Interface contract for persisting service evidence photos and diagnosis media.
 */
interface MediaStorageInterface
{
    /**
     * Store execution or diagnosis evidence file.
     *
     * @param string $path Target storage path
     * @param string $contents Raw binary content
     * @param array<string, mixed> $options
     * @return array{storage_key: string, public_url: string, size_bytes: int, sha256: string}
     */
    public function storeEvidence(string $path, string $contents, array $options = []): array;

    /**
     * Generate temporary signed read URL for private evidence.
     *
     * @param string $storageKey
     * @param int $expirationMinutes
     * @return string
     */
    public function getTemporaryUrl(string $storageKey, int $expirationMinutes = 30): string;
}

