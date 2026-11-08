<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseReturnInspection extends Model
{
    protected $table = 'case_return_inspections';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'inspected_at',
        'inspected_by',
        'quantity_inspected',
        'quantity_approved',
        'item_condition',
        'is_sku_matched',
        'is_issue_matched',
        'is_components_complete',
        'inspection_outcome',
        'inspection_notes',
        'evidence_refs',
        'created_by',
    ];

    protected $casts = [
        'inspected_at' => 'datetime',
        'quantity_inspected' => 'integer',
        'quantity_approved' => 'integer',
        'is_sku_matched' => 'boolean',
        'is_issue_matched' => 'boolean',
        'is_components_complete' => 'boolean',
        'evidence_refs' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseReturnInspection $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->inspected_at)) {
                $model->inspected_at = now();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }
}

