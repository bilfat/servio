<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceCoverageCity extends Model
{
    use HasUuids;

    protected $table = 'service_coverage_cities';

    protected $fillable = [
        'id',
        'offering_id',
        'city_code',
        'city_label_snapshot',
    ];

    public function offering(): BelongsTo
    {
        return $this->belongsTo(ServiceOffering::class, 'offering_id');
    }
}
