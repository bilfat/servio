<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceFinanceEntitlementRef extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Financial Reconciliation Reference: Strictly protected against mass assignment.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'net_provider_idr' => 'integer',
        'release_eligible_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }
}
