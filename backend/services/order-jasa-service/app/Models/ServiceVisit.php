<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceVisit extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'visit_close_reason',
    ];

    protected $guarded = [
        'id',
        'order_id',
        'assignment_id',
        'worker_id',
        'status',
        'otw_at',
        'arrived_at',
        'diagnosis_started_at',
        'diagnosis_submitted_at',
        'visit_closed_at',
        'version',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'otw_at' => 'datetime',
        'arrived_at' => 'datetime',
        'diagnosis_started_at' => 'datetime',
        'diagnosis_submitted_at' => 'datetime',
        'visit_closed_at' => 'datetime',
        'version' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(WorkerAssignmentAttempt::class, 'assignment_id');
    }
}
