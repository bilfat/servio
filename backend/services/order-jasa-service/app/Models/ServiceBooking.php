<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ServiceBooking extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'scheduled_start_at',
        'scheduled_end_at',
        'timezone',
    ];

    protected $guarded = [
        'id',
        'order_id',
        'customer_id',
        'provider_org_id',
        'slot_reference',
        'status',
        'schedule_revision',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'scheduled_start_at' => 'datetime',
        'scheduled_end_at' => 'datetime',
        'schedule_revision' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }

    public function assignmentAttempts(): HasMany
    {
        return $this->hasMany(WorkerAssignmentAttempt::class, 'booking_id')->orderBy('attempt_no', 'asc');
    }

    public function activeAssignment(): HasOne
    {
        return $this->hasOne(BookingActiveAssignment::class, 'booking_id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(BookingScheduleRevision::class, 'booking_id')->orderBy('revision_no', 'desc');
    }
}
