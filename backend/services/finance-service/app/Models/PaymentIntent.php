<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PaymentIntent extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'finance_checkout_id',
        'method',
        'provider',
        'provider_reference',
        'instruction_payload',
        'amount_idr',
        'currency',
        'status',
        'issued_at',
        'expires_at',
        'paid_at',
        'last_provider_event_id',
        'is_active',
    ];

    protected $casts = [
        'instruction_payload' => 'array',
        'amount_idr' => 'integer',
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function checkout(): BelongsTo
    {
        return $this->belongsTo(FinanceCheckout::class, 'finance_checkout_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(PaymentEvent::class, 'payment_intent_id');
    }
}
