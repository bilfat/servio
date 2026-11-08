<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ReviewReply extends Model
{
    protected $table = 'review_replies';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'review_entry_id',
        'owner_org_id',
        'text',
        'replied_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (ReviewReply $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(ReviewEntry::class, 'review_entry_id');
    }
}

