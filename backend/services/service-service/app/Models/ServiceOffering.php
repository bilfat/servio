<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceOffering extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'service_offerings';

    protected $fillable = [
        'id',
        'provider_organization_id',
        'service_definition_id',
        'created_by_user_id',
        'display_name',
        'normalized_display_name',
        'description',
        'included_items',
        'excluded_items',
        'customer_requirements',
        'price_model',
        'min_price_idr',
        'max_price_idr',
        'currency',
        'survey_availability',
        'survey_requirement',
        'survey_fee_model',
        'survey_fee_idr',
        'duration_min',
        'duration_max',
        'duration_unit',
        'status',
        'lock_version',
        'activated_at',
    ];

    protected function casts(): array
    {
        return [
            'included_items' => 'array',
            'excluded_items' => 'array',
            'customer_requirements' => 'array',
            'min_price_idr' => 'integer',
            'max_price_idr' => 'integer',
            'survey_fee_idr' => 'integer',
            'duration_min' => 'integer',
            'duration_max' => 'integer',
            'lock_version' => 'integer',
            'activated_at' => 'datetime',
        ];
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(ServiceDefinition::class, 'service_definition_id');
    }

    public function coverageCities(): HasMany
    {
        return $this->hasMany(ServiceCoverageCity::class, 'offering_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ServiceOfferingMedia::class, 'offering_id')->orderBy('sort_order');
    }

    public function primaryMedia(): HasOne
    {
        return $this->hasOne(ServiceOfferingMedia::class, 'offering_id')->where('is_primary', true);
    }

    public function capabilities(): BelongsToMany
    {
        return $this->belongsToMany(
            Capability::class,
            'service_offering_capabilities',
            'offering_id',
            'capability_id'
        )->withTimestamps();
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }

    public function isDraft(): bool
    {
        return $this->status === 'DRAFT';
    }
}
