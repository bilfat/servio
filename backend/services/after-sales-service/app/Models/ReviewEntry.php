<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class ReviewEntry extends Model
{
    protected $table = 'review_entries';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'submission_id',
        'owner_org_id',
        'source_item_key',
        'target_type',
        'target_id',
        'rating',
        'text',
        'media_refs',
        'status',
        'submitted_at',
    ];

    protected $casts = [
        'rating' => 'integer',
        'media_refs' => 'array',
        'submitted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (ReviewEntry $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->submitted_at)) {
                $model->submitted_at = now();
            }
        });
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(ReviewSubmission::class, 'submission_id');
    }

    public function reply(): HasOne
    {
        return $this->hasOne(ReviewReply::class, 'review_entry_id');
    }

    public function moderations(): HasMany
    {
        return $this->hasMany(ReviewModeration::class, 'review_entry_id')->orderBy('occurred_at', 'desc');
    }

    public function isVisible(): bool
    {
        return $this->status === 'VISIBLE';
    }
}

