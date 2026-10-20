<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductOutboxEvent extends Model
{
    use HasFactory;

    protected $table = 'product_outbox_events';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'product_id',
        'event_type',
        'aggregate_version',
        'payload',
        'occurred_at',
        'published_at',
        'attempts',
        'correlation_id',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'aggregate_version' => 'integer',
            'attempts' => 'integer',
            'occurred_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
