<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\OrderAuditLog;
use App\Models\ServiceExecution;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\ServiceVisit;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ConsentService
{
    public function recordConsent(AuthenticatedActor $actor, string $orderId, array $payload): CustomerConsent
    {
        return DB::transaction(function () use ($actor, $orderId, $payload) {
            /** @var ServiceOrder|null $order */
            $order = ServiceOrder::where('id', $orderId)->lockForUpdate()->first();

            if (!$order) {
                throw new HttpException(404, 'Pesanan jasa tidak ditemukan.');
            }

            if ($order->status !== 'DIAGNOSIS_SUBMITTED') {
                throw new HttpException(422, "Persetujuan pelanggan hanya dapat diberikan saat pesanan berstatus DIAGNOSIS_SUBMITTED (status saat ini: {$order->status}).");
            }

            /** @var DiagnosisVersion $diagnosis */
            $diagnosis = DiagnosisVersion::where('order_id', $order->id)
                ->where('status', 'SUBMITTED')
                ->latest('version_no')
                ->firstOrFail();

            /** @var ServiceVisit $visit */
            $visit = ServiceVisit::where('order_id', $order->id)->firstOrFail();

            $method = strtoupper((string) ($payload['method'] ?? 'CUSTOMER_REMOTE'));
            $decision = strtoupper((string) ($payload['decision'] ?? 'APPROVED'));

            // Authorization & consent mode validation
            if ($method === 'WORKER_RECORDED_IN_PERSON') {
                if (!$actor->isWorker() && !$actor->isAdmin()) {
                    throw new HttpException(403, 'Hanya teknisi yang bertugas atau admin yang dapat mencatat persetujuan di tempat.');
                }
                if (!$actor->isAdmin() && $visit->worker_id !== $actor->id) {
                    throw new HttpException(403, 'Hanya teknisi aktif yang ditugaskan pada pesanan ini yang dapat mencatat persetujuan di tempat.');
                }
                $recordedByType = 'WORKER';
                $recordedById = $actor->id;
                $customerPresentReported = (bool) ($payload['customer_present_reported'] ?? false);
                $statementAcknowledged = (bool) ($payload['statement_acknowledged'] ?? false);

                if (!$customerPresentReported || !$statementAcknowledged) {
                    throw new HttpException(422, 'Persetujuan di tempat memerlukan konfirmasi kehadiran pelanggan dan persetujuan pernyataan.');
                }
            } else {
                // CUSTOMER_REMOTE
                if (!$actor->isCustomer() && !$actor->isAdmin()) {
                    throw new HttpException(403, 'Persetujuan jarak jauh harus disetujui langsung oleh pelanggan.');
                }
                if (!$actor->isAdmin() && $order->customer_id !== $actor->id) {
                    throw new HttpException(403, 'Anda tidak memiliki hak akses pada pesanan ini.');
                }
                if ($diagnosis->remote_response_due_at && now()->gt($diagnosis->remote_response_due_at)) {
                    throw new HttpException(422, 'Batas waktu persetujuan jarak jauh (30 menit) telah kedaluwarsa.');
                }
                if (isset($payload['diagnosis_version_id']) && $payload['diagnosis_version_id'] !== $diagnosis->id) {
                    throw new HttpException(422, 'Versi diagnosis yang disetujui tidak sesuai dengan versi diagnosis aktif.');
                }

                $recordedByType = 'CUSTOMER';
                $recordedById = $actor->id;
                $customerPresentReported = false;
                $statementAcknowledged = (bool) ($payload['statement_acknowledged'] ?? false);

                if (!$statementAcknowledged) {
                    throw new HttpException(422, 'Pelanggan wajib menyetujui pernyataan persetujuan biaya dan pengerjaan.');
                }
            }

            $consentId = (string) Str::ulid();
            $now = now();

            $consent = CustomerConsent::forceCreate([
                'id' => $consentId,
                'order_id' => $order->id,
                'diagnosis_version_id' => $diagnosis->id,
                'method' => $method,
                'decision' => $decision,
                'recorded_by_type' => $recordedByType,
                'recorded_by_id' => $recordedById,
                'customer_id' => $order->customer_id,
                'statement_acknowledged' => $statementAcknowledged,
                'customer_present_reported' => $customerPresentReported,
                'submitted_at' => $now,
                'remote_due_at' => $diagnosis->remote_response_due_at,
                'client_context_json' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $fromStatus = $order->status;
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;

            if ($decision === 'APPROVED') {
                // CRITICAL LOCKED RULE: Worker is immediately authorized to start physical work!
                // Order transitions to EXECUTION_IN_PROGRESS!
                $order->forceFill([
                    'status' => 'EXECUTION_IN_PROGRESS',
                    'phase' => 'EXECUTION_IN_PROGRESS',
                    'version' => $order->version + 1,
                ])->save();

                // Create ServiceExecution
                ServiceExecution::forceCreate([
                    'id' => (string) Str::ulid(),
                    'order_id' => $order->id,
                    'visit_id' => $visit->id,
                    'diagnosis_version_id' => $diagnosis->id,
                    'consent_id' => $consentId,
                    'worker_id' => $visit->worker_id ?: $diagnosis->worker_id,
                    'status' => 'IN_PROGRESS',
                    'started_at' => $now,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'CONSENT_APPROVED',
                    fromState: $fromStatus,
                    toState: 'EXECUTION_IN_PROGRESS',
                    actorId: $actor->id,
                    actorType: $actor->role,
                    metadata: [
                        'method' => $method,
                        'diagnosis_version_no' => $diagnosis->version_no,
                    ]
                );

                \App\Support\DomainEventLogger::recordAuditLog(
                    actor: "{$actor->role}:{$actor->id}",
                    action: 'APPROVE_CONSENT',
                    resource: "ServiceOrder:{$order->id}"
                );
            } else {
                // REJECTED: transitions to terminal CANCELLED with CUSTOMER_REJECTED_DIAGNOSIS
                // Diagnosis fee is retained for provider since diagnosis visit was completed
                $order->forceFill([
                    'status' => 'CANCELLED',
                    'phase' => 'TERMINAL',
                    'cancel_reason_code' => 'CUSTOMER_REJECTED_DIAGNOSIS',
                    'cancelled_at' => $now,
                    'version' => $order->version + 1,
                ])->save();

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'CONSENT_REJECTED',
                    fromState: $fromStatus,
                    toState: 'CANCELLED',
                    actorId: $actor->id,
                    actorType: $actor->role,
                    metadata: [
                        'reason' => 'CUSTOMER_REJECTED_DIAGNOSIS',
                        'diagnosis_fee_retained' => true,
                    ]
                );

                \App\Support\DomainEventLogger::recordAuditLog(
                    actor: "{$actor->role}:{$actor->id}",
                    action: 'REJECT_CONSENT',
                    resource: "ServiceOrder:{$order->id}"
                );
            }

            return $consent;
        });
    }
}
