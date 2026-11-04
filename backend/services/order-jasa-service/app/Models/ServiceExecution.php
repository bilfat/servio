<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceExecution extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'actual_part_usage_json',
        'execution_notes',
    ];

    protected $guarded = [
        'id',
        'order_id',
        'worker_id',
        'status',
        'started_at',
        'finished_at',
        'completion_evidence_validated_at',
        'version',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'actual_part_usage_json' => 'array',
        'completion_evidence_validated_at' => 'datetime',
        'version' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(ExecutionEvidence::class, 'execution_id')->orderBy('ordinal', 'asc');
    }

    public function evidence(): HasMany
    {
        return $this->evidences();
    }
}
