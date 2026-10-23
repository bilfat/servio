<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceDefinition extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'service_definitions';

    protected $fillable = [
        'id',
        'code',
        'name',
        'normalized_name',
        'category_id',
        'subcategory_id',
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

    public function capabilities(): BelongsToMany
    {
        return $this->belongsToMany(
            Capability::class,
            'service_definition_capabilities',
            'definition_id',
            'capability_id'
        )->withTimestamps();
    }

    public function media(): HasMany
    {
        return $this->hasMany(ServiceDefinitionMedia::class, 'definition_id');
    }

    public function offerings(): HasMany
    {
        return $this->hasMany(ServiceOffering::class, 'service_definition_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(ServiceDefinitionRequest::class, 'fulfilled_definition_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }
}
