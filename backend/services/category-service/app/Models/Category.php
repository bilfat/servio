<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'categories';

    protected $fillable = [
        'id',
        'master_id',
        'name',
        'normalized_name',
        'description',
        'icon_name',
        'status',
        'lock_version',
    ];

    protected $casts = [
        'lock_version' => 'integer',
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];

    public function master(): BelongsTo
    {
        return $this->belongsTo(CategoryMaster::class, 'master_id');
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(Subcategory::class, 'category_id');
    }

    public function referenceClaims(): HasMany
    {
        return $this->hasMany(CategoryReferenceClaim::class, 'category_id');
    }

    public function getEffectiveActiveAttribute(): bool
    {
        return $this->status === 'ACTIVE' && ($this->master?->status ?? 'ACTIVE') === 'ACTIVE';
    }
}
