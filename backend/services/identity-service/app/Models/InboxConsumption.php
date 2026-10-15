<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class InboxConsumption extends Model
{
    protected $table = 'inbox_consumptions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'consumer_name',
        'source_event_id',
        'processed_at',
        'status',
        'error_code',
    ];

    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
        ];
    }

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->processed_at)) {
                $model->processed_at = now();
            }
        });
    }
}
