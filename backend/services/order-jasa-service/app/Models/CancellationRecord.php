<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CancellationRecord extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'reason_code',
        'reason_notes',
    ];

    protected $guarded = [
        'id',
        'order_id',
        'cancelled_by_role',
        'cancelled_by_id',
        'compensation_fee_idr',
        'diagnosis_fulfilled',
        'cancelled_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'diagnosis_fulfilled' => 'boolean',
        'cancelled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }
}
