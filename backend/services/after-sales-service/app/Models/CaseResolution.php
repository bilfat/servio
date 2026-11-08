<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CaseResolution extends Model
{
    protected $table = 'case_resolutions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'solution_code',
        'agreed_at',
        'agreed_by_customer_at',
        'status',
        'evidence_ref',
    ];

    protected $casts = [
        'agreed_at' => 'datetime',
        'agreed_by_customer_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (CaseResolution $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->agreed_at)) {
                $model->agreed_at = now();
            }
        });
    }

    public function afterSalesCase(): BelongsTo
    {
        return $this->belongsTo(AfterSalesCase::class, 'case_id');
    }

    public function externalRefs(): HasMany
    {
        return $this->hasMany(CaseExternalRef::class, 'resolution_id');
    }
}

