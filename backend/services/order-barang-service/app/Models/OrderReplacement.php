<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class OrderReplacement extends Model
{
    use HasUlids;

    protected $table = 'order_replacements';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'source_order_id',
        'merchant_org_id',
        'customer_id',
        'items_json',
        'status',
        'waybill_number',
        'courier_name',
        'proof_of_delivery',
        'shipped_at',
        'delivered_at',
    ];

    protected $casts = [
        'items_json' => 'array',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];
}

