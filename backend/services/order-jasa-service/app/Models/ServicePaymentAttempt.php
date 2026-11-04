<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServicePaymentAttempt extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Financial Payment Attempt: Strictly protected against mass assignment.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'attempt_no' => 'integer',
        'amount_due_idr' => 'integer',
        'is_current' => 'boolean',
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
        'status_last_verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function obligation(): BelongsTo
    {
        return $this->belongsTo(ServicePaymentObligation::class, 'obligation_id');
    }
}
