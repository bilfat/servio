<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\OperationalIssueNotifierInterface;
use App\Models\OperationalIssue;
use App\Models\OrderAuditLog;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OperationalIssueService
{
    public function __construct(
        private readonly OperationalIssueNotifierInterface $issueNotifier,
    ) {}

    public function raiseIssue(
        AuthenticatedActor $actor,
        string $orderId,
        string $issueKind,
        string $description,
        array $evidenceRefs = []
    ): OperationalIssue {
        return DB::transaction(function () use ($actor, $orderId, $issueKind, $description, $evidenceRefs) {
            /** @var ServiceOrder|null $order */
            $order = ServiceOrder::where('id', $orderId)->first();

            if (!$order) {
                throw new HttpException(404, 'Pesanan jasa tidak ditemukan.');
            }

            // Priority 5: Strictly authorized actors (Customer owner, Active assigned Worker, or Provider Org)
            $isAuthorized = false;
            if ($actor->isAdmin()) {
                $isAuthorized = true;
            } elseif ($actor->isCustomer() && $order->customer_id === $actor->id) {
                $isAuthorized = true;
            } elseif ($actor->isProvider() && $order->provider_org_id === ($actor->organizationId ?? $actor->id)) {
                $isAuthorized = true;
            } elseif ($actor->isWorker()) {
                $activeWorkerId = \App\Models\ServiceVisit::where('order_id', $order->id)->value('worker_id');
                if ($activeWorkerId === $actor->id) {
                    $isAuthorized = true;
                }
            }

            if (!$isAuthorized) {
                throw new HttpException(403, 'Anda tidak berwenang melaporkan kendala operasional pada pesanan ini.');
            }

            $issueId = (string) Str::ulid();
            $issueNo = 'ISS-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            $now = now();

            $issue = OperationalIssue::forceCreate([
                'id' => $issueId,
                'issue_no' => $issueNo,
                'order_id' => $order->id,
                'reported_by_role' => $actor->role,
                'reported_by_id' => $actor->id,
                'issue_kind' => strtoupper($issueKind),
                'status' => 'OPEN',
                'description' => $description,
                'evidence_refs' => $evidenceRefs,
                'affects_completion' => true,
                'affects_funds' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Notify admin operations authority
            $this->issueNotifier->notifyIssueEscalation(
                issueId: $issueId,
                orderId: $order->id,
                issueType: $issueKind,
                severity: 'HIGH',
                description: $description
            );

            // Record order timeline event
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $order->id,
                sequenceNo: $nextSeq,
                eventType: 'OPERATIONAL_ISSUE_RAISED',
                fromState: $order->status,
                toState: $order->status,
                actorId: $actor->id,
                actorType: $actor->role,
                metadata: [
                    'issue_no' => $issueNo,
                    'issue_kind' => $issueKind,
                ]
            );

            \App\Support\DomainEventLogger::recordAuditLog(
                actor: "{$actor->role}:{$actor->id}",
                action: 'RAISE_OPERATIONAL_ISSUE',
                resource: "OperationalIssue:{$issueId}",
                reason: $description
            );

            return $issue;
        });
    }

    public function resolveIssue(
        AuthenticatedActor $actor,
        string $issueId,
        string $resolutionCode,
        ?string $resolutionNotes = null
    ): OperationalIssue {
        if (!$actor->isAdmin()) {
            throw new HttpException(403, 'Hanya Admin Operasional yang dapat menyelesaikan kendala.');
        }

        return DB::transaction(function () use ($actor, $issueId, $resolutionCode, $resolutionNotes) {
            /** @var OperationalIssue|null $issue */
            $issue = OperationalIssue::where('id', $issueId)->lockForUpdate()->first();

            if (!$issue) {
                throw new HttpException(404, 'Kendala operasional tidak ditemukan.');
            }

            $now = now();
            $issue->forceFill([
                'status' => 'RESOLVED',
                'resolution_code' => $resolutionCode,
                'authority_ref' => $actor->id,
                'resolved_at' => $now,
                'affects_completion' => false,
                'affects_funds' => false,
                'updated_at' => $now,
            ])->save();

            return $issue;
        });
    }
}
