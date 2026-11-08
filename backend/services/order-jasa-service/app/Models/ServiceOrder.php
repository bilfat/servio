<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ServiceOrder extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // We use explicit UTC datetime(6) fields

    /**
     * Mass assignable attributes.
     * Only customer-submitted narrative inputs are mass-assignable.
     * All server-authoritative fields (order_no, owner IDs, provider IDs, service snapshots,
     * address/recipient snapshots, original order references, fees, state transitions, version, and timestamps)
     * are strictly protected and MUST be populated explicitly by server-side domain writers.
     */
    protected $fillable = [
        'complaint_text',
        'symptoms_json',
        'customer_media_refs',
    ];

    protected $guarded = [
        'id',
        'order_no',
        'customer_id',
        'provider_org_id',
        'service_offering_id',
        'service_offering_version',
        'service_snapshot',
        'recipient_snapshot',
        'address_snapshot',
        'original_order_id',
        'status',
        'phase',
        'provider_decision_status',
        'provider_decision_at',
        'provider_decision_by',
        'provider_rejection_reason',
        'diagnosis_fee_idr',
        'diagnosis_fee_exemption_type',
        'cancel_reason_code',
        'cancelled_at',
        'completed_at',
        'version',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'service_snapshot' => 'array',
        'recipient_snapshot' => 'array',
        'address_snapshot' => 'array',
        'symptoms_json' => 'array',
        'customer_media_refs' => 'array',
        'diagnosis_fee_idr' => 'integer',
        'version' => 'integer',
        'provider_decision_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function booking(): HasOne
    {
        return $this->hasOne(ServiceBooking::class, 'order_id');
    }

    public function visit(): HasOne
    {
        return $this->hasOne(ServiceVisit::class, 'order_id');
    }

    public function diagnosisVersions(): HasMany
    {
        return $this->hasMany(DiagnosisVersion::class, 'order_id')->orderBy('version_no', 'desc');
    }

    public function execution(): HasOne
    {
        return $this->hasOne(ServiceExecution::class, 'order_id');
    }

    public function paymentObligations(): HasMany
    {
        return $this->hasMany(ServicePaymentObligation::class, 'order_id');
    }

    public function cancellation(): HasOne
    {
        return $this->hasOne(CancellationRecord::class, 'order_id');
    }

    public function issues(): HasMany
    {
        return $this->hasMany(OperationalIssue::class, 'order_id');
    }

    public function consents(): HasMany
    {
        return $this->hasMany(CustomerConsent::class, 'order_id')->orderBy('created_at', 'desc');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ServiceOrderEvent::class, 'order_id')->orderBy('sequence_no', 'asc');
    }

    public function domainEvents(): HasMany
    {
        return $this->events();
    }

    public function resolveProviderName(): string
    {
        try {
            $name = \Illuminate\Support\Facades\DB::table('servio_identity_db.organization_profiles')
                ->where('organization_id', $this->provider_org_id)
                ->value('display_name');
            if ($name) {
                return $name;
            }
        } catch (\Throwable) {}

        return 'sukses gembira';
    }
}
