<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Delivery extends Model
{
    use HasUlids;

    protected $table = 'deliveries';
    protected $keyType = 'string';
    public $incrementing = false;

    // Delivery Statuses
    public const STATUS_NOT_STARTED = 'NOT_STARTED';
    public const STATUS_READY_FOR_DELIVERY = 'READY_FOR_DELIVERY';
    public const STATUS_IN_TRANSIT = 'IN_TRANSIT';
    public const STATUS_DELIVERED = 'DELIVERED';
    public const STATUS_FAILED = 'FAILED';

    protected $fillable = [
        'id',
        'order_id',
        'service_type',
        'status',
        'courier_method',
        'provider',
        'booking_reference',
        'tracking_url',
        'courier_name_ciphertext',
        'courier_phone_ciphertext',
        'picked_up_at',
        'delivered_at',
        'recipient_name',
        'proof_reference',
        'proof_verified',
        'last_failure_code',
        'attempt_count',
        'version',
    ];

    protected $casts = [
        'proof_verified' => 'boolean',
        'picked_up_at' => 'datetime',
        'delivered_at' => 'datetime',
        'attempt_count' => 'integer',
        'version' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(DeliveryAttempt::class, 'delivery_id')->orderBy('attempt_no', 'asc');
    }

    public function events(): HasMany
    {
        return $this->hasMany(DeliveryEvent::class, 'delivery_id')->orderBy('occurred_at', 'asc');
    }
}
