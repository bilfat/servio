<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseReturnReceipt extends Model
{
    protected $table = 'case_return_receipts';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'received_at',
        'received_by',
        'quantity_received',
        'package_condition',
        'receipt_proof_ref',
        'receipt_notes',
        'status',
        'dispute_reason',
        'created_by',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'quantity_received' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseReturnReceipt $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->received_at)) {
                $model->received_at = now();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }
}

