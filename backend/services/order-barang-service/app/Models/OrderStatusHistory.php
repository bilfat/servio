<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderStatusHistory extends Model
{
    use HasUlids;

    protected $table = 'order_status_histories';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'order_id',
        'previous_status',
        'new_status',
        'action',
        'actor_id',
        'actor_role',
        'source_service',
        'reason_code',
        'reason_note',
        'related_event_id',
        'order_version',
        'occurred_at',
    ];

    protected $casts = [
        'order_version' => 'integer',
        'occurred_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
