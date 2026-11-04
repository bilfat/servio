<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerConsent extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Legal Consent Record: Strictly protected against mass assignment.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'statement_acknowledged' => 'boolean',
        'customer_present_reported' => 'boolean',
        'client_context_json' => 'array',
        'submitted_at' => 'datetime',
        'remote_due_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }

    public function diagnosisVersion(): BelongsTo
    {
        return $this->belongsTo(DiagnosisVersion::class, 'diagnosis_version_id');
    }
}
