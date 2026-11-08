<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class AfterSalesCase extends Model
{
    protected $table = 'after_sales_cases';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'case_number',
        'case_type',
        'customer_id',
        'owner_org_id',
        'owner_org_type',
        'source_order_kind',
        'source_order_id',
        'source_merchant_order_id',
        'entitlement_id',
        'initial_solution',
        'agreed_solution',
        'reason_code',
        'description',
        'main_status',
        'substate',
        'response_due_at',
        'response_state',
        'first_meaningful_response_at',
        'overdue_first_detected_at',
        'resolved_at',
        'rejected_at',
        'reject_reason',
        'reported_to_support_at',
        'support_ticket_ref',
        'version',
    ];

    protected $casts = [
        'response_due_at' => 'datetime',
        'first_meaningful_response_at' => 'datetime',
        'overdue_first_detected_at' => 'datetime',
        'resolved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'reported_to_support_at' => 'datetime',
        'version' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (AfterSalesCase $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->case_number)) {
                $prefix = $model->case_type === 'GOODS_RETURN' ? 'RET' : 'CLM';
                $model->case_number = sprintf('%s-%s-%s', $prefix, now()->format('Ymd'), strtoupper(Str::random(6)));
            }
            if (empty($model->response_due_at)) {
                $model->response_due_at = now()->addHours(72);
            }
        });
    }

    public function entitlement(): BelongsTo
    {
        return $this->belongsTo(OrderWarrantyEntitlement::class, 'entitlement_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CaseItem::class, 'case_id');
    }

    public function evidence(): HasMany
    {
        return $this->hasMany(CaseEvidence::class, 'case_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(CaseEvent::class, 'case_id')->orderBy('sequence', 'asc');
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(SolutionProposal::class, 'case_id')->orderBy('proposal_version', 'desc');
    }

    public function latestProposal(): HasOne
    {
        return $this->hasOne(SolutionProposal::class, 'case_id')->latestOfMany('proposal_version');
    }

    public function resolution(): HasOne
    {
        return $this->hasOne(CaseResolution::class, 'case_id');
    }

    public function externalRefs(): HasMany
    {
        return $this->hasMany(CaseExternalRef::class, 'case_id');
    }

    public function returnInstruction(): HasOne
    {
        return $this->hasOne(CaseReturnInstruction::class, 'case_id');
    }

    public function returnShipment(): HasOne
    {
        return $this->hasOne(CaseReturnShipment::class, 'case_id');
    }

    public function returnReceipt(): HasOne
    {
        return $this->hasOne(CaseReturnReceipt::class, 'case_id');
    }

    public function returnInspection(): HasOne
    {
        return $this->hasOne(CaseReturnInspection::class, 'case_id');
    }

    public function shippingExpenses(): HasMany
    {
        return $this->hasMany(CaseShippingExpense::class, 'case_id');
    }

    public function checkAndRefreshSla(): void
    {
        if ($this->response_state === 'WAITING' && now()->isAfter($this->response_due_at)) {
            $this->response_state = 'OVERDUE';
            if (!$this->overdue_first_detected_at) {
                $this->overdue_first_detected_at = now();
            }
            $this->save();
        }
    }
}

