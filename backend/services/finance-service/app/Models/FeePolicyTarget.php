<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class FeePolicyTarget extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'version_id',
        'policy_code',
        'scope',
        'payer_type',
        'fee_type',
        'fixed_amount_idr',
        'percentage_rate',
        'charge_scope',
        'calculation_base',
        'rounding_method',
        'min_fee_idr',
        'max_fee_idr',
    ];

    protected $casts = [
        'fixed_amount_idr' => 'integer',
        'percentage_rate' => 'decimal:6',
        'min_fee_idr' => 'integer',
        'max_fee_idr' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(FeePolicyVersion::class, 'version_id');
    }
}
