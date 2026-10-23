<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceCategoryReferenceHistory extends Model
{
    use HasUuids;

    protected $table = 'service_category_reference_history';

    protected $fillable = [
        'id',
        'definition_id',
        'offering_id',
        'category_id',
        'subcategory_id',
        'category_claim_id',
        'subcategory_claim_id',
        'operation_id',
        'effective_from',
        'effective_to',
    ];

    protected function casts(): array
    {
        return [
            'effective_from' => 'datetime',
            'effective_to' => 'datetime',
        ];
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(ServiceDefinition::class, 'definition_id');
    }

    public function offering(): BelongsTo
    {
        return $this->belongsTo(ServiceOffering::class, 'offering_id');
    }
}
