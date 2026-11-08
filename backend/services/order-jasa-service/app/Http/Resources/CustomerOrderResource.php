<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ServiceOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceOrder
 */
class CustomerOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $booking = $this->booking;
        $activeAssignment = $booking?->activeAssignment;
        $attempt = $activeAssignment?->attempt;

        // V2 Business Lock & Security Rule:
        // Worker identity MUST BE ABSENT from customer serialization before assignment is ACCEPTED!
        $isWorkerAccepted = $attempt && $attempt->status === 'ACCEPTED';

        $workerData = null;
        if ($isWorkerAccepted) {
            $workerData = [
                'worker_id' => $attempt->worker_id,
                'status' => $attempt->status,
                'accepted_at' => $attempt->accepted_at?->toIso8601String(),
                'membership_snapshot' => $attempt->worker_membership_snapshot,
            ];
        }

        return [
            'id' => $this->id,
            'order_no' => $this->order_no,
            'customer_id' => $this->customer_id,
            'provider_org_id' => $this->provider_org_id,
            'provider_name' => $this->resolveProviderName(),
            'service_offering_id' => $this->service_offering_id,
            'service_snapshot' => $this->service_snapshot,
            'recipient_snapshot' => $this->recipient_snapshot,
            'address_snapshot' => $this->address_snapshot,
            'complaint_text' => $this->complaint_text,
            'symptoms' => $this->symptoms_json,
            'customer_media_refs' => $this->customer_media_refs ?? [],
            'diagnosis_fee_idr' => $this->diagnosis_fee_idr,
            'diagnosis_fee_exemption_type' => $this->diagnosis_fee_exemption_type,
            'status' => $this->status,
            'phase' => $this->phase,
            'provider_decision_status' => $this->provider_decision_status ?? 'PENDING',
            'provider_decision_at' => $this->provider_decision_at?->toIso8601String(),
            'provider_rejection_reason' => $this->provider_rejection_reason,
            'cancel_reason_code' => $this->cancel_reason_code,
            'original_order_id' => $this->original_order_id,
            'version' => $this->version,
            'schedule' => $booking ? [
                'start_at' => $booking->scheduled_start_at?->toIso8601String(),
                'end_at' => $booking->scheduled_end_at?->toIso8601String(),
                'timezone' => $booking->timezone,
                'status' => $booking->status,
            ] : null,
            'assigned_worker' => $workerData, // Masked if not ACCEPTED!
            'visit' => $this->relationLoaded('visit') && $this->visit ? [
                'id' => $this->visit->id,
                'status' => $this->visit->status,
                'worker_id' => $this->visit->worker_id,
                'otw_at' => $this->visit->otw_at?->toIso8601String(),
                'arrived_at' => $this->visit->arrived_at?->toIso8601String(),
                'diagnosis_started_at' => $this->visit->diagnosis_started_at?->toIso8601String(),
                'diagnosis_submitted_at' => $this->visit->diagnosis_submitted_at?->toIso8601String(),
                'visit_closed_at' => $this->visit->visit_closed_at?->toIso8601String(),
            ] : null,
            'diagnosis' => $this->relationLoaded('diagnosisVersions') && ($latestDiag = $this->diagnosisVersions->sortByDesc('version_no')->first()) ? [
                'id' => $latestDiag->id,
                'version_no' => $latestDiag->version_no,
                'findings_summary' => $latestDiag->findings_summary ?? $latestDiag->findings,
                'root_cause' => $latestDiag->root_cause ?? $latestDiag->suspected_cause,
                'recommended_action' => $latestDiag->recommended_action ?? $latestDiag->recommended_actions,
                'diagnosis_photos' => $latestDiag->diagnosis_photo_refs ?? $latestDiag->diagnosis_photos ?? [],
                'work_subtotal_idr' => $latestDiag->work_subtotal_idr,
                'provider_part_subtotal_idr' => $latestDiag->provider_part_subtotal_idr,
                'grand_total_idr' => $latestDiag->service_total_base_idr,
                'status' => $latestDiag->status,
                'published_to_customer_at' => $latestDiag->published_to_customer_at?->toIso8601String(),
                'remote_response_due_at' => $latestDiag->remote_response_due_at?->toIso8601String(),
                'work_items' => $latestDiag->relationLoaded('workItems') ? $latestDiag->workItems->map(fn ($w) => [
                    'id' => $w->id,
                    'title' => $w->name ?? $w->item_name ?? 'Item Pekerjaan',
                    'qty' => (int) ($w->quantity ?? $w->qty ?? 1),
                    'unit_price' => (int) ($w->unit_price_idr ?? $w->unit_price ?? 0),
                    'subtotal' => (int) ($w->subtotal_idr ?? $w->total_price_idr ?? 0),
                ]) : [],
                'spareparts' => $latestDiag->relationLoaded('partItems') ? $latestDiag->partItems->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->part_name ?? $p->name ?? 'Suku Cadang',
                    'source' => $p->source ?? $p->part_source ?? 'PROVIDER',
                    'qty' => (int) ($p->quantity ?? $p->qty ?? 1),
                    'unit_price' => (int) ($p->unit_price_idr ?? $p->unit_price ?? 0),
                    'subtotal' => (int) ($p->subtotal_idr ?? $p->total_price_idr ?? 0),
                ]) : [],
            ] : null,
            'consent' => $this->relationLoaded('consents') && ($latestConsent = $this->consents->sortByDesc('created_at')->first()) ? [
                'id' => $latestConsent->id,
                'method' => $latestConsent->method,
                'decision' => $latestConsent->decision,
                'submitted_at' => $latestConsent->submitted_at?->toIso8601String(),
                'statement_acknowledged' => (bool) $latestConsent->statement_acknowledged,
                'customer_present_reported' => (bool) $latestConsent->customer_present_reported,
            ] : null,
            'execution' => $this->relationLoaded('execution') && $this->execution ? [
                'id' => $this->execution->id,
                'status' => $this->execution->status,
                'started_at' => $this->execution->started_at?->toIso8601String(),
                'finished_at' => $this->execution->finished_at?->toIso8601String(),
                'summary' => $this->execution->summary,
                'test_result' => $this->execution->test_result,
                'execution_notes' => $this->execution->execution_notes,
                'evidences' => $this->execution->relationLoaded('evidences') ? $this->execution->evidences->map(fn ($ev) => [
                    'type' => $ev->evidence_type,
                    'url' => $ev->media_reference,
                ]) : [],
            ] : null,
            'payment_obligations' => $this->relationLoaded('paymentObligations') ? $this->paymentObligations->map(fn ($o) => [
                'id' => $o->id,
                'purpose' => $o->purpose,
                'principal_idr' => $o->principal_idr,
                'fee_snapshot' => $o->fee_snapshot,
                'state' => $o->state,
                'paid_at' => $o->paid_at?->toIso8601String(),
                'active_finance_payment_id' => $o->active_finance_payment_id,
                'attempts' => $o->relationLoaded('attempts') ? $o->attempts->map(fn ($a) => [
                    'id' => $a->id,
                    'attempt_no' => $a->attempt_no,
                    'finance_payment_id' => $a->finance_payment_id,
                    'finance_invoice_ref' => $a->finance_invoice_ref,
                    'amount_due_idr' => $a->amount_due_idr,
                    'reported_status' => $a->reported_status,
                    'is_current' => $a->is_current,
                ]) : [],
            ]) : [],
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function resolveProviderName(): string
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
