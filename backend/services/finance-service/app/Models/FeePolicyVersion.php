<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class FeePolicyVersion extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'group_id',
        'version_no',
        'status',
        'effective_from',
        'effective_until',
        'change_reason',
        'created_by_user_id',
        'published_by_user_id',
        'published_at',
        'snapshot_hash',
    ];

    protected $casts = [
        'version_no' => 'integer',
        'effective_from' => 'datetime',
        'effective_until' => 'datetime',
        'published_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(FeePolicyGroup::class, 'group_id');
    }

    public function targets(): HasMany
    {
        return $this->hasMany(FeePolicyTarget::class, 'version_id');
    }
}
