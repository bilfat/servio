<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Capability extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'capabilities';

    protected $fillable = [
        'id',
        'code',
        'name',
        'normalized_name',
        'description',
        'status',
        'created_by_user_id',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'lock_version' => 'integer',
        ];
    }

    public function definitions(): BelongsToMany
    {
        return $this->belongsToMany(
            ServiceDefinition::class,
            'service_definition_capabilities',
            'capability_id',
            'definition_id'
        )->withTimestamps();
    }

    public function offerings(): BelongsToMany
    {
        return $this->belongsToMany(
            ServiceOffering::class,
            'service_offering_capabilities',
            'capability_id',
            'offering_id'
        )->withTimestamps();
    }

    public function workerCapabilities(): HasMany
    {
        return $this->hasMany(WorkerCapability::class, 'capability_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }
}
