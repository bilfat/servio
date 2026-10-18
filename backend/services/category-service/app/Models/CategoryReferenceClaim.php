<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryReferenceClaim extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'category_reference_claims';

    protected $fillable = [
        'id',
        'category_id',
        'consumer_service',
        'consumer_reference_id',
        'state',
    ];

    protected $casts = [
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
}
