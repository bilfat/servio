<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\WorkerAssignmentAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WorkerAssignmentAttempt
 */
class WorkerTaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $order = $this->order;
        $booking = $this->booking;

        return [
            'assignment_id' => $this->id,
            'attempt_no' => $this->attempt_no,
            'worker_id' => $this->worker_id,
            'provider_org_id' => $this->provider_org_id,
            'status' => $this->status, // ASSIGNED, ACCEPTED, REJECTED, EXPIRED, CANCELLED
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'response_due_at' => $this->response_due_at?->toIso8601String(),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'order' => $order ? [
                'id' => $order->id,
                'order_no' => $order->order_no,
                'customer_id' => $order->customer_id,
                'provider_org_id' => $order->provider_org_id,
                'provider_name' => $order->resolveProviderName(),
                'service_offering_id' => $order->service_offering_id,
                'service_snapshot' => $order->service_snapshot,
                'recipient_snapshot' => $order->recipient_snapshot,
                'address_snapshot' => $order->address_snapshot,
                'complaint_text' => $order->complaint_text,
                'symptoms' => $order->symptoms_json,
                'customer_media_refs' => $order->customer_media_refs ?? [],
                'diagnosis_fee_idr' => $order->diagnosis_fee_idr,
                'diagnosis_fee_exemption_type' => $order->diagnosis_fee_exemption_type,
                'status' => $order->status,
                'phase' => $order->phase,
                'cancel_reason_code' => $order->cancel_reason_code,
                'created_at' => $order->created_at?->toIso8601String(),
                'updated_at' => $order->updated_at?->toIso8601String(),
                'diagnosis' => $order->relationLoaded('diagnosisVersions') && ($latestDiag = $order->diagnosisVersions->sortByDesc('version_no')->first()) ? [
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
                'consent' => $order && $order->relationLoaded('consents') && ($latestConsent = $order->consents->sortByDesc('created_at')->first()) ? [
                    'id' => $latestConsent->id,
                    'method' => $latestConsent->method,
                    'decision' => $latestConsent->decision,
                    'submitted_at' => $latestConsent->submitted_at?->toIso8601String(),
                    'statement_acknowledged' => (bool) $latestConsent->statement_acknowledged,
                    'customer_present_reported' => (bool) $latestConsent->customer_present_reported,
                ] : null,
                'execution' => $order->relationLoaded('execution') && $order->execution ? [
                    'id' => $order->execution->id,
                    'status' => $order->execution->status,
                    'started_at' => $order->execution->started_at?->toIso8601String(),
                    'finished_at' => $order->execution->finished_at?->toIso8601String(),
                    'summary' => $order->execution->summary,
                    'test_result' => $order->execution->test_result,
                    'execution_notes' => $order->execution->execution_notes,
                    'evidences' => $order->execution->relationLoaded('evidences') ? $order->execution->evidences->map(fn ($ev) => [
                        'type' => $ev->evidence_type,
                        'url' => $ev->media_reference,
                    ]) : [],
                ] : null,
                'payment_obligations' => $order->relationLoaded('paymentObligations') ? $order->paymentObligations->map(fn ($o) => [
                    'id' => $o->id,
                    'purpose' => $o->purpose,
                    'principal_idr' => $o->principal_idr,
                    'state' => $o->state,
                    'paid_at' => $o->paid_at?->toIso8601String(),
                    'attempts' => $o->relationLoaded('attempts') ? $o->attempts->map(fn ($a) => [
                        'id' => $a->id,
                        'finance_payment_id' => $a->finance_payment_id,
                        'finance_invoice_ref' => $a->finance_invoice_ref,
                        'reported_status' => $a->reported_status,
                        'amount_due_idr' => $a->amount_due_idr,
                        'is_current' => (bool) $a->is_current,
                        'expires_at' => $a->expires_at?->toIso8601String(),
                    ]) : [],
                ]) : [],
            ] : null,
            'schedule' => $booking ? [
                'start_at' => $booking->scheduled_start_at?->toIso8601String(),
                'end_at' => $booking->scheduled_end_at?->toIso8601String(),
                'timezone' => $booking->timezone,
            ] : null,
            'visit' => $order?->visit ? [
                'id' => $order->visit->id,
                'status' => $order->visit->status,
                'otw_at' => $order->visit->otw_at?->toIso8601String(),
                'arrived_at' => $order->visit->arrived_at?->toIso8601String(),
                'diagnosis_started_at' => $order->visit->diagnosis_started_at?->toIso8601String(),
                'diagnosis_submitted_at' => $order->visit->diagnosis_submitted_at?->toIso8601String(),
                'visit_closed_at' => $order->visit->visit_closed_at?->toIso8601String(),
            ] : null,
        ];
    }
}
