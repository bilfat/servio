<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseReturnShipment extends Model
{
    protected $table = 'case_return_shipments';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'courier_name',
        'tracking_number',
        'shipped_at',
        'shipping_fee_paid_idr',
        'shipping_receipt_ref',
        'fee_payment_proof_ref',
        'customer_notes',
        'shipping_status',
        'created_by',
    ];

    protected $casts = [
        'shipped_at' => 'datetime',
        'shipping_fee_paid_idr' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseReturnShipment $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->shipped_at)) {
                $model->shipped_at = now();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }
}

