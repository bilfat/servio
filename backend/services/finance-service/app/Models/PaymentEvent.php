<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaymentEvent extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'payment_intent_id',
        'provider',
        'provider_event_id',
        'event_type',
        'reported_amount_idr',
        'provider_occurred_at',
        'received_at',
        'validation_result',
        'payload',
    ];

    protected $casts = [
        'reported_amount_idr' => 'integer',
        'provider_occurred_at' => 'datetime',
        'received_at' => 'datetime',
        'payload' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'payment_intent_id');
    }
}
