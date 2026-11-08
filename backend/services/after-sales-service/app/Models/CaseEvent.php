<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CaseEvent extends Model
{
    protected $table = 'case_events';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'sequence',
        'event_type',
        'from_state',
        'to_state',
        'actor_kind',
        'actor_id',
        'reason',
        'data_json',
        'occurred_at',
    ];

    protected $casts = [
        'sequence' => 'integer',
        'data_json' => 'array',
        'occurred_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseEvent $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->occurred_at)) {
                $model->occurred_at = now();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }
}

