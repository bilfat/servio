<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FollowupOrderDraft extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Follow-up Order Draft: Server-authoritative draft entity.
     * All attributes are strictly protected against mass assignment.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'draft_snapshot' => 'array',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function originOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'origin_order_id');
    }
}
