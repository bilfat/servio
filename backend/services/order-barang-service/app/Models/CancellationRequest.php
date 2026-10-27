<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CancellationRequest extends Model
{
    use HasUlids;

    protected $table = 'cancellation_requests';
    protected $keyType = 'string';
    public $incrementing = false;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_APPROVED = 'APPROVED';
    public const STATUS_REJECTED = 'REJECTED';

    public const DECISION_SOURCE_MERCHANT = 'MERCHANT';
    public const DECISION_SOURCE_CUSTOMER = 'CUSTOMER';
    public const DECISION_SOURCE_SYSTEM = 'SYSTEM';

    public const REASON_TIMEOUT_NO_RESPONSE = 'TIMEOUT_NO_RESPONSE';

    protected $fillable = [
        'id',
        'order_id',
        'requested_by_id',
        'reason_code',
        'reason_note',
        'status',
        'requested_at',
        'response_deadline_at',
        'merchant_schedule_source',
        'merchant_schedule_version',
        'merchant_timezone',
        'operational_schedule_snapshot',
        'decided_at',
        'decision_source',
        'decision_actor_id',
        'decision_reason',
        'decision_note',
        'version',
    ];

    protected $casts = [
        'operational_schedule_snapshot' => 'array',
        'requested_at' => 'datetime',
        'response_deadline_at' => 'datetime',
        'decided_at' => 'datetime',
        'version' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isExpired(): bool
    {
        return $this->isPending() && now()->greaterThanOrEqualTo($this->response_deadline_at);
    }
}
