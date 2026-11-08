<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseReturnInstruction extends Model
{
    protected $table = 'case_return_instructions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'requires_physical_return',
        'no_return_reason',
        'recipient_name',
        'recipient_phone',
        'return_address',
        'packaging_instructions',
        'shipping_fee_payer',
        'shipping_fee_method',
        'reimbursement_instructions',
        'deadline_at',
        'merchant_notes',
        'created_by',
    ];

    protected $casts = [
        'requires_physical_return' => 'boolean',
        'deadline_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseReturnInstruction $model) {
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

