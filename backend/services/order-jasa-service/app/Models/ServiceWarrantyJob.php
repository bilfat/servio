<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class ServiceWarrantyJob extends Model
{
    use HasUlids;

    protected $table = 'service_warranty_jobs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_id',
        'source_order_id',
        'provider_org_id',
        'customer_id',
        'badge',
        'scope_description',
        'price_idr',
        'status',
        'worker_id',
        'worker_name',
        'scheduled_date',
        'notes',
        'completion_evidence',
        'completed_at',
    ];

    protected $casts = [
        'price_idr' => 'integer',
        'completed_at' => 'datetime',
    ];
}

