<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TaxRuleReference extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tax_code',
        'version_no',
        'tax_type',
        'liable_party',
        'taxable_base_code',
        'rate',
        'source_reference',
        'verification_status',
        'effective_from',
        'effective_until',
        'reviewed_by_user_id',
    ];

    protected $casts = [
        'version_no' => 'integer',
        'rate' => 'decimal:6',
        'effective_from' => 'datetime',
        'effective_until' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }
}
