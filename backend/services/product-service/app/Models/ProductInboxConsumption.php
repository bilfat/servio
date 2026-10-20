<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductInboxConsumption extends Model
{
    use HasFactory;

    protected $table = 'product_inbox_consumptions';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'source_service',
        'event_id',
        'aggregate_id',
        'aggregate_version',
        'processed_at',
        'payload_hash',
    ];

    protected function casts(): array
    {
        return [
            'aggregate_version' => 'integer',
            'processed_at' => 'datetime',
        ];
    }
}
