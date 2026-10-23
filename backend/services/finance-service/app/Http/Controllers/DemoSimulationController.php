<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Finance\Payments\PaymentVerificationService;
use App\Domain\Finance\Withdrawals\WithdrawalService;
use App\Http\Requests\SimulatePaymentRequest;
use App\Http\Requests\SimulateWithdrawalRequest;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;

class DemoSimulationController extends Controller
{
    public function __construct(
        private readonly PaymentVerificationService $paymentVerificationService,
        private readonly WithdrawalService $withdrawalService,
    ) {}

    public function simulatePayment(SimulatePaymentRequest $request, string $paymentId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $data = $request->validated();

        $payment = $this->paymentVerificationService->simulatePaymentOutcome(
            paymentId: $paymentId,
            outcome: $data['outcome'],
            providerEventId: $data['provider_event_id'],
            reportedAmountIdr: (int) $data['reported_amount_idr'],
            actorUserId: $actor?->actorId ?? 'DEMO_OPERATOR'
        );

        return ApiResponse::success([
            'payment_id' => $payment->id,
            'checkout_group_id' => $payment->checkout->checkout_group_id ?? null,
            'status' => $payment->status,
            'amount_idr' => $payment->amount_idr,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'is_real_payment' => false,
            'mode' => 'MOCK',
        ], 'Simulasi transaksi pembayaran berhasil diproses.');
    }

    public function simulateWithdrawal(SimulateWithdrawalRequest $request, string $withdrawalId): JsonResponse
    {
        $data = $request->validated();

        $withdrawal = $this->withdrawalService->simulatePayoutOutcome(
            withdrawalId: $withdrawalId,
            outcome: $data['outcome'],
            providerEventId: $data['provider_event_id']
        );

        return ApiResponse::success([
            'withdrawal_id' => $withdrawal->id,
            'status' => $withdrawal->status,
            'requested_amount_idr' => $withdrawal->requested_amount_idr,
            'net_to_bank_idr' => $withdrawal->net_to_bank_idr,
            'completed_at' => $withdrawal->completed_at?->toIso8601String(),
            'failure_code' => $withdrawal->failure_code,
            'is_real_transfer' => false,
            'mode' => 'MOCK',
        ], 'Simulasi pencairan dana (payout) berhasil diproses.');
    }
}
