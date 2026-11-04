<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperationalIssue extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'issue_type',
        'description',
        'evidence_refs',
        'resolution_notes',
    ];

    protected $guarded = [
        'id',
        'order_id',
        'reporter_role',
        'reporter_id',
        'status',
        'affects_completion',
        'affects_funds',
        'escalated_to',
        'resolved_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'evidence_refs' => 'array',
        'affects_completion' => 'boolean',
        'affects_funds' => 'boolean',
        'resolved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }
}
