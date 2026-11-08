<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ReviewModeration extends Model
{
    protected $table = 'review_moderations';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'review_entry_id',
        'admin_id',
        'action',
        'reason',
        'occurred_at',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (ReviewModeration $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->occurred_at)) {
                $model->occurred_at = now();
            }
        });
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(ReviewEntry::class, 'review_entry_id');
    }
}

