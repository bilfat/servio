<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExecutionEvidence extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'evidence_type',
        'media_ref',
        'file_name',
        'mime_type',
        'size_bytes',
        'caption',
        'capture_at',
    ];

    protected $guarded = [
        'id',
        'execution_id',
        'order_id',
        'ordinal',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'ordinal' => 'integer',
        'size_bytes' => 'integer',
        'capture_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function execution(): BelongsTo
    {
        return $this->belongsTo(ServiceExecution::class, 'execution_id');
    }
}
