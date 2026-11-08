<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class SolutionProposal extends Model
{
    protected $table = 'solution_proposals';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'proposal_version',
        'proposal_type',
        'solution_code',
        'reason',
        'proposed_by_actor_kind',
        'proposed_by_id',
        'state',
        'expires_at',
    ];

    protected $casts = [
        'proposal_version' => 'integer',
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (SolutionProposal $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }

    public function consent(): HasOne
    {
        return $this->hasOne(CustomerSolutionConsent::class, 'proposal_id');
    }
}

