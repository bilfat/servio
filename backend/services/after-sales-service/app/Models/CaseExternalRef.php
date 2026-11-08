<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseExternalRef extends Model
{
    protected $table = 'case_external_refs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'resolution_id',
        'target_service',
        'external_id',
        'purpose',
        'external_status',
        'last_checked_at',
        'last_event_id',
    ];

    protected $casts = [
        'last_checked_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseExternalRef $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }

    public function resolution(): BelongsTo
    {
        return $this->belongsTo(CaseResolution::class, 'resolution_id');
    }
}

