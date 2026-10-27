<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentProjection extends Model
{
    use HasUlids;

    protected $table = 'payment_projections';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'checkout_group_id',
        'finance_payment_id',
        'payment_status',
        'amount_idr',
        'currency',
        'paid_at',
        'expires_at',
        'finance_event_id',
        'finance_event_version',
        'last_verified_at',
    ];

    protected $casts = [
        'amount_idr' => 'integer',
        'paid_at' => 'datetime',
        'expires_at' => 'datetime',
        'finance_event_version' => 'integer',
        'last_verified_at' => 'datetime',
    ];

    public function checkoutGroup(): BelongsTo
    {
        return $this->belongsTo(CheckoutGroup::class, 'checkout_group_id');
    }
}
