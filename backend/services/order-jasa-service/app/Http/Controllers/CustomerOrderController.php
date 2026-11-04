<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\CustomerOrderResource;
use App\Models\ServiceOrder;
use App\Services\BookingService;
use App\Services\CancellationService;
use App\Services\CompletionAndSettlementService;
use App\Services\ConsentService;
use App\Services\ExecutionBillingService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerOrderController
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly ConsentService $consentService,
        private readonly CompletionAndSettlementService $completionService,
        private readonly CancellationService $cancellationService,
        private readonly ExecutionBillingService $billingService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $query = ServiceOrder::query()
            ->with([
                'booking.activeAssignment.attempt',
                'visit',
                'paymentObligations.attempts',
                'diagnosisVersions.workItems',
                'diagnosisVersions.partItems',
                'execution.evidences',
            ])
            ->orderBy('created_at', 'desc');

        if (!$actor->isAdmin() && !$actor->isFinance()) {
            if ($actor->isProvider()) {
                $query->where('provider_org_id', $actor->organizationId ?: $actor->id);
            } elseif ($actor->isWorker()) {
                $query->whereHas('booking.activeAssignment.attempt', function ($q) use ($actor) {
                    $q->where('worker_id', $actor->id);
                });
            } else {
                $query->where('customer_id', $actor->id);
            }
        }

        if ($request->has('status') && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        // Robust pagination validation: clamp strictly between 1 and 50
        $rawPerPage = $request->input('per_page', 15);
        if (!is_numeric($rawPerPage) || (int) $rawPerPage < 1) {
            $perPage = 15;
        } else {
            $perPage = min((int) $rawPerPage, 50);
        }

        $rawPage = $request->input('page', 1);
        $page = (!is_numeric($rawPage) || (int) $rawPage < 1) ? 1 : (int) $rawPage;

        $orders = $query->paginate(perPage: $perPage, page: $page);

        return ApiResponse::success(
            CustomerOrderResource::collection($orders),
            200,
            [
                'pagination' => [
                    'current_page' => $orders->currentPage(),
                    'per_page' => $orders->perPage(),
                    'total' => $orders->total(),
                    'last_page' => $orders->lastPage(),
                ],
            ]
        );
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        // Scoped query: Customer can ONLY query their own orders. Admin may view any.
        $query = ServiceOrder::with([
            'booking.activeAssignment.attempt',
            'visit',
            'execution.evidences',
            'diagnosisVersions.workItems',
            'diagnosisVersions.partItems',
            'paymentObligations.attempts',
            'issues',
        ])->where(function ($q) use ($id) {
            $q->where('id', $id)->orWhere('order_no', $id);
        });

        if (!$actor->isAdmin() && !$actor->isFinance()) {
            if ($actor->isProvider()) {
                $query->where('provider_org_id', $actor->organizationId ?: $actor->id);
            } elseif ($actor->isWorker()) {
                $query->whereHas('booking.activeAssignment.attempt', function ($q) use ($actor) {
                    $q->where('worker_id', $actor->id);
                });
            } else {
                $query->where('customer_id', $actor->id);
            }
        }

        $order = $query->first();

        if (!$order) {
            return ApiResponse::error(
                'ORDER_JASA_NOT_FOUND',
                'Pesanan jasa tidak ditemukan.',
                404
            );
        }

        return ApiResponse::success(new CustomerOrderResource($order));
    }

    public function timeline(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $query = ServiceOrder::where(function ($q) use ($id) {
            $q->where('id', $id)->orWhere('order_no', $id);
        });
        if (!$actor->isAdmin() && !$actor->isFinance()) {
            if ($actor->isProvider()) {
                $query->where('provider_org_id', $actor->organizationId ?: $actor->id);
            } elseif ($actor->isWorker()) {
                $query->whereHas('booking.activeAssignment.attempt', function ($q) use ($actor) {
                    $q->where('worker_id', $actor->id);
                });
            } else {
                $query->where('customer_id', $actor->id);
            }
        }

        $order = $query->first();

        if (!$order) {
            return ApiResponse::error(
                'ORDER_JASA_NOT_FOUND',
                'Pesanan jasa tidak ditemukan.',
                404
            );
        }

        $events = $order->events()->orderBy('sequence_no', 'asc')->get();

        return ApiResponse::success([
            'order_id' => $order->id,
            'order_no' => $order->order_no,
            'status' => $order->status,
            'phase' => $order->phase,
            'timeline' => $events->map(fn ($e) => [
                'sequence_no' => $e->sequence_no,
                'event_type' => $e->event_type,
                'from_status' => $e->from_state,
                'to_status' => $e->to_state,
                'actor_role' => $e->actor_type,
                'occurred_at' => $e->occurred_at?->toISOString(),
            ]),
        ]);
    }

    public function payments(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $query = ServiceOrder::where(function ($q) use ($id) {
            $q->where('id', $id)->orWhere('order_no', $id);
        });
        if (!$actor->isAdmin() && !$actor->isFinance()) {
            if ($actor->isProvider()) {
                $query->where('provider_org_id', $actor->organizationId ?: $actor->id);
            } elseif ($actor->isWorker()) {
                $query->whereHas('booking.activeAssignment.attempt', function ($q) use ($actor) {
                    $q->where('worker_id', $actor->id);
                });
            } else {
                $query->where('customer_id', $actor->id);
            }
        }

        $order = $query->first();

        if (!$order) {
            return ApiResponse::error(
                'ORDER_JASA_NOT_FOUND',
                'Pesanan jasa tidak ditemukan.',
                404
            );
        }

        $obligations = $order->paymentObligations()->with('attempts')->get();

        return ApiResponse::success([
            'order_id' => $order->id,
            'order_no' => $order->order_no,
            'obligations' => $obligations->map(fn ($o) => [
                'id' => $o->id,
                'purpose' => $o->purpose,
                'state' => $o->state,
                'principal_idr' => $o->principal_idr,
                'paid_at' => $o->paid_at?->toISOString(),
                'active_finance_payment_id' => $o->active_finance_payment_id,
                'attempts' => $o->attempts->map(fn ($a) => [
                    'id' => $a->id,
                    'attempt_no' => $a->attempt_no,
                    'finance_payment_id' => $a->finance_payment_id,
                    'finance_invoice_ref' => $a->finance_invoice_ref,
                    'amount_due_idr' => $a->amount_due_idr,
                    'reported_status' => $a->reported_status,
                    'is_current' => $a->is_current,
                ]),
            ]),
        ]);
    }

    /**
     * Request a retry / replacement invoice for an overdue or expired execution payment.
     */
    public function retryPayment(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $request->attributes->set('idempotency_has_side_effect', true);

        $result = $this->billingService->retryExecutionPayment($actor, $id);

        return ApiResponse::success($result, 201);
    }

    /**
     * Customer Booking Service Order Creation
     */
    public function create(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'service_offering_id' => 'required|string',
            'address_id' => 'required|string',
            'scheduled_start_at' => 'required|date',
            'scheduled_end_at' => 'nullable|date',
            'complaint_text' => 'required|string|min:5',
            'symptoms_json' => 'nullable|array',
            'customer_media_refs' => 'nullable|array',
            'slot_reference' => 'nullable|string',
        ]);

        $order = $this->bookingService->createBooking($actor, $validated);

        return ApiResponse::success(new CustomerOrderResource($order), 201);
    }

    /**
     * Customer Consent (Remote or In-Person)
     */
    public function consent(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'method' => 'required|string|in:CUSTOMER_REMOTE,WORKER_RECORDED_IN_PERSON',
            'decision' => 'required|string|in:APPROVED,REJECTED',
            'statement_acknowledged' => 'required|boolean',
            'customer_present_reported' => 'nullable|boolean',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $consent = $this->consentService->recordConsent($actor, $id, $validated);

        return ApiResponse::success($consent, 200);
    }

    /**
     * Customer Complete Order
     */
    public function complete(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $request->attributes->set('idempotency_has_side_effect', true);

        $order = $this->completionService->completeOrder($actor, $id);

        return ApiResponse::success([
            'order_id' => $order->id,
            'order_no' => $order->order_no,
            'status' => $order->status,
            'completed_at' => $order->completed_at?->toISOString(),
            'message' => 'Pesanan telah selesai. Terima kasih!',
        ], 200);
    }

    /**
     * Customer Cancel Order
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason_code' => 'nullable|string',
            'reason_text' => 'nullable|string',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $cancellation = $this->cancellationService->cancelOrder($actor, $id, $validated);

        return ApiResponse::success($cancellation, 200);
    }

    /**
     * Customer Raise Operational Issue (Dispute)
     */
    public function raiseIssue(Request $request, string $id, \App\Services\OperationalIssueService $issueService): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'issue_kind' => 'required|string',
            'description' => 'required|string|min:5',
            'evidence_refs' => 'nullable|array',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $issue = $issueService->raiseIssue(
            $actor,
            $id,
            $validated['issue_kind'],
            $validated['description'],
            $validated['evidence_refs'] ?? []
        );

        return ApiResponse::success($issue, 201);
    }
}
