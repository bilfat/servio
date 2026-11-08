<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WarrantyOptionVersion extends Model
{
    protected $table = 'warranty_option_versions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'option_id',
        'version_no',
        'name',
        'duration_days',
        'coverage_text',
        'exclusion_text',
        'published_at',
        'changed_by',
    ];

    protected $casts = [
        'version_no' => 'integer',
        'duration_days' => 'integer',
        'published_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (WarrantyOptionVersion $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(WarrantyOption::class, 'option_id');
    }
}

