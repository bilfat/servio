<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\BookingActiveAssignment;
use App\Models\DiagnosisVersion;
use App\Models\ExecutionEvidence;
use App\Models\OrderAuditLog;
use App\Models\ServiceExecution;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\ServicePartItem;
use App\Models\ServiceVisit;
use App\Models\ServiceWorkItem;
use App\Models\WorkerAssignmentAttempt;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class WorkerLifecycleService
{
    private function resolveAttempt(string $taskId, bool $lock = false): WorkerAssignmentAttempt
    {
        $query = WorkerAssignmentAttempt::where(function ($q) use ($taskId) {
            $q->where('id', $taskId)
              ->orWhere('order_id', $taskId);
        })->latest('assigned_at');

        if ($lock) {
            $query->lockForUpdate();
        }

        $attempt = $query->first();

        if (!$attempt) {
            throw new HttpException(404, 'Tugas teknisi tidak ditemukan.');
        }

        return $attempt;
    }

    public function respondAssignment(
        AuthenticatedActor $actor,
        string $taskId,
        string $decision,
        ?string $reason = null,
        ?string $notes = null
    ): WorkerAssignmentAttempt {
        return DB::transaction(function () use ($actor, $taskId, $decision, $reason, $notes) {
            /** @var WorkerAssignmentAttempt $attempt */
            $attempt = $this->resolveAttempt($taskId, true);

            if (!$actor->isAdmin() && $attempt->worker_id !== $actor->id) {
                throw new HttpException(403, 'Anda tidak memiliki hak akses untuk merespons tugas ini.');
            }

            if ($attempt->status !== 'ASSIGNED') {
                throw new HttpException(422, "Tugas sudah berstatus {$attempt->status} dan tidak dapat direspons kembali.");
            }

            /** @var ServiceOrder $order */
            $order = ServiceOrder::where('id', $attempt->order_id)->lockForUpdate()->firstOrFail();
            $now = now();
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;

            if (strtoupper($decision) === 'ACCEPT') {
                $attempt->forceFill([
                    'status' => 'ACCEPTED',
                    'accepted_at' => $now,
                    'version' => $attempt->version + 1,
                ])->save();

                BookingActiveAssignment::where('booking_id', $attempt->booking_id)
                    ->where('attempt_id', $attempt->id)
                    ->update([
                        'status' => 'ACCEPTED',
                        'updated_at' => $now,
                    ]);

                // Update ServiceVisit
                ServiceVisit::where('order_id', $order->id)->update([
                    'assignment_id' => $attempt->id,
                    'worker_id' => $actor->id,
                    'updated_at' => $now,
                ]);

                $order->forceFill([
                    'status' => 'WORKER_ACCEPTED',
                    'phase' => 'VISIT_PENDING',
                    'version' => $order->version + 1,
                ])->save();

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'WORKER_ACCEPTED',
                    fromState: 'ASSIGNED_WAITING_WORKER',
                    toState: 'WORKER_ACCEPTED',
                    actorId: $actor->id,
                    actorType: $actor->role
                );

                \App\Support\DomainEventLogger::recordAuditLog(
                    actor: "{$actor->role}:{$actor->id}",
                    action: 'ACCEPT_TASK',
                    resource: "WorkerAssignmentAttempt:{$attempt->id}"
                );
            } else {
                // REJECT
                $attempt->forceFill([
                    'status' => 'REJECTED',
                    'rejected_at' => $now,
                    'rejection_reason_code' => $reason ?: 'WORKER_DECLINED',
                    'rejection_notes' => $notes,
                    'version' => $attempt->version + 1,
                ])->save();

                // Delete active assignment to release lock
                BookingActiveAssignment::where('booking_id', $attempt->booking_id)->delete();

                // Revert order status so provider can reassign
                $order->forceFill([
                    'status' => 'PAID_WAITING_DISPATCH',
                    'phase' => 'WORKER_ASSIGNMENT_PENDING',
                    'version' => $order->version + 1,
                ])->save();

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'WORKER_REJECTED',
                    fromState: 'ASSIGNED_WAITING_WORKER',
                    toState: 'PAID_WAITING_DISPATCH',
                    actorId: $actor->id,
                    actorType: $actor->role,
                    metadata: [
                        'reason' => $reason,
                        'notes' => $notes,
                    ]
                );

                \App\Support\DomainEventLogger::recordAuditLog(
                    actor: "{$actor->role}:{$actor->id}",
                    action: 'REJECT_TASK',
                    resource: "WorkerAssignmentAttempt:{$attempt->id}",
                    reason: $reason
                );
            }

            return $attempt;
        });
    }

    public function updateVisitStatus(AuthenticatedActor $actor, string $taskId, string $action): ServiceVisit
    {
        return DB::transaction(function () use ($actor, $taskId, $action) {
            /** @var WorkerAssignmentAttempt $attempt */
            $attempt = $this->resolveAttempt($taskId, true);

            if (!$actor->isAdmin() && $attempt->worker_id !== $actor->id) {
                throw new HttpException(403, 'Akses ditolak.');
            }

            /** @var ServiceOrder $order */
            $order = ServiceOrder::where('id', $attempt->order_id)->lockForUpdate()->firstOrFail();

            /** @var ServiceVisit $visit */
            $visit = ServiceVisit::where('order_id', $order->id)->lockForUpdate()->firstOrFail();

            $actionUpper = strtoupper($action);
            $now = now();
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;

            if ($actionUpper === 'OTW') {
                $visit->forceFill([
                    'status' => 'ON_THE_WAY',
                    'otw_at' => $now,
                    'version' => $visit->version + 1,
                ])->save();

                $fromStatus = $order->status;
                $order->forceFill([
                    'status' => 'WORKER_ON_THE_WAY',
                    'phase' => 'VISIT_IN_PROGRESS',
                    'version' => $order->version + 1,
                ])->save();

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'VISIT_OTW',
                    fromState: $fromStatus,
                    toState: 'WORKER_ON_THE_WAY',
                    actorId: $actor->id,
                    actorType: $actor->role
                );
            } elseif ($actionUpper === 'ARRIVED') {
                $visit->forceFill([
                    'status' => 'ARRIVED',
                    'arrived_at' => $now,
                    'version' => $visit->version + 1,
                ])->save();

                $fromStatus = $order->status;
                $order->forceFill([
                    'status' => 'WORKER_ARRIVED',
                    'version' => $order->version + 1,
                ])->save();

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'VISIT_ARRIVED',
                    fromState: $fromStatus,
                    toState: 'WORKER_ARRIVED',
                    actorId: $actor->id,
                    actorType: $actor->role
                );
            } elseif ($actionUpper === 'START_DIAGNOSIS') {
                $visit->forceFill([
                    'status' => 'DIAGNOSING',
                    'diagnosis_started_at' => $now,
                    'version' => $visit->version + 1,
                ])->save();

                $fromStatus = $order->status;
                $order->forceFill([
                    'status' => 'DIAGNOSIS_IN_PROGRESS',
                    'phase' => 'DIAGNOSIS_IN_PROGRESS',
                    'version' => $order->version + 1,
                ])->save();

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'DIAGNOSIS_STARTED',
                    fromState: $fromStatus,
                    toState: 'DIAGNOSIS_IN_PROGRESS',
                    actorId: $actor->id,
                    actorType: $actor->role
                );
            } else {
                throw new HttpException(422, "Aksi visit '{$action}' tidak dikenal.");
            }

            return $visit;
        });
    }

    public function submitDiagnosis(AuthenticatedActor $actor, string $taskId, array $payload): DiagnosisVersion
    {
        return DB::transaction(function () use ($actor, $taskId, $payload) {
            /** @var WorkerAssignmentAttempt $attempt */
            $attempt = $this->resolveAttempt($taskId, true);

            if (!$actor->isAdmin() && $attempt->worker_id !== $actor->id) {
                throw new HttpException(403, 'Akses ditolak.');
            }

            /** @var ServiceOrder $order */
            $order = ServiceOrder::where('id', $attempt->order_id)->lockForUpdate()->firstOrFail();

            /** @var ServiceVisit $visit */
            $visit = ServiceVisit::where('order_id', $order->id)->lockForUpdate()->firstOrFail();

            $lastVersionNo = DiagnosisVersion::where('order_id', $order->id)->max('version_no') ?? 0;
            $newVersionNo = $lastVersionNo + 1;
            $diagId = (string) Str::ulid();

            // Calculate work subtotals (labor)
            $workSubtotal = 0;
            $rawWorkItems = $payload['work_items'] ?? [];
            foreach ($rawWorkItems as $item) {
                $qty = max(1, (int) ($item['quantity'] ?? $item['qty'] ?? 1));
                $price = max(0, (int) ($item['unit_price_idr'] ?? $item['unit_price'] ?? $item['price'] ?? 0));
                $workSubtotal += ($qty * $price);
            }

            // Calculate part subtotals (only PROVIDER_SUPPLIED adds to execution billing)
            $providerPartSubtotal = 0;
            $rawPartItems = $payload['part_items'] ?? $payload['spareparts'] ?? [];
            foreach ($rawPartItems as $item) {
                $sourceRaw = strtoupper((string) ($item['source'] ?? $item['part_source'] ?? 'PROVIDER_SUPPLIED'));
                if ($sourceRaw === 'PROVIDER' || $sourceRaw === 'PROVIDER_SUPPLIED') {
                    $qty = max(1, (int) ($item['quantity'] ?? $item['qty'] ?? 1));
                    $price = max(0, (int) ($item['unit_price_idr'] ?? $item['unit_price'] ?? $item['price'] ?? 0));
                    $providerPartSubtotal += ($qty * $price);
                }
            }

            $totalBase = $workSubtotal + $providerPartSubtotal;
            $now = now();
            $remoteDueAt = $now->copy()->addMinutes(30);

            // Create DiagnosisVersion
            $diagnosis = DiagnosisVersion::forceCreate([
                'id' => $diagId,
                'order_id' => $order->id,
                'visit_id' => $visit->id,
                'version_no' => $newVersionNo,
                'status' => 'SUBMITTED',
                'worker_id' => $actor->id,
                'initial_condition' => $payload['initial_condition'] ?? null,
                'findings' => (string) $payload['findings'],
                'suspected_cause' => $payload['suspected_cause'] ?? null,
                'recommended_actions' => $payload['recommended_actions'] ?? null,
                'safety_notes' => $payload['safety_notes'] ?? null,
                'diagnosis_photo_refs' => $payload['diagnosis_photo_refs'] ?? null,
                'work_subtotal_idr' => $workSubtotal,
                'provider_part_subtotal_idr' => $providerPartSubtotal,
                'service_total_base_idr' => $totalBase,
                'currency' => 'IDR',
                'submitted_at' => $now,
                'published_to_customer_at' => $now,
                'remote_response_due_at' => $remoteDueAt,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Save work items
            $lineNo = 1;
            foreach ($rawWorkItems as $item) {
                $qty = max(1, (int) ($item['quantity'] ?? $item['qty'] ?? 1));
                $price = max(0, (int) ($item['unit_price_idr'] ?? $item['unit_price'] ?? $item['price'] ?? 0));
                ServiceWorkItem::forceCreate([
                    'id' => (string) Str::ulid(),
                    'diagnosis_version_id' => $diagId,
                    'line_no' => $lineNo++,
                    'name' => (string) ($item['name'] ?? $item['item_name'] ?? $item['title'] ?? 'Jasa Perbaikan'),
                    'description' => $item['description'] ?? null,
                    'quantity' => $qty,
                    'unit' => $item['unit'] ?? 'item',
                    'unit_price_idr' => $price,
                    'subtotal_idr' => ($qty * $price),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Save part items
            $partLineNo = 1;
            foreach ($rawPartItems as $item) {
                $sourceRaw = strtoupper((string) ($item['source'] ?? $item['part_source'] ?? 'PROVIDER_SUPPLIED'));
                $source = match ($sourceRaw) {
                    'CUSTOMER', 'CUSTOMER_SUPPLIED' => 'CUSTOMER_SUPPLIED',
                    'MERCHANT', 'SERVIO_MERCHANT', 'MERCHANT_05A' => 'SERVIO_MERCHANT',
                    default => 'PROVIDER_SUPPLIED',
                };
                $qty = max(1, (int) ($item['quantity'] ?? $item['qty'] ?? 1));
                $price = ($source === 'PROVIDER_SUPPLIED') ? max(0, (int) ($item['unit_price_idr'] ?? $item['unit_price'] ?? $item['price'] ?? 0)) : 0;

                ServicePartItem::forceCreate([
                    'id' => (string) Str::ulid(),
                    'diagnosis_version_id' => $diagId,
                    'line_no' => $partLineNo++,
                    'part_name' => (string) ($item['part_name'] ?? $item['name'] ?? 'Sparepart'),
                    'specification' => $item['specification'] ?? null,
                    'source' => $source,
                    'quantity' => $qty,
                    'unit' => $item['unit'] ?? 'pcs',
                    'unit_price_idr' => $price,
                    'subtotal_idr' => ($qty * $price),
                    'availability_status' => $item['availability_status'] ?? 'NOT_CHECKED',
                    'compatibility_check_status' => $item['compatibility_check_status'] ?? 'NOT_CHECKED',
                    'worker_note' => $item['worker_note'] ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Update visit & order
            $visit->forceFill([
                'diagnosis_submitted_at' => $now,
                'version' => $visit->version + 1,
            ])->save();

            $fromStatus = $order->status;
            $order->forceFill([
                'status' => 'DIAGNOSIS_SUBMITTED',
                'phase' => 'CUSTOMER_CONSENT_PENDING',
                'version' => $order->version + 1,
            ])->save();

            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $order->id,
                sequenceNo: $nextSeq,
                eventType: 'DIAGNOSIS_SUBMITTED',
                fromState: $fromStatus,
                toState: 'DIAGNOSIS_SUBMITTED',
                actorId: $actor->id,
                actorType: $actor->role,
                metadata: [
                    'version_no' => $newVersionNo,
                    'work_subtotal_idr' => $workSubtotal,
                    'provider_part_subtotal_idr' => $providerPartSubtotal,
                    'service_total_base_idr' => $totalBase,
                ]
            );

            return $diagnosis->load(['workItems', 'partItems']);
        });
    }

    public function finishExecution(
        AuthenticatedActor $actor,
        string $taskId,
        array $payload,
        ExecutionBillingService $billingService
    ): ServiceExecution {
        return DB::transaction(function () use ($actor, $taskId, $payload, $billingService) {
            /** @var WorkerAssignmentAttempt $attempt */
            $attempt = $this->resolveAttempt($taskId, true);

            if (!$actor->isAdmin() && $attempt->worker_id !== $actor->id) {
                throw new HttpException(403, 'Akses ditolak.');
            }

            /** @var ServiceOrder $order */
            $order = ServiceOrder::where('id', $attempt->order_id)->lockForUpdate()->firstOrFail();

            if ($order->status !== 'EXECUTION_IN_PROGRESS') {
                throw new HttpException(422, "Pekerjaan hanya dapat diselesaikan saat dalam status EXECUTION_IN_PROGRESS (status saat ini: {$order->status}).");
            }

            /** @var ServiceExecution $execution */
            $execution = ServiceExecution::where('order_id', $order->id)->lockForUpdate()->firstOrFail();

            // Validate mandatory evidence: BEFORE & AFTER photos
            $evidenceList = $payload['evidence'] ?? [];
            $hasBefore = false;
            $hasAfter = false;

            foreach ($evidenceList as $ev) {
                $type = strtoupper((string) ($ev['evidence_type'] ?? ''));
                if ($type === 'BEFORE') $hasBefore = true;
                if ($type === 'AFTER') $hasAfter = true;
            }

            if (!$hasBefore || !$hasAfter) {
                throw new HttpException(422, 'Bukti pengerjaan wajib menyertakan minimal 1 foto sebelum (BEFORE) dan 1 foto sesudah (AFTER).');
            }

            $now = now();

            // Update execution
            $execution->forceFill([
                'status' => 'WORKER_FINISHED',
                'finished_at' => $now,
                'summary' => $payload['summary'] ?? 'Pekerjaan servis telah selesai.',
                'test_result' => $payload['test_result'] ?? 'Pengujian fungsi berhasil normal.',
                'completion_evidence_validated_at' => $now,
                'version' => $execution->version + 1,
            ])->save();

            // Save evidence items
            $ordinal = 1;
            foreach ($evidenceList as $ev) {
                ExecutionEvidence::forceCreate([
                    'id' => (string) Str::ulid(),
                    'execution_id' => $execution->id,
                    'evidence_type' => strtoupper((string) ($ev['evidence_type'] ?? 'OTHER')),
                    'media_reference' => (string) ($ev['media_reference'] ?? 'media_placeholder'),
                    'sha256' => $ev['sha256'] ?? null,
                    'mime' => $ev['mime'] ?? 'image/jpeg',
                    'size_bytes' => $ev['size_bytes'] ?? null,
                    'capture_at' => $now,
                    'uploaded_by' => $actor->id,
                    'ordinal' => $ordinal++,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Generate execution billing invoice in Finance 06
            $billingService->generateExecutionBilling($order);

            // Transition order status
            $fromStatus = $order->status;
            $order->forceFill([
                'status' => 'WORKER_FINISHED',
                'phase' => 'PAYMENT_PENDING',
                'version' => $order->version + 1,
            ])->save();

            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $order->id,
                sequenceNo: $nextSeq,
                eventType: 'WORKER_FINISHED',
                fromState: $fromStatus,
                toState: 'WORKER_FINISHED',
                actorId: $actor->id,
                actorType: $actor->role,
                metadata: [
                    'summary' => $execution->summary,
                ]
            );

            return $execution->load('evidence');
        });
    }

    public function closeVisit(AuthenticatedActor $actor, string $taskId, ?string $reason = null): ServiceVisit
    {
        return DB::transaction(function () use ($actor, $taskId, $reason) {
            /** @var WorkerAssignmentAttempt $attempt */
            $attempt = $this->resolveAttempt($taskId, true);

            if (!$actor->isAdmin() && $attempt->worker_id !== $actor->id) {
                throw new HttpException(403, 'Akses ditolak.');
            }

            // Priority 4: Worker can only close visit after Finance is PAID or with recorded operational issue
            $executionObligation = \App\Models\ServicePaymentObligation::where('order_id', $attempt->order_id)
                ->where('purpose', 'SERVICE_EXECUTION')
                ->first();

            $isPaid = ($executionObligation === null)
                || in_array($executionObligation->state, ['PAID', 'NOT_REQUIRED'], true);

            $hasOperationalIssue = \App\Models\OperationalIssue::where('order_id', $attempt->order_id)
                ->where('status', 'OPEN')
                ->exists();

            if (!$isPaid && !$hasOperationalIssue) {
                throw new HttpException(422, 'Teknisi hanya dapat menutup kunjungan (close visit) setelah tagihan pengerjaan lunas dibayar atau telah dicatat kendala operasional pengerjaan.');
            }

            /** @var ServiceVisit $visit */
            $visit = ServiceVisit::where('order_id', $attempt->order_id)->lockForUpdate()->firstOrFail();

            $now = now();
            $visit->forceFill([
                'status' => 'CLOSED',
                'visit_closed_at' => $now,
                'visit_close_reason' => $reason ?: 'NORMAL_COMPLETION',
                'version' => $visit->version + 1,
            ])->save();

            return $visit;
        });
    }
}
