<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceDefinitionMedia extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'service_definition_media';

    protected $fillable = [
        'id',
        'definition_id',
        'storage_disk',
        'storage_key',
        'mime_type',
        'bytes',
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

    public function definition(): BelongsTo
    {
        return $this->belongsTo(ServiceDefinition::class, 'definition_id');
    }
}
