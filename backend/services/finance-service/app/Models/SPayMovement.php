<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SPayMovement extends Model
{
    protected $table = 'spay_movements';
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'spay_account_id',
        'movement_type',
        'direction',
        'amount_idr',
        'source_type',
        'source_id',
        'available_before_idr',
        'available_after_idr',
        'locked_before_idr',
        'locked_after_idr',
        'created_at',
    ];

    protected $casts = [
        'amount_idr' => 'integer',
        'available_before_idr' => 'integer',
        'available_after_idr' => 'integer',
        'locked_before_idr' => 'integer',
        'locked_after_idr' => 'integer',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(SPayAccount::class, 'spay_account_id');
    }
}
