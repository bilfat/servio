<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Resolutions;

use App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface;
use App\Models\AfterSalesCase;
use App\Models\CaseEvent;
use App\Models\CaseExternalRef;
use App\Models\CaseResolution;
use App\Models\OutboxEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class ResolutionService
{
    public function __construct(
        protected ResolutionCoordinatorInterface $coordinator
    ) {}

    public function startResolutionAction(
        string $caseId,
        string $actorId,
        ?string $actorOrgId = null
    ): CaseResolution {
        // Step 1: Pre-coordination validation & atomic dispatch lease in local DB transaction
        $preData = DB::transaction(function () use ($caseId, $actorId, $actorOrgId) {
            /** @var AfterSalesCase $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->lockForUpdate()
                ->firstOrFail();

            // Anti-IDOR: Business actor must own this case
            if ($actorOrgId !== null && $case->owner_org_id !== $actorOrgId) {
                throw new RuntimeException("Akses ditolak: Organisasi bisnis Anda bukan pemilik kasus ini.");
            }

            if ($case->main_status !== 'IN_RESOLUTION' || !$case->agreed_solution) {
                throw new InvalidArgumentException("Kasus belum memiliki solusi yang disepakati untuk memulai penyelesaian.");
            }

            $resolution = CaseResolution::where('case_id', $case->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Physical return inspection guard
            if ($case->case_type === 'GOODS_RETURN') {
                $instruction = $case->returnInstruction;
                if ($instruction && $instruction->requires_physical_return) {
                    $inspection = $case->returnInspection;
                    if (!$inspection) {
                        throw new RuntimeException("Tindakan resolusi tidak dapat dimulai sebelum barang fisik diterima dan diperiksa oleh Merchant.");
                    }
                    if ($inspection->inspection_outcome === 'MISMATCH' || $inspection->quantity_approved <= 0) {
                        throw new RuntimeException("Tindakan resolusi tidak dapat dimulai: Hasil inspeksi menunjukkan ketidaksesuaian barang (MISMATCH).");
                    }
                }
            }

            if ($resolution->status === 'VERIFIED_DONE') {
                return ['status' => 'ALREADY_COMPLETED', 'resolution' => $resolution];
            }

            if ($resolution->solution_code === 'REPAIR_GOODS') {
                throw new RuntimeException("Integrasi solusi REPAIR_GOODS saat ini ditangguhkan (BLOCKED): Modul 05A belum menyediakan kontrak alur perbaikan barang. Barang pengganti (REPLACEMENT) dilarang dikirimkan untuk perbaikan.");
            }

            $purpose = match ($resolution->solution_code) {
                'REFUND' => 'REFUND_DECISION',
                'REPLACEMENT' => 'REPLACEMENT_FULFILLMENT',
                'REWORK' => 'WARRANTY_JOB',
                default => 'EXTERNAL_RESOLUTION',
            };

            $targetService = match ($resolution->solution_code) {
                'REFUND' => '06',
                'REPLACEMENT' => '05A',
                'REWORK' => '05B',
                default => '05A',
            };

            // Check if already dispatched successfully to external service
            /** @var CaseExternalRef|null $existingRef */
            $existingRef = CaseExternalRef::where('case_id', $case->id)
                ->where('purpose', $purpose)
                ->lockForUpdate()
                ->first();

            $activeStatuses = ['PREPARING', 'SHIPPED', 'DELIVERED', 'ASSIGNED', 'IN_PROGRESS', 'SUCCEEDED', 'COMPLETED'];

            if ($existingRef && !empty($existingRef->external_id) && !str_starts_with($existingRef->external_id, 'PENDING_') && in_array(strtoupper((string) $existingRef->external_status), $activeStatuses, true)) {
                if ($resolution->status !== 'IN_PROGRESS') {
                    $resolution->update(['status' => 'IN_PROGRESS']);
                }
                return ['status' => 'ALREADY_DISPATCHED', 'resolution' => $resolution];
            }

            // Atomic Dispatch Lease: If another concurrent worker is actively dispatching (< 30s ago)
            if ($existingRef && $existingRef->external_status === 'PENDING_DISPATCH' && $existingRef->last_checked_at && $existingRef->last_checked_at->gt(now()->subSeconds(30))) {
                return ['status' => 'DISPATCH_IN_FLIGHT', 'resolution' => $resolution];
            }

            // Acquire atomic dispatch lease:
            // NEVER overwrite existing authentic external_id with a placeholder!
            $currentExternalId = ($existingRef && !empty($existingRef->external_id) && !str_starts_with($existingRef->external_id, 'PENDING_'))
                ? $existingRef->external_id
                : ('PENDING_' . $case->id);

            $leaseToken = (string) Str::uuid();

            $ref = CaseExternalRef::updateOrCreate(
                [
                    'case_id' => $case->id,
                    'purpose' => $purpose,
                ],
                [
                    'resolution_id' => $resolution->id,
                    'target_service' => $targetService,
                    'external_id' => $currentExternalId,
                    'external_status' => 'PENDING_DISPATCH',
                    'last_checked_at' => now(),
                    'last_event_id' => $leaseToken,
                ]
            );

            return [
                'status' => 'CLAIMED_DISPATCH_LEASE',
                'case' => $case,
                'resolution' => $resolution,
                'purpose' => $purpose,
                'lease_token' => $leaseToken,
            ];
        });

        if ($preData['status'] === 'ALREADY_COMPLETED' || $preData['status'] === 'ALREADY_DISPATCHED' || $preData['status'] === 'DISPATCH_IN_FLIGHT') {
            return $preData['resolution']->load('externalRefs');
        }

        /** @var AfterSalesCase $case */
        $case = $preData['case'];
        /** @var CaseResolution $resolution */
        $resolution = $preData['resolution'];

        // Step 2: Coordinate with external target service OUTSIDE local database transaction.
        // Prevents locking database connections during slow HTTP, timeouts, or network lag.
        $dispatchData = $this->coordinator->initiateExternalResolution($case, $resolution);

        // Step 3: Commit authoritative external coordination outcome to local database
        return DB::transaction(function () use ($case, $resolution, $dispatchData, $actorId, $preData) {
            $now = now();
            $solution = $resolution->solution_code;

            $existing = CaseExternalRef::where('case_id', $case->id)
                ->where('purpose', $dispatchData['purpose'])
                ->lockForUpdate()
                ->first();

            $activeStatuses = ['PREPARING', 'SHIPPED', 'DELIVERED', 'ASSIGNED', 'IN_PROGRESS', 'SUCCEEDED', 'COMPLETED'];
            if ($existing && in_array(strtoupper((string) $existing->external_status), $activeStatuses, true) && !empty($existing->external_id) && !str_starts_with($existing->external_id, 'PENDING_')) {
                // If already committed by another worker with valid authentic external_id, do not overwrite with stale lease
                if ($resolution->status !== 'IN_PROGRESS') {
                    $resolution->update(['status' => 'IN_PROGRESS']);
                }
                return $resolution->load('externalRefs');
            }

            $ref = CaseExternalRef::updateOrCreate(
                [
                    'case_id' => $case->id,
                    'purpose' => $dispatchData['purpose'],
                ],
                [
                    'resolution_id' => $resolution->id,
                    'target_service' => $dispatchData['target_service'],
                    'external_id' => $dispatchData['external_id'],
                    'external_status' => $dispatchData['external_status'],
                    'last_checked_at' => $now,
                    'last_event_id' => $preData['lease_token'] ?? null,
                ]
            );

            $resolution->update(['status' => 'IN_PROGRESS']);

            $hasStartedEvent = CaseEvent::where('case_id', $case->id)
                ->where('event_type', 'RESOLUTION_STARTED')
                ->exists();

            if (!$hasStartedEvent) {
                $lastSeq = (int) $case->events()->max('sequence');
                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $lastSeq + 1,
                    'event_type' => 'RESOLUTION_STARTED',
                    'from_state' => 'IN_RESOLUTION',
                    'to_state' => 'IN_RESOLUTION',
                    'actor_kind' => 'MERCHANT',
                    'actor_id' => $actorId,
                    'reason' => "Pelaksanaan solusi {$solution} dimulai.",
                    'data_json' => [
                        'external_ref_id' => $ref->id,
                        'target_service' => $ref->target_service,
                        'external_id' => $ref->external_id,
                        'external_status' => $ref->external_status,
                    ],
                    'occurred_at' => $now,
                ]);

                OutboxEvent::create([
                    'event_type' => 'after_sales.resolution.started.v1',
                    'aggregate_type' => 'AFTER_SALES_CASE',
                    'aggregate_id' => $case->id,
                    'payload' => [
                        'case_id' => $case->id,
                        'solution_code' => $solution,
                        'external_id' => $ref->external_id,
                        'target_service' => $ref->target_service,
                    ],
                ]);
            }

            return $resolution->load('externalRefs');
        });
    }

    public function completeCase(
        string $caseId,
        string $evidenceRef,
        string $actorId,
        ?string $actorOrgId = null
    ): AfterSalesCase {
        return DB::transaction(function () use ($caseId, $evidenceRef, $actorId, $actorOrgId) {
            /** @var AfterSalesCase $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->lockForUpdate()
                ->firstOrFail();

            // Anti-IDOR: Check business organization
            if ($actorOrgId !== null && $case->owner_org_id !== $actorOrgId) {
                throw new RuntimeException("Akses ditolak: Organisasi bisnis Anda bukan pemilik kasus ini.");
            }

            if ($case->main_status === 'COMPLETED') {
                return $case;
            }

            if ($case->main_status !== 'IN_RESOLUTION') {
                throw new InvalidArgumentException("Hanya kasus dalam status IN_RESOLUTION yang dapat diselesaikan.");
            }

            $resolution = CaseResolution::where('case_id', $case->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Physical return inspection guard
            if ($case->case_type === 'GOODS_RETURN') {
                $instruction = $case->returnInstruction;
                if ($instruction && $instruction->requires_physical_return) {
                    $inspection = $case->returnInspection;
                    if (!$inspection) {
                        throw new RuntimeException("Tindakan resolusi tidak dapat dimulai sebelum barang fisik diterima dan diperiksa oleh Merchant.");
                    }
                    if ($inspection->inspection_outcome === 'MISMATCH' || $inspection->quantity_approved <= 0) {
                        throw new RuntimeException("Tindakan resolusi tidak dapat dimulai: Hasil inspeksi menunjukkan ketidaksesuaian barang (MISMATCH).");
                    }
                }
            }

            // Strict Anti-Fake Completion Verification
            $isExternalVerified = $this->coordinator->verifyExternalCompletion($case, $resolution, $evidenceRef);
            if (!$isExternalVerified) {
                throw new RuntimeException("Penyelesaian kasus ditolak: Status eksternal pada service hilir belum selesai atau bukti tidak absah.");
            }

            $now = now();

            $resolution->update([
                'status' => 'VERIFIED_DONE',
                'evidence_ref' => $evidenceRef,
            ]);

            $case->main_status = 'COMPLETED';
            $case->resolved_at = $now;
            $case->version += 1;
            $case->save();

            // Transition linked warranty entitlement to CONSUMED if fully claimed
            if ($case->entitlement_id) {
                /** @var \App\Models\OrderWarrantyEntitlement|null $entModel */
                $entModel = \App\Models\OrderWarrantyEntitlement::where('id', $case->entitlement_id)->lockForUpdate()->first();
                if ($entModel && $entModel->remaining_quantity <= 0) {
                    $entModel->update(['status' => 'CONSUMED']);
                }
            }

            $lastSeq = (int) $case->events()->max('sequence');
            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => $lastSeq + 1,
                'event_type' => 'CASE_COMPLETED',
                'from_state' => 'IN_RESOLUTION',
                'to_state' => 'COMPLETED',
                'actor_kind' => 'MERCHANT',
                'actor_id' => $actorId,
                'reason' => 'Solusi purnajual telah selesai dilaksanakan dengan bukti eksternal terverifikasi.',
                'data_json' => ['evidence_ref' => $evidenceRef],
                'occurred_at' => $now,
            ]);

            OutboxEvent::create([
                'event_type' => 'after_sales.case.completed.v1',
                'aggregate_type' => 'AFTER_SALES_CASE',
                'aggregate_id' => $case->id,
                'payload' => [
                    'case_id' => $case->id,
                    'case_number' => $case->case_number,
                    'solution_code' => $resolution->solution_code,
                    'evidence_ref' => $evidenceRef,
                ],
            ]);

            return $case->load(['resolution', 'events', 'externalRefs']);
        });
    }
}
