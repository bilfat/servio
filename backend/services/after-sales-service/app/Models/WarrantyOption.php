<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class WarrantyOption extends Model
{
    protected $table = 'warranty_options';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'org_type',
        'org_id',
        'slug',
        'status',
        'latest_version_id',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    protected static function booted(): void
    {
        static::creating(function (WarrantyOption $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function versions(): HasMany
    {
        return $this->hasMany(WarrantyOptionVersion::class, 'option_id')->orderBy('version_no', 'desc');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(WarrantyOptionVersion::class, 'id', 'latest_version_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }
}

