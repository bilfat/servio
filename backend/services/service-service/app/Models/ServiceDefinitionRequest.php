<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceDefinitionRequest extends Model
{
    use HasUuids;

    protected $table = 'service_definition_requests';

    protected $fillable = [
        'id',
        'requester_user_id',
        'provider_organization_id',
        'proposed_name',
        'normalized_name',
        'category_id',
        'subcategory_id',
        'reason',
        'status',
        'reviewer_user_id',
        'review_note',
        'fulfilled_definition_id',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'lock_version' => 'integer',
        ];
    }

    public function fulfilledDefinition(): BelongsTo
    {
        return $this->belongsTo(ServiceDefinition::class, 'fulfilled_definition_id');
    }
}
