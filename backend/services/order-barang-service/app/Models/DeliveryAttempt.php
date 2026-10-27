<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryAttempt extends Model
{
    use HasUlids;

    protected $table = 'delivery_attempts';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'delivery_id',
        'attempt_no',
        'courier_method',
        'failure_reason_code',
        'outcome',
        'attempted_at',
        'note',
    ];

    protected $casts = [
        'attempt_no' => 'integer',
        'attempted_at' => 'datetime',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class, 'delivery_id');
    }
}
