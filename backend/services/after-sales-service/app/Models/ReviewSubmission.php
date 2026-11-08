<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ReviewSubmission extends Model
{
    protected $table = 'review_submissions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'source_kind',
        'source_order_id',
        'source_merchant_order_id',
        'customer_id',
        'submitted_at',
        'idempotency_key',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (ReviewSubmission $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->submitted_at)) {
                $model->submitted_at = now();
            }
        });
    }

    public function entries(): HasMany
    {
        return $this->hasMany(ReviewEntry::class, 'submission_id');
    }
}

