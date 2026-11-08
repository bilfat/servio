<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CustomerSolutionConsent extends Model
{
    protected $table = 'customer_solution_consents';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'proposal_id',
        'case_id',
        'customer_id',
        'decision',
        'reason',
        'decided_at',
        'idempotency_key',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (CustomerSolutionConsent $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->decided_at)) {
                $model->decided_at = now();
            }
        });
    }

    public function proposal(): BelongsTo
    {
        return $this->belongsTo(SolutionProposal::class, 'proposal_id');
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }
}

