<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingActiveAssignment extends Model
{
    public $incrementing = false;
    protected $primaryKey = 'booking_id';
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Active Assignment Slot Lock: System managed assignment lock.
     * All attributes are strictly protected against mass-assignment.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'assigned_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(ServiceBooking::class, 'booking_id');
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(WorkerAssignmentAttempt::class, 'attempt_id');
    }
}
