<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subcategory extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'subcategories';

    protected $fillable = [
        'id',
        'category_id',
        'name',
        'normalized_name',
        'description',
        'status',
        'lock_version',
    ];

    protected $casts = [
        'lock_version' => 'integer',
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function referenceClaims(): HasMany
    {
        return $this->hasMany(SubcategoryReferenceClaim::class, 'subcategory_id');
    }

    public function getEffectiveActiveAttribute(): bool
    {
        if ($this->status !== 'ACTIVE') {
            return false;
        }

        $category = $this->category;
        if (! $category || $category->status !== 'ACTIVE') {
            return false;
        }

        $master = $category->master;
        if ($master && $master->status !== 'ACTIVE') {
            return false;
        }

        return true;
    }
}
