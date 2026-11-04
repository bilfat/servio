<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\BookingActiveAssignment;
use App\Models\DiagnosisVersion;
use App\Models\OperationalIssue;
use App\Models\ServiceExecution;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\ServicePaymentObligation;
use App\Models\WorkerAssignmentAttempt;
use App\Services\CompletionAndSettlementService;
use App\Support\AuthenticatedActor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessOrderJasaTimeoutsCommand extends Command
{
    protected $signature = 'order-jasa:process-timeouts';
    protected $description = 'Process SLA timeouts for Order Jasa (30m assignment, 30m consent, 6h payment, 72h auto-completion, 120h escrow hold)';

    public function handle(CompletionAndSettlementService $completionService): int
    {
        $this->info('Starting Order Jasa SLA timeout sweep...');
        $now = now();

        $systemActor = new AuthenticatedActor(
            id: 'SYSTEM_SCHEDULER',
            role: 'ADMIN_OPERATIONS',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: false,
            organizationIsActive: true,
            membershipIsActive: true,
        );

        // 1. Worker Response SLA (30 Minutes)
        $expiredAssignments = WorkerAssignmentAttempt::where('status', 'ASSIGNED')
            ->where('response_due_at', '<=', $now)
            ->get();

        foreach ($expiredAssignments as $attempt) {
            DB::transaction(function () use ($attempt, $now) {
                $attempt->forceFill([
                    'status' => 'EXPIRED',
                    'expiry_reason' => 'RESPONSE_SLA_30MIN_EXCEEDED',
                    'updated_at' => $now,
                ])->save();

                // Delete from active assignments
                BookingActiveAssignment::where('booking_id', $attempt->booking_id)->delete();

                // Revert order status
                $order = ServiceOrder::find($attempt->order_id);
                if ($order && $order->status === 'ASSIGNED_WAITING_WORKER') {
                    $fromStatus = $order->status;
                    $order->forceFill([
                        'status' => 'PAID_WAITING_DISPATCH',
                        'phase' => 'WORKER_ASSIGNMENT_PENDING',
                        'version' => $order->version + 1,
                    ])->save();

                    $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
                    \App\Support\DomainEventLogger::recordOrderEvent(
                        orderId: $order->id,
                        sequenceNo: $nextSeq,
                        eventType: 'WORKER_ASSIGNMENT_EXPIRED',
                        fromState: $fromStatus,
                        toState: 'PAID_WAITING_DISPATCH',
                        actorId: 'SYSTEM_SCHEDULER',
                        actorType: 'SYSTEM'
                    );
                }
            });
            $this->line("Expired worker assignment #{$attempt->id} (30m SLA exceeded)");
        }

        // 2. 6-Hour Payment SLA:
        // DIAGNOSIS: unpaid after 6 hours cancels order (DIAGNOSIS_PAYMENT_EXPIRED)
        // SERVICE_EXECUTION: unpaid after 6 hours marks obligation OVERDUE without cancelling physical order
        $overdueObligations = ServicePaymentObligation::whereIn('state', ['INVOICE_PENDING', 'REQUIRES_INVOICE'])
            ->where('payment_due_at', '<=', $now)
            ->get();

        foreach ($overdueObligations as $ob) {
            DB::transaction(function () use ($ob, $now) {
                if ($ob->purpose === 'DIAGNOSIS') {
                    $ob->forceFill([
                        'state' => 'EXPIRED',
                        'updated_at' => $now,
                    ])->save();

                    // Mark attempts expired
                    $ob->attempts()->where('reported_status', 'PENDING')->update([
                        'reported_status' => 'EXPIRED',
                        'updated_at' => $now,
                    ]);

                    $order = ServiceOrder::find($ob->order_id);
                    if ($order && !in_array($order->status, ['COMPLETED', 'CANCELLED'], true)) {
                        $fromStatus = $order->status;
                        $order->forceFill([
                            'status' => 'CANCELLED',
                            'phase' => 'TERMINAL',
                            'cancel_reason_code' => 'DIAGNOSIS_PAYMENT_EXPIRED',
                            'cancelled_at' => $now,
                            'version' => $order->version + 1,
                        ])->save();

                        // Release booking active assignment
                        if ($order->booking) {
                            BookingActiveAssignment::where('booking_id', $order->booking->id)->delete();
                        }

                        $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
                        \App\Support\DomainEventLogger::recordOrderEvent(
                            orderId: $order->id,
                            sequenceNo: $nextSeq,
                            eventType: 'ORDER_CANCELLED',
                            fromState: $fromStatus,
                            toState: 'CANCELLED',
                            actorId: 'SYSTEM_SCHEDULER',
                            actorType: 'SYSTEM',
                            metadata: [
                                'reason_code' => 'DIAGNOSIS_PAYMENT_EXPIRED',
                            ]
                        );
                    }
                    $this->line("Diagnosis obligation #{$ob->id} expired; Order #{$ob->order_id} cancelled.");
                } else {
                    // SERVICE_EXECUTION: physical work done, mark obligation OVERDUE without cancelling order
                    $ob->forceFill([
                        'state' => 'OVERDUE',
                        'updated_at' => $now,
                    ])->save();
                    $this->line("Execution obligation #{$ob->id} flagged as OVERDUE (Order #{$ob->order_id})");
                }
            });
        }

        // 3. 72-Hour Auto-Completion: completed 72h after max(finished_at, paid_at) without blocking dispute
        $finishedOrders = ServiceOrder::whereIn('status', ['EXECUTION_PAID', 'WORKER_FINISHED'])
            ->with(['execution', 'paymentObligations'])
            ->get();

        foreach ($finishedOrders as $order) {
            $execution = $order->execution;
            if (!$execution || $execution->status !== 'WORKER_FINISHED' || !$execution->finished_at) {
                continue;
            }

            $execObligation = $order->paymentObligations->firstWhere('purpose', 'SERVICE_EXECUTION');
            $finishedAt = $execution->finished_at;
            $paidAt = $execObligation?->paid_at ?? $finishedAt;

            // Base clock starts at max(finished_at, paid_at)
            $clockStart = $finishedAt->gt($paidAt) ? $finishedAt : $paidAt;
            $completionDueAt = $clockStart->copy()->addHours(72);

            if ($now->gte($completionDueAt)) {
                // Verify no blocking open operational issues
                $hasBlockingIssue = OperationalIssue::where('order_id', $order->id)
                    ->where('status', 'OPEN')
                    ->where('affects_completion', true)
                    ->exists();

                if (!$hasBlockingIssue) {
                    try {
                        $completionService->completeOrder($systemActor, $order->id, isAutoCompleted: true);
                        $this->info("Order #{$order->order_no} auto-completed (72h SLA from max(finished_at, paid_at))");
                    } catch (\Throwable $e) {
                        $this->warn("Order #{$order->order_no} auto-completion deferred: " . $e->getMessage());
                    }
                } else {
                    $this->line("Order #{$order->order_no} auto-completion held due to active dispute.");
                }
            }
        }

        // 4. 120-Hour Escrow Hold: release matured funds to Provider S-Pay
        $releasedCount = $completionService->releaseMaturedFunds();
        if ($releasedCount > 0) {
            $this->info("Released {$releasedCount} matured 120h escrow fund(s) to Provider S-Pay.");
        }

        $this->info('Order Jasa SLA timeout sweep finished successfully.');
        return Command::SUCCESS;
    }
}
