<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiagnosisVersion extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'findings_summary',
        'root_cause',
        'recommended_action',
        'diagnosis_photo_refs',
        'client_visibility_evidence_json',
    ];

    protected $guarded = [
        'id',
        'order_id',
        'version_no',
        'status',
        'work_subtotal_idr',
        'provider_part_subtotal_idr',
        'service_total_base_idr',
        'submitted_at',
        'published_to_customer_at',
        'remote_response_due_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'version_no' => 'integer',
        'diagnosis_photo_refs' => 'array',
        'work_subtotal_idr' => 'integer',
        'provider_part_subtotal_idr' => 'integer',
        'service_total_base_idr' => 'integer',
        'client_visibility_evidence_json' => 'array',
        'submitted_at' => 'datetime',
        'published_to_customer_at' => 'datetime',
        'remote_response_due_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(ServiceWorkItem::class, 'diagnosis_version_id')->orderBy('line_no', 'asc');
    }

    public function partItems(): HasMany
    {
        return $this->hasMany(ServicePartItem::class, 'diagnosis_version_id')->orderBy('line_no', 'asc');
    }
}
