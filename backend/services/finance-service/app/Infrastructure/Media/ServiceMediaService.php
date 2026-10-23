<?php

namespace App\Infrastructure\Media;

use App\Models\ServiceOfferingMedia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ServiceMediaService
{
    protected string $disk = 'local';
    protected array $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    protected int $maxBytes = 5242880; // 5 MB

    public function storeOfferingMedia(UploadedFile $file, string $offeringId, bool $isPrimary = false, int $sortOrder = 0): ServiceOfferingMedia
    {
        $mime = $file->getMimeType();
        $size = $file->getSize();

        if (! in_array($mime, $this->allowedMimes, true)) {
            throw new \InvalidArgumentException('Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.');
        }

        if ($size > $this->maxBytes) {
            throw new \InvalidArgumentException('Ukuran gambar melebihi batas maksimum 5 MB.');
        }

        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $mediaId = (string) Str::uuid();
        $storageKey = "service-media/{$offeringId}/{$mediaId}.{$extension}";

        $file->storeAs('private/' . dirname($storageKey), basename($storageKey), $this->disk);

        if ($isPrimary) {
            ServiceOfferingMedia::where('offering_id', $offeringId)
                ->where('is_primary', true)
                ->update(['is_primary' => false]);
        }

        return ServiceOfferingMedia::create([
            'id' => $mediaId,
            'offering_id' => $offeringId,
            'storage_disk' => $this->disk,
            'storage_key' => $storageKey,
            'mime_type' => $mime,
            'bytes' => $size,
            'sha256' => hash_file('sha256', $file->getRealPath()),
            'sort_order' => $sortOrder,
            'is_primary' => $isPrimary,
            'storage_state' => 'READY',
        ]);
    }
}
