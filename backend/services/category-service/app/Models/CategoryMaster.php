<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategoryMaster extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'category_masters';

    protected $fillable = [
        'id',
        'code',
        'name',
        'status',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class, 'master_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(CategoryRequest::class, 'master_id');
    }
}
