<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServicePartItem extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'line_no',
        'part_name',
        'specification',
        'source',
        'quantity',
        'unit',
        'worker_note',
    ];

    protected $guarded = [
        'id',
        'diagnosis_version_id',
        'related_product_id',
        'related_product_order_id',
        'unit_price_idr',
        'subtotal_idr',
        'availability_status',
        'compatibility_check_status',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'line_no' => 'integer',
        'quantity' => 'integer',
        'unit_price_idr' => 'integer',
        'subtotal_idr' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function diagnosisVersion(): BelongsTo
    {
        return $this->belongsTo(DiagnosisVersion::class, 'diagnosis_version_id');
    }
}
