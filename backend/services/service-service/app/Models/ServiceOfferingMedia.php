<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceOfferingMedia extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'service_offering_media';

    protected $fillable = [
        'id',
        'offering_id',
        'storage_disk',
        'storage_key',
        'mime_type',
        'bytes',
        'sha256',
        'sort_order',
        'is_primary',
        'storage_state',
    ];

    protected function casts(): array
    {
        return [
            'bytes' => 'integer',
            'sort_order' => 'integer',
            'is_primary' => 'boolean',
        ];
    }

    public function offering(): BelongsTo
    {
        return $this->belongsTo(ServiceOffering::class, 'offering_id');
    }

    public function isReady(): bool
    {
        return $this->storage_state === 'READY';
    }
}
