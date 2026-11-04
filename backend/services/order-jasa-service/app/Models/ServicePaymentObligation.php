<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServicePaymentObligation extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Financial Ledger Model: Strictly protected against mass assignment.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'principal_idr' => 'integer',
        'fee_snapshot' => 'array',
        'paid_at' => 'datetime',
        'payment_due_at' => 'datetime',
        'version' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ServicePaymentAttempt::class, 'obligation_id')->orderBy('attempt_no', 'asc');
    }
}
