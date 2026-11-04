<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\FinanceServiceClientInterface;
use App\Contracts\IdentityServiceClientInterface;
use App\Contracts\ServiceOfferingClientInterface;
use App\Models\OrderAuditLog;
use App\Models\ServiceBooking;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Support\AuthenticatedActor;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BookingService
{
    public function __construct(
        private readonly ServiceOfferingClientInterface $offeringClient,
        private readonly IdentityServiceClientInterface $identityClient,
        private readonly FinanceServiceClientInterface $financeClient,
    ) {}

    public function createBooking(AuthenticatedActor $actor, array $payload): ServiceOrder
    {
        $offeringId = (string) $payload['service_offering_id'];
        $addressId = (string) $payload['address_id'];
        $scheduledStart = Carbon::parse($payload['scheduled_start_at']);
        $scheduledEnd = isset($payload['scheduled_end_at'])
            ? Carbon::parse($payload['scheduled_end_at'])
            : $scheduledStart->copy()->addHours(2);

        // 1. Validate & snapshot offering from Modul 04
        $offering = $this->offeringClient->getOfferingSnapshot($offeringId);
        if (!($offering['is_active'] ?? false)) {
            throw new HttpException(422, 'Layanan yang dipilih sedang tidak aktif atau tidak tersedia.');
        }

        $providerOrgId = (string) ($offering['provider_org_id'] ?? 'ORG-PROVIDER-01');
        $diagnosisFeeIdr = (int) ($offering['diagnosis_fee_idr'] ?? 0);

        // 2. Snapshot address from Identity 01
        $addressSnapshot = $this->identityClient->getCustomerAddress($actor->id, $addressId);
        $recipientSnapshot = [
            'name' => $addressSnapshot['recipient_name'] ?? 'Pelanggan',
            'phone' => $addressSnapshot['recipient_phone'] ?? $addressSnapshot['phone'] ?? '-',
        ];

        // 3. Determine initial order state
        $hasDiagnosisFee = ($diagnosisFeeIdr > 0);
        $initialStatus = $hasDiagnosisFee ? 'PENDING_DIAGNOSIS_PAYMENT' : 'PAID_WAITING_DISPATCH';
        $initialPhase = $hasDiagnosisFee ? 'DIAGNOSIS_PAYMENT_PENDING' : 'WORKER_ASSIGNMENT_PENDING';
        $obligationState = $hasDiagnosisFee ? 'INVOICE_PENDING' : 'NOT_REQUIRED';

        $orderId = (string) Str::ulid();
        $orderNo = 'SO-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        if (request()) {
            request()->attributes->set('idempotency_has_side_effect', true);
        }

        return DB::transaction(function () use (
            $actor,
            $payload,
            $orderId,
            $orderNo,
            $providerOrgId,
            $offering,
            $addressSnapshot,
            $recipientSnapshot,
            $diagnosisFeeIdr,
            $initialStatus,
            $initialPhase,
            $obligationState,
            $hasDiagnosisFee,
            $scheduledStart,
            $scheduledEnd
        ) {
            // 4. Create ServiceOrder
            $order = ServiceOrder::forceCreate([
                'id' => $orderId,
                'order_no' => $orderNo,
                'customer_id' => $actor->id,
                'provider_org_id' => $providerOrgId,
                'service_offering_id' => (string) $offering['id'],
                'service_offering_version' => (string) ($offering['version'] ?? '1'),
                'service_snapshot' => $offering,
                'recipient_snapshot' => $recipientSnapshot,
                'address_snapshot' => $addressSnapshot,
                'complaint_text' => (string) $payload['complaint_text'],
                'symptoms_json' => $payload['symptoms_json'] ?? null,
                'customer_media_refs' => $payload['customer_media_refs'] ?? null,
                'diagnosis_fee_idr' => $diagnosisFeeIdr,
                'status' => $initialStatus,
                'phase' => $initialPhase,
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 5. Create ServiceBooking
            $bookingId = (string) Str::ulid();
            ServiceBooking::forceCreate([
                'id' => $bookingId,
                'order_id' => $orderId,
                'customer_id' => $actor->id,
                'provider_org_id' => $providerOrgId,
                'scheduled_start_at' => $scheduledStart,
                'scheduled_end_at' => $scheduledEnd,
                'timezone' => 'Asia/Jakarta',
                'slot_reference' => $payload['slot_reference'] ?? null,
                'status' => 'CONFIRMED',
                'schedule_revision' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 6. Create ServiceVisit
            $visitId = (string) Str::ulid();
            ServiceVisit::forceCreate([
                'id' => $visitId,
                'order_id' => $orderId,
                'assignment_id' => null,
                'worker_id' => null,
                'status' => 'NOT_STARTED',
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 7. Create Diagnosis Payment Obligation
            $obligationId = (string) Str::ulid();
            $paymentDueAt = $hasDiagnosisFee ? now()->addHours(6) : null;

            $diagFeeSnapshot = [
                'purpose' => 'DIAGNOSIS',
                'labor_subtotal_idr' => $diagnosisFeeIdr,
                'provider_part_subtotal_idr' => 0,
                'execution_subtotal_idr' => $diagnosisFeeIdr,
                'customer_platform_fee_idr' => 0,
                'customer_total_idr' => $diagnosisFeeIdr,
                'provider_commission_idr' => 0,
                'provider_net_entitlement_idr' => $diagnosisFeeIdr,
                'policy_name' => 'Bebas Biaya Platform',
                'policy_version' => null,
                'policy_snapshot' => [],
            ];

            $obligation = ServicePaymentObligation::forceCreate([
                'id' => $obligationId,
                'order_id' => $orderId,
                'purpose' => 'DIAGNOSIS',
                'principal_idr' => $diagnosisFeeIdr,
                'currency' => 'IDR',
                'fee_snapshot' => $diagFeeSnapshot,
                'state' => $obligationState,
                'payment_due_at' => $paymentDueAt,
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 8. If diagnosis fee > 0, generate invoice & payment intent with Finance Service 06
            if ($hasDiagnosisFee) {
                $financeResult = $this->financeClient->createPaymentIntent(
                    orderId: $orderId,
                    obligationId: $obligationId,
                    purpose: 'DIAGNOSIS',
                    amountIdr: $diagnosisFeeIdr,
                    customerId: $actor->id
                );

                $attemptId = (string) Str::ulid();
                ServicePaymentAttempt::forceCreate([
                    'id' => $attemptId,
                    'obligation_id' => $obligationId,
                    'attempt_no' => 1,
                    'finance_payment_id' => $financeResult['payment_intent_id'],
                    'finance_invoice_ref' => $financeResult['invoice_no'],
                    'method' => 'MOCK',
                    'reported_status' => 'PENDING',
                    'amount_due_idr' => $diagnosisFeeIdr,
                    'issued_at' => now(),
                    'expires_at' => $paymentDueAt,
                    'is_current' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $obligation->forceFill([
                    'active_finance_payment_id' => $financeResult['payment_intent_id'],
                    'finance_obligation_ref' => $financeResult['invoice_no'],
                ])->save();
            }

            // 9. Timeline event & audit log
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $orderId,
                sequenceNo: 1,
                eventType: 'ORDER_CREATED',
                fromState: null,
                toState: $initialStatus,
                actorId: $actor->id,
                actorType: $actor->role,
                metadata: [
                    'diagnosis_fee_idr' => $diagnosisFeeIdr,
                    'has_diagnosis_fee' => $hasDiagnosisFee,
                ]
            );

            \App\Support\DomainEventLogger::recordAuditLog(
                actor: "{$actor->role}:{$actor->id}",
                action: 'CREATE_ORDER',
                resource: "ServiceOrder:{$orderId}",
                reason: "Customer created booking {$orderNo}"
            );

            return $order->load(['booking', 'visit', 'paymentObligations.attempts']);
        });
    }
}
