<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryRequest extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'category_requests';

    protected $fillable = [
        'id',
        'request_type',
        'master_id',
        'proposed_parent_category_id',
        'requester_user_id',
        'requester_role',
        'requester_org_id',
        'suggested_name',
        'normalized_suggested_name',
        'reason',
        'additional_information',
        'status',
        'duplicate_of_request_id',
        'fulfilled_category_id',
        'fulfilled_subcategory_id',
        'reviewer_user_id',
        'review_reason',
        'lock_version',
        'reviewed_at',
    ];

    protected $casts = [
        'lock_version' => 'integer',
        'reviewed_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];

    public function master(): BelongsTo
    {
        return $this->belongsTo(CategoryMaster::class, 'master_id');
    }

    public function proposedParent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'proposed_parent_category_id');
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(CategoryRequest::class, 'duplicate_of_request_id');
    }

    public function fulfilledCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'fulfilled_category_id');
    }

    public function fulfilledSubcategory(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class, 'fulfilled_subcategory_id');
    }
}
