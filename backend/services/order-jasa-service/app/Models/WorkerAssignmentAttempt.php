<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkerAssignmentAttempt extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Mass assignable attributes.
     * Only worker rejection feedback is fillable by the worker.
     * Snapshots, booking IDs, assignment timestamps, expiry reasons, version, and statuses are strictly guarded.
     */
    protected $fillable = [
        'rejection_reason_code',
        'rejection_notes',
    ];

    protected $guarded = [
        'id',
        'booking_id',
        'order_id',
        'worker_id',
        'provider_org_id',
        'status',
        'attempt_no',
        'assigned_by_id',
        'assigned_at',
        'response_due_at',
        'accepted_at',
        'rejected_at',
        'expiry_reason',
        'worker_capability_snapshot',
        'worker_membership_snapshot',
        'version',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'attempt_no' => 'integer',
        'assigned_at' => 'datetime',
        'response_due_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
        'worker_capability_snapshot' => 'array',
        'worker_membership_snapshot' => 'array',
        'version' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(ServiceBooking::class, 'booking_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }
}
