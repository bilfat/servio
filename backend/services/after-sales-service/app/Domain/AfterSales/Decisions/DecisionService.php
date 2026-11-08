<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Decisions;

use App\Models\AfterSalesCase;
use App\Models\CaseEvent;
use App\Models\CaseResolution;
use App\Models\CustomerSolutionConsent;
use App\Models\OutboxEvent;
use App\Models\SolutionProposal;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class DecisionService
{
    public function handleBusinessDecision(
        string $caseId,
        string $businessOrgId,
        string $actorId,
        string $action, // ACCEPT_INITIAL, REJECT_WITH_REASON, PROPOSE_ALTERNATIVE, REQUEST_EVIDENCE
        ?string $alternativeSolution = null,
        ?string $reason = null,
        int $expectedCaseVersion = 1
    ): AfterSalesCase {
        $action = strtoupper($action);

        return DB::transaction(function () use (
            $caseId,
            $businessOrgId,
            $actorId,
            $action,
            $alternativeSolution,
            $reason,
            $expectedCaseVersion
        ) {
            /** @var AfterSalesCase $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->where('owner_org_id', $businessOrgId)
                ->lockForUpdate()
                ->firstOrFail();

            // Optimistic concurrency check
            if ($case->version !== $expectedCaseVersion) {
                throw new RuntimeException("Terjadi konflik versi kasus (Stale Case Version). Muat ulang halaman dan coba lagi.");
            }

            if (in_array($case->main_status, ['COMPLETED', 'REJECTED', 'CANCELLED'], true)) {
                throw new InvalidArgumentException("Kasus yang sudah berstatus '{$case->main_status}' tidak dapat diproses lagi.");
            }

            if ($case->main_status === 'IN_RESOLUTION') {
                throw new InvalidArgumentException("Kasus sedang dalam pelaksanaan resolusi dan tidak dapat diubah keputusannya secara sepihak.");
            }

            $now = now();
            if ($case->response_state === 'WAITING') {
                $case->response_state = 'RESPONDED';
                $case->first_meaningful_response_at = $now;
            } elseif ($case->response_state === 'OVERDUE') {
                // Do not erase SLA breach evidence if response arrives late
                if (!$case->first_meaningful_response_at) {
                    $case->first_meaningful_response_at = $now;
                }
            }

            $lastSeq = (int) $case->events()->max('sequence');
            $newSeq = $lastSeq + 1;
            $actorKind = $case->owner_org_type === 'MERCHANT' ? 'MERCHANT' : 'PROVIDER';

            if ($action === 'ACCEPT_INITIAL') {
                $case->agreed_solution = $case->initial_solution;
                $case->main_status = 'IN_RESOLUTION';
                $case->substate = 'NONE';
                $case->version += 1;
                $case->save();

                // Create or update CaseResolution
                CaseResolution::updateOrCreate(
                    ['case_id' => $case->id],
                    [
                        'solution_code' => $case->agreed_solution,
                        'agreed_at' => $now,
                        'status' => 'NOT_STARTED',
                    ]
                );

                // Update latest proposal
                $latestProposal = $case->latestProposal;
                if ($latestProposal) {
                    $latestProposal->update(['state' => 'ACCEPTED']);
                }

                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $newSeq,
                    'event_type' => 'BUSINESS_ACCEPTED_INITIAL',
                    'from_state' => $case->getOriginal('main_status'),
                    'to_state' => 'IN_RESOLUTION',
                    'actor_kind' => $actorKind,
                    'actor_id' => $actorId,
                    'reason' => $reason ?: 'Pelaku usaha menyetujui solusi yang diminta pelanggan.',
                    'data_json' => ['agreed_solution' => $case->agreed_solution],
                    'occurred_at' => $now,
                ]);

                OutboxEvent::create([
                    'event_type' => 'after_sales.case.solution_agreed.v1',
                    'aggregate_type' => 'AFTER_SALES_CASE',
                    'aggregate_id' => $case->id,
                    'payload' => [
                        'case_id' => $case->id,
                        'agreed_solution' => $case->agreed_solution,
                        'source_order_id' => $case->source_order_id,
                    ],
                ]);
            } elseif ($action === 'REJECT_WITH_REASON') {
                if (empty(trim((string) $reason))) {
                    throw new InvalidArgumentException("Penolakan kasus wajib disertai alasan yang sah.");
                }

                $case->main_status = 'REJECTED';
                $case->rejected_at = $now;
                $case->reject_reason = $reason;
                $case->substate = 'NONE';
                $case->version += 1;
                $case->save();

                // Unlock entitlement claimed quantity upon rejection so customer can re-apply if eligible
                if ($case->entitlement_id) {
                    /** @var \App\Models\OrderWarrantyEntitlement|null $entModel */
                    $entModel = \App\Models\OrderWarrantyEntitlement::where('id', $case->entitlement_id)->lockForUpdate()->first();
                    if ($entModel) {
                        $caseClaimedQty = (int) ($case->items()->sum('quantity_requested') ?: 1);
                        $entModel->claimed_quantity = max(0, (int) ($entModel->claimed_quantity ?? 0) - $caseClaimedQty);
                        if ($entModel->status === 'CLAIM_LOCKED' && $entModel->remaining_quantity > 0) {
                            $entModel->status = 'ACTIVE';
                        }
                        $entModel->save();
                    }
                }

                // Mark any pending proposals as declined
                SolutionProposal::where('case_id', $case->id)
                    ->where('state', 'PENDING_CONSENT')
                    ->update(['state' => 'DECLINED']);

                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $newSeq,
                    'event_type' => 'BUSINESS_REJECTED',
                    'from_state' => $case->getOriginal('main_status'),
                    'to_state' => 'REJECTED',
                    'actor_kind' => $actorKind,
                    'actor_id' => $actorId,
                    'reason' => $reason,
                    'data_json' => ['reject_reason' => $reason],
                    'occurred_at' => $now,
                ]);

                OutboxEvent::create([
                    'event_type' => 'after_sales.case.rejected.v1',
                    'aggregate_type' => 'AFTER_SALES_CASE',
                    'aggregate_id' => $case->id,
                    'payload' => [
                        'case_id' => $case->id,
                        'reject_reason' => $reason,
                    ],
                ]);
            } elseif ($action === 'PROPOSE_ALTERNATIVE') {
                if (empty($alternativeSolution)) {
                    throw new InvalidArgumentException("Solusi alternatif wajib dipilih.");
                }
                $alternativeSolution = strtoupper($alternativeSolution);

                // Validation of alternative solution
                if ($case->source_order_kind === 'GOODS') {
                    if (!in_array($alternativeSolution, ['REPLACEMENT', 'REFUND', 'REPAIR_GOODS'], true)) {
                        throw new InvalidArgumentException("Solusi alternatif barang yang valid adalah REPLACEMENT, REFUND, atau REPAIR_GOODS.");
                    }
                } elseif ($case->source_order_kind === 'SERVICE') {
                    if (!in_array($alternativeSolution, ['REWORK', 'REFUND'], true)) {
                        throw new InvalidArgumentException("Solusi alternatif jasa yang valid adalah REWORK atau REFUND.");
                    }
                }

                // Supercede previous pending proposals
                SolutionProposal::where('case_id', $case->id)
                    ->where('state', 'PENDING_CONSENT')
                    ->update(['state' => 'SUPERSEDED']);

                $case->main_status = 'UNDER_REVIEW';
                $case->substate = 'AWAITING_CUSTOMER_CONSENT';
                $case->version += 1;
                $case->save();

                $latestVer = (int) $case->proposals()->max('proposal_version');
                $newProposalVer = $latestVer + 1;

                $proposal = SolutionProposal::create([
                    'case_id' => $case->id,
                    'proposal_version' => $newProposalVer,
                    'proposal_type' => 'ALTERNATIVE',
                    'solution_code' => $alternativeSolution,
                    'reason' => $reason ?: 'Pelaku usaha menawarkan solusi alternatif.',
                    'proposed_by_actor_kind' => $actorKind,
                    'proposed_by_id' => $actorId,
                    'state' => 'PENDING_CONSENT',
                ]);

                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $newSeq,
                    'event_type' => 'ALTERNATIVE_PROPOSED',
                    'from_state' => $case->getOriginal('main_status'),
                    'to_state' => 'UNDER_REVIEW',
                    'actor_kind' => $actorKind,
                    'actor_id' => $actorId,
                    'reason' => $reason,
                    'data_json' => [
                        'alternative_solution' => $alternativeSolution,
                        'proposal_id' => $proposal->id,
                        'proposal_version' => $newProposalVer,
                    ],
                    'occurred_at' => $now,
                ]);

                OutboxEvent::create([
                    'event_type' => 'after_sales.case.alternative_proposed.v1',
                    'aggregate_type' => 'AFTER_SALES_CASE',
                    'aggregate_id' => $case->id,
                    'payload' => [
                        'case_id' => $case->id,
                        'alternative_solution' => $alternativeSolution,
                        'proposal_id' => $proposal->id,
                    ],
                ]);
            } elseif ($action === 'REQUEST_EVIDENCE') {
                $case->main_status = 'UNDER_REVIEW';
                $case->substate = 'AWAITING_CUSTOMER_INFO';
                $case->version += 1;
                $case->save();

                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $newSeq,
                    'event_type' => 'EVIDENCE_REQUESTED',
                    'from_state' => $case->getOriginal('main_status'),
                    'to_state' => 'UNDER_REVIEW',
                    'actor_kind' => $actorKind,
                    'actor_id' => $actorId,
                    'reason' => $reason ?: 'Pelaku usaha meminta bukti relevan tambahan.',
                    'data_json' => ['request_reason' => $reason],
                    'occurred_at' => $now,
                ]);
            } else {
                throw new InvalidArgumentException("Aksi keputusan '{$action}' tidak dikenal.");
            }

            return $case->load(['proposals', 'events', 'resolution']);
        });
    }

    public function handleCustomerConsent(
        string $caseId,
        string $proposalId,
        string $customerId,
        string $decision, // ACCEPT or DECLINE
        ?string $reason = null,
        ?string $idempotencyKey = null
    ): AfterSalesCase {
        $decision = strtoupper($decision);
        if (!in_array($decision, ['ACCEPT', 'DECLINE'], true)) {
            throw new InvalidArgumentException("Keputusan consent pelanggan harus 'ACCEPT' atau 'DECLINE'.");
        }

        return DB::transaction(function () use ($caseId, $proposalId, $customerId, $decision, $reason, $idempotencyKey) {
            /** @var AfterSalesCase $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->where('customer_id', $customerId)
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array($case->main_status, ['COMPLETED', 'REJECTED', 'CANCELLED'], true)) {
                throw new InvalidArgumentException("Kasus berstatus '{$case->main_status}' tidak dapat diberikan persetujuan lagi.");
            }

            /** @var SolutionProposal $proposal */
            $proposal = SolutionProposal::where('id', $proposalId)
                ->where('case_id', $case->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($proposal->state !== 'PENDING_CONSENT') {
                throw new RuntimeException("Proposal solusi ini sudah tidak dalam status menunggu persetujuan (Status saat ini: {$proposal->state}).");
            }

            $now = now();
            $lastSeq = (int) $case->events()->max('sequence');
            $newSeq = $lastSeq + 1;

            // Record customer consent
            CustomerSolutionConsent::create([
                'proposal_id' => $proposal->id,
                'case_id' => $case->id,
                'customer_id' => $customerId,
                'decision' => $decision,
                'reason' => $reason,
                'decided_at' => $now,
                'idempotency_key' => $idempotencyKey,
            ]);

            if ($decision === 'ACCEPT') {
                $proposal->update(['state' => 'ACCEPTED']);

                $case->agreed_solution = $proposal->solution_code;
                $case->main_status = 'IN_RESOLUTION';
                $case->substate = 'NONE';
                $case->version += 1;
                $case->save();

                CaseResolution::updateOrCreate(
                    ['case_id' => $case->id],
                    [
                        'solution_code' => $proposal->solution_code,
                        'agreed_at' => $now,
                        'agreed_by_customer_at' => $now,
                        'status' => 'NOT_STARTED',
                    ]
                );

                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $newSeq,
                    'event_type' => 'CUSTOMER_CONSENTED_ALTERNATIVE',
                    'from_state' => 'UNDER_REVIEW',
                    'to_state' => 'IN_RESOLUTION',
                    'actor_kind' => 'CUSTOMER',
                    'actor_id' => $customerId,
                    'reason' => 'Konsumen menyetujui solusi alternatif yang diajukan.',
                    'data_json' => [
                        'proposal_id' => $proposal->id,
                        'agreed_solution' => $proposal->solution_code,
                    ],
                    'occurred_at' => $now,
                ]);

                OutboxEvent::create([
                    'event_type' => 'after_sales.case.solution_agreed.v1',
                    'aggregate_type' => 'AFTER_SALES_CASE',
                    'aggregate_id' => $case->id,
                    'payload' => [
                        'case_id' => $case->id,
                        'agreed_solution' => $proposal->solution_code,
                        'source_order_id' => $case->source_order_id,
                    ],
                ]);
            } else {
                $proposal->update(['state' => 'DECLINED']);

                // Customer declined: remains in review/unresolved, does NOT auto-accept refund
                $case->substate = 'NONE';
                $case->version += 1;
                $case->save();

                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $newSeq,
                    'event_type' => 'CUSTOMER_DECLINED_ALTERNATIVE',
                    'from_state' => 'UNDER_REVIEW',
                    'to_state' => 'UNDER_REVIEW',
                    'actor_kind' => 'CUSTOMER',
                    'actor_id' => $customerId,
                    'reason' => $reason ?: 'Konsumen menolak solusi alternatif yang ditawarkan.',
                    'data_json' => [
                        'proposal_id' => $proposal->id,
                        'declined_solution' => $proposal->solution_code,
                    ],
                    'occurred_at' => $now,
                ]);

                OutboxEvent::create([
                    'event_type' => 'after_sales.case.alternative_declined.v1',
                    'aggregate_type' => 'AFTER_SALES_CASE',
                    'aggregate_id' => $case->id,
                    'payload' => [
                        'case_id' => $case->id,
                        'proposal_id' => $proposal->id,
                    ],
                ]);
            }

            return $case->load(['proposals.consent', 'events', 'resolution']);
        });
    }
}
