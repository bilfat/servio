<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkerCapability extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'worker_capabilities';

    protected $fillable = [
        'id',
        'worker_user_id',
        'provider_organization_id',
        'capability_id',
        'status',
        'recorded_by_user_id',
        'lock_version',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'lock_version' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function capability(): BelongsTo
    {
        return $this->belongsTo(Capability::class, 'capability_id');
    }
}
