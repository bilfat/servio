<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseShippingExpense extends Model
{
    protected $table = 'case_shipping_expenses';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'expense_type',
        'fee_payer',
        'actual_fee_idr',
        'paid_by',
        'verification_status',
        'approved_reimbursement_idr',
        'reimbursement_status',
        'receipt_ref',
        'reimbursement_tx_ref',
        'notes',
    ];

    protected $casts = [
        'actual_fee_idr' => 'decimal:2',
        'approved_reimbursement_idr' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseShippingExpense $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }
}

