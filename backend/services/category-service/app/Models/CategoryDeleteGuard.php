<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CategoryDeleteGuard extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'category_delete_guards';

    protected $fillable = [
        'id',
        'node_type',
        'node_id',
        'fence_generation',
        'fenced_at',
        'released_at',
        'reference_check_evidence',
    ];

    protected $casts = [
        'fence_generation' => 'integer',
        'fenced_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'released_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'reference_check_evidence' => 'array',
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];
}
