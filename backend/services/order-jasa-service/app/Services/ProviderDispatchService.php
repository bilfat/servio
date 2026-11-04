<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\IdentityServiceClientInterface;
use App\Models\BookingActiveAssignment;
use App\Models\OrderAuditLog;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\WorkerAssignmentAttempt;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProviderDispatchService
{
    public function __construct(
        private readonly IdentityServiceClientInterface $identityClient,
    ) {}

    public function assignWorker(AuthenticatedActor $actor, string $orderId, string $workerId): WorkerAssignmentAttempt
    {
        return DB::transaction(function () use ($actor, $orderId, $workerId) {
            /** @var ServiceOrder|null $order */
            $order = ServiceOrder::where('id', $orderId)->lockForUpdate()->first();

            if (!$order) {
                throw new HttpException(404, 'Pesanan jasa tidak ditemukan.');
            }

            if (!$actor->isAdmin() && $order->provider_org_id !== $actor->organizationId) {
                throw new HttpException(403, 'Anda tidak memiliki hak akses untuk menugaskan teknisi pada pesanan ini.');
            }

            // Allowed order statuses for dispatch
            $allowedStatuses = ['PAID_WAITING_DISPATCH', 'ASSIGNED_WAITING_WORKER'];
            if (!in_array($order->status, $allowedStatuses, true)) {
                throw new HttpException(422, "Pesanan berstatus {$order->status} dan belum siap untuk penugasan teknisi.");
            }

            // 1. Verify worker eligibility with Identity Service 01
            $eligibility = $this->identityClient->verifyWorkerEligibility($workerId, $order->provider_org_id);
            if (!($eligibility['is_active'] ?? false)) {
                throw new HttpException(422, 'Teknisi berstatus nonaktif atau tidak ditemukan.');
            }
            if (!($eligibility['is_member'] ?? false)) {
                throw new HttpException(422, 'Teknisi bukan merupakan anggota aktif dari organisasi penyedia jasa ini.');
            }

            $booking = $order->booking()->lockForUpdate()->first();
            if (!$booking) {
                throw new HttpException(500, 'Jadwal reservasi pesanan tidak ditemukan.');
            }

            // 2. Compute next attempt_no
            $lastAttemptNo = WorkerAssignmentAttempt::where('booking_id', $booking->id)->max('attempt_no') ?? 0;
            $attemptNo = $lastAttemptNo + 1;

            $attemptId = (string) Str::ulid();
            $now = now();
            $responseDueAt = $now->copy()->addMinutes(30); // 30-minute SLA

            // 3. Create assignment attempt
            $attempt = WorkerAssignmentAttempt::forceCreate([
                'id' => $attemptId,
                'booking_id' => $booking->id,
                'order_id' => $order->id,
                'attempt_no' => $attemptNo,
                'worker_id' => $workerId,
                'provider_org_id' => $order->provider_org_id,
                'status' => 'ASSIGNED',
                'assigned_by_id' => $actor->id,
                'assigned_at' => $now,
                'response_due_at' => $responseDueAt,
                'worker_capability_snapshot' => $eligibility['capabilities'] ?? [],
                'worker_membership_snapshot' => $eligibility['snapshot'] ?? [],
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 4. Update or insert into booking_active_assignments
            $activeAssignment = BookingActiveAssignment::where('booking_id', $booking->id)->first();
            if ($activeAssignment) {
                $activeAssignment->forceFill([
                    'attempt_id' => $attemptId,
                    'worker_id' => $workerId,
                    'status' => 'ASSIGNED',
                    'assigned_at' => $now,
                    'updated_at' => $now,
                ])->save();
            } else {
                BookingActiveAssignment::forceCreate([
                    'booking_id' => $booking->id,
                    'attempt_id' => $attemptId,
                    'worker_id' => $workerId,
                    'status' => 'ASSIGNED',
                    'assigned_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // 5. Transition order status
            $fromStatus = $order->status;
            $order->forceFill([
                'status' => 'ASSIGNED_WAITING_WORKER',
                'phase' => 'WORKER_CONFIRMATION_PENDING',
                'version' => $order->version + 1,
            ])->save();

            // 6. Record timeline event & audit log
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $order->id,
                sequenceNo: $nextSeq,
                eventType: 'WORKER_ASSIGNED',
                fromState: $fromStatus,
                toState: 'ASSIGNED_WAITING_WORKER',
                actorId: $actor->id,
                actorType: $actor->role,
                metadata: [
                    'worker_id' => $workerId,
                    'attempt_no' => $attemptNo,
                    'response_due_at' => $responseDueAt->toISOString(),
                ]
            );

            \App\Support\DomainEventLogger::recordAuditLog(
                actor: "{$actor->role}:{$actor->id}",
                action: 'ASSIGN_WORKER',
                resource: "ServiceOrder:{$order->id}",
                reason: "Provider assigned worker {$workerId}"
            );

            return $attempt;
        });
    }
}
