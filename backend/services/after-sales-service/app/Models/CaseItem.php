<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseItem extends Model
{
    protected $table = 'case_items';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'source_item_ref',
        'catalog_snapshot',
        'quantity_requested',
        'quantity_allocated',
        'is_service',
    ];

    protected $casts = [
        'catalog_snapshot' => 'array',
        'quantity_requested' => 'integer',
        'quantity_allocated' => 'integer',
        'is_service' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseItem $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }

    public function case(): BelongsTo
    {
        return $this->afterSalesCase();
    }
}

