<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\FinanceServiceClientInterface;
use App\Http\Resources\ProviderOrderResource;
use App\Models\ServiceOrder;
use App\Services\ProviderDispatchService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProviderOrderController
{
    public function __construct(
        private readonly ProviderDispatchService $dispatchService,
        private readonly FinanceServiceClientInterface $financeClient,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $query = ServiceOrder::query()
            ->with([
                'booking.activeAssignment.attempt',
                'visit',
                'consents',
                'execution.evidences',
                'diagnosisVersions.workItems',
                'diagnosisVersions.partItems',
                'paymentObligations.attempts',
            ])
            ->where('provider_org_id', $actor->organizationId)
            ->orderBy('created_at', 'desc');

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
            ProviderOrderResource::collection($orders),
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

        // Scoped query: Provider can ONLY query orders assigned to their organization
        $query = ServiceOrder::with([
            'booking.activeAssignment.attempt',
            'visit',
            'consents',
            'execution.evidences',
            'diagnosisVersions.workItems',
            'diagnosisVersions.partItems',
            'paymentObligations.attempts',
            'issues',
        ])
            ->where('id', $id);

        if (!$actor->isAdmin()) {
            $query->where('provider_org_id', $actor->organizationId);
        }

        $order = $query->first();

        if (!$order) {
            return ApiResponse::error(
                'ORDER_JASA_NOT_FOUND',
                'Pesanan jasa tidak ditemukan.',
                404
            );
        }

        return ApiResponse::success(new ProviderOrderResource($order));
    }

    /**
     * Provider accept incoming booking order (Gate C)
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $order = ServiceOrder::with(['booking', 'paymentObligations'])->where('id', $id)->first();
        if (!$order) {
            return ApiResponse::error('ORDER_JASA_NOT_FOUND', 'Pesanan jasa tidak ditemukan.', 404);
        }

        if (!$actor->isAdmin() && $order->provider_org_id !== $actor->organizationId) {
            return ApiResponse::error('ORDER_JASA_FORBIDDEN', 'Akses ditolak. Pesanan bukan milik organisasi Anda.', 403);
        }

        if ($order->provider_decision_status === 'ACCEPTED') {
            return ApiResponse::success(
                new ProviderOrderResource($order->fresh(['booking.activeAssignment.attempt', 'visit', 'execution', 'diagnosisVersions', 'paymentObligations'])),
                200,
                ['message' => 'Pesanan sudah diterima sebelumnya.']
            );
        }

        if ($order->provider_decision_status === 'REJECTED' || in_array($order->status, ['CANCELLED', 'COMPLETED'])) {
            return ApiResponse::error('ORDER_JASA_INVALID_STATE', "Pesanan berstatus {$order->status} dan tidak dapat diterima.", 422);
        }

        $order->provider_decision_status = 'ACCEPTED';
        $order->provider_decision_at = now();
        $order->provider_decision_by = $actor->id;
        $order->save();

        $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
        \App\Support\DomainEventLogger::recordOrderEvent(
            orderId: $order->id,
            sequenceNo: $nextSeq,
            eventType: 'PROVIDER_ORDER_ACCEPTED',
            fromState: $order->status,
            toState: $order->status,
            actorId: $actor->id,
            actorType: $actor->role,
            metadata: ['provider_decision_status' => 'ACCEPTED']
        );

        \App\Support\DomainEventLogger::recordAuditLog(
            actor: "{$actor->role}:{$actor->id}",
            action: 'PROVIDER_ACCEPT_ORDER',
            resource: "ServiceOrder:{$order->id}",
            reason: "Mitra penyedia jasa menyetujui pesanan {$order->order_no}"
        );

        return ApiResponse::success(
            new ProviderOrderResource($order->fresh(['booking.activeAssignment.attempt', 'visit', 'execution', 'diagnosisVersions', 'paymentObligations'])),
            200,
            ['message' => 'Pesanan berhasil diterima. Silakan pilih dan tugaskan teknisi.']
        );
    }

    /**
     * Provider reject incoming booking order (Gate C & Section 50)
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:1000',
        ]);

        $order = ServiceOrder::with(['booking', 'paymentObligations'])->where('id', $id)->first();
        if (!$order) {
            return ApiResponse::error('ORDER_JASA_NOT_FOUND', 'Pesanan jasa tidak ditemukan.', 404);
        }

        if (!$actor->isAdmin() && $order->provider_org_id !== $actor->organizationId) {
            return ApiResponse::error('ORDER_JASA_FORBIDDEN', 'Akses ditolak. Pesanan bukan milik organisasi Anda.', 403);
        }

        if (in_array($order->status, ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'])) {
            return ApiResponse::error('ORDER_JASA_INVALID_STATE', "Pesanan dalam status {$order->status} tidak dapat ditolak.", 422);
        }

        $fromStatus = $order->status;
        $now = now();
        $order->provider_decision_status = 'REJECTED';
        $order->provider_decision_at = $now;
        $order->provider_decision_by = $actor->id;
        $order->provider_rejection_reason = $validated['reason'];
        $order->status = 'CANCELLED';
        $order->phase = 'CANCELLED';
        $order->cancelled_at = $now;
        $order->cancel_reason_code = 'PROVIDER_REJECTED';
        $order->save();

        if ($order->booking) {
            \App\Models\BookingActiveAssignment::where('booking_id', $order->booking->id)->delete();
        }

        // Check if diagnosis fee was paid -> auto 100% refund via Finance 06
        $diagPaid = $order->paymentObligations()
            ->where('purpose', 'DIAGNOSIS')
            ->where('state', 'PAID')
            ->first();

        $refundRef = null;
        if ($diagPaid && $diagPaid->principal_idr > 0) {
            try {
                $refundRes = $this->financeClient->processCancellationRefund(
                    orderId: $order->id,
                    amountIdr: (int) $diagPaid->principal_idr,
                    customerId: $order->customer_id,
                    reason: "Mitra penyedia jasa menolak reservasi: {$validated['reason']}"
                );
                $refundRef = $refundRes['refund_id'] ?? $refundRes['id'] ?? null;
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Finance refund on provider rejection failed: " . $e->getMessage());
            }
        }

        // Record in CancellationRecord
        \App\Models\CancellationRecord::where('order_id', $order->id)->delete();
        \App\Models\CancellationRecord::forceCreate([
            'id' => (string) \Illuminate\Support\Str::ulid(),
            'order_id' => $order->id,
            'cancelled_by_type' => 'PROVIDER',
            'cancelled_by_id' => $actor->id,
            'reason_code' => 'PROVIDER_REJECTED',
            'reason_text' => $validated['reason'],
            'status_at_cancel' => $fromStatus,
            'diagnosis_fulfilled' => false,
            'refund_eligibility_snapshot' => $diagPaid ? 'FULL' : 'NONE',
            'refund_finance_ref' => $refundRef,
            'cancelled_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
        \App\Support\DomainEventLogger::recordOrderEvent(
            orderId: $order->id,
            sequenceNo: $nextSeq,
            eventType: 'PROVIDER_ORDER_REJECTED',
            fromState: $fromStatus,
            toState: 'CANCELLED',
            actorId: $actor->id,
            actorType: $actor->role,
            metadata: [
                'provider_decision_status' => 'REJECTED',
                'reason' => $validated['reason'],
                'refund_triggered' => (bool) $diagPaid,
            ]
        );

        \App\Support\DomainEventLogger::recordAuditLog(
            actor: "{$actor->role}:{$actor->id}",
            action: 'PROVIDER_REJECT_ORDER',
            resource: "ServiceOrder:{$order->id}",
            reason: "Mitra penyedia jasa menolak pesanan {$order->order_no}: {$validated['reason']}"
        );

        return ApiResponse::success(
            new ProviderOrderResource($order->fresh(['booking.activeAssignment.attempt', 'visit', 'execution', 'diagnosisVersions', 'paymentObligations'])),
            200,
            ['message' => 'Pesanan telah ditolak dan dibatalkan.' . ($diagPaid ? ' Pengembalian dana 100% biaya survei/diagnosis telah diproses ke S-Pay pelanggan.' : '')]
        );
    }

    /**
     * Provider assign worker to order
     */
    public function assignWorker(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'worker_id' => 'required|string',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $attempt = $this->dispatchService->assignWorker($actor, $id, (string) $validated['worker_id']);

        return ApiResponse::success([
            'attempt_id' => $attempt->id,
            'booking_id' => $attempt->booking_id,
            'order_id' => $attempt->order_id,
            'worker_id' => $attempt->worker_id,
            'status' => $attempt->status,
            'assigned_at' => $attempt->assigned_at?->toISOString(),
            'response_due_at' => $attempt->response_due_at?->toISOString(),
            'message' => 'Teknisi berhasil ditugaskan. Menunggu respons teknisi (SLA 30 menit).',
        ], 200);
    }

    /**
     * Provider technician monthly work recap
     * Categories:
     * 1. Pengerjaan Selesai (COMPLETED orders)
     * 2. Diagnosis Selesai — Perbaikan Tidak Dilanjutkan (CANCELLED orders after valid diagnosis)
     */
    public function technicianRecap(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        if (!$actor->isProvider() && !$actor->isAdmin()) {
            return ApiResponse::error(
                'ORDER_JASA_FORBIDDEN',
                'Hanya mitra penyedia jasa (Provider) yang dapat mengakses rekap teknisi.',
                403
            );
        }

        $orgId = $actor->organizationId;
        if (!$orgId && $actor->isAdmin()) {
            $orgId = $request->input('organization_id') ?: $request->input('provider_org_id');
        }

        if (!$orgId) {
            return ApiResponse::error(
                'ORDER_JASA_PROVIDER_NO_ORGANIZATION',
                'Organisasi penyedia jasa tidak ditemukan.',
                400
            );
        }

        // Cross-organization authorization guard: Provider cannot view other orgs
        $requestedOrg = $request->input('organization_id') ?: $request->input('provider_org_id');
        if ($requestedOrg && !$actor->isAdmin() && $requestedOrg !== $orgId) {
            return ApiResponse::error(
                'ORDER_JASA_FORBIDDEN_ORGANIZATION',
                'Anda tidak berwenang mengakses rekap organisasi lain.',
                403
            );
        }

        $tz = new \DateTimeZone('Asia/Jakarta');
        $now = Carbon::now($tz);
        $month = (int) $request->input('month', $now->month);
        $year = (int) $request->input('year', $now->year);

        // Clamp month 1 - 12
        if ($month < 1 || $month > 12) {
            $month = (int) $now->month;
        }
        if ($year < 2020 || $year > 2050) {
            $year = (int) $now->year;
        }

        $startUtc = Carbon::create($year, $month, 1, 0, 0, 0, $tz)->startOfMonth()->setTimezone('UTC');
        $endUtc = Carbon::create($year, $month, 1, 0, 0, 0, $tz)->endOfMonth()->setTimezone('UTC');

        // 1. Fetch organization technicians from Identity or fallback
        $workers = $this->resolveProviderTechnicians((string) $orgId);

        // 2. Fetch completed orders for this month
        $completedOrders = ServiceOrder::query()
            ->with([
                'booking.activeAssignment.attempt',
                'visit',
                'execution',
                'diagnosisVersions.workItems',
                'diagnosisVersions.partItems',
                'paymentObligations',
            ])
            ->where('provider_org_id', $orgId)
            ->where('status', 'COMPLETED')
            ->whereBetween('completed_at', [$startUtc, $endUtc])
            ->get();

        // 3. Fetch cancelled orders with completed diagnosis
        $cancelledOrders = ServiceOrder::query()
            ->with([
                'booking.activeAssignment.attempt',
                'visit',
                'diagnosisVersions',
                'paymentObligations',
                'cancellation',
            ])
            ->where('provider_org_id', $orgId)
            ->where('status', 'CANCELLED')
            ->whereBetween('cancelled_at', [$startUtc, $endUtc])
            ->get();

        // Build worker stats map
        $workerStats = [];
        foreach ($workers as $w) {
            $wId = (string) $w['worker_id'];
            $workerStats[$wId] = [
                'worker_id' => $wId,
                'name' => $w['name'] ?? 'Teknisi',
                'employee_id' => $w['employee_id'] ?? null,
                'photo_url' => $w['photo_url'] ?? null,
                'completed_count' => 0,
                'diagnosis_only_count' => 0,
                'total_activities' => 0,
                'total_work_value' => 0,
                'orders' => [],
            ];
        }

        // Process Category A: Pengerjaan Selesai
        foreach ($completedOrders as $order) {
            $workerId = $order->execution?->worker_id
                ?: $order->booking?->activeAssignment?->worker_id
                ?: $order->booking?->activeAssignment?->attempt?->worker_id;

            if (!$workerId) {
                continue;
            }

            if (!isset($workerStats[$workerId])) {
                $workerStats[$workerId] = [
                    'worker_id' => $workerId,
                    'name' => $order->booking?->activeAssignment?->attempt?->worker_name ?? 'Teknisi Bertugas',
                    'employee_id' => null,
                    'photo_url' => null,
                    'completed_count' => 0,
                    'diagnosis_only_count' => 0,
                    'total_activities' => 0,
                    'total_work_value' => 0,
                    'orders' => [],
                ];
            }

            $diag = $order->diagnosisVersions->sortByDesc('version_no')->first();
            $workSubtotal = (int) ($diag?->work_subtotal_idr ?? 0);
            $partsSubtotal = (int) ($diag?->provider_part_subtotal_idr ?? 0);
            $diagFee = (int) ($order->diagnosis_fee_idr ?? 0);
            $orderValue = $diagFee + $workSubtotal + $partsSubtotal;

            $completionDate = $order->completed_at 
                ? Carbon::parse($order->completed_at)->setTimezone($tz)->format('Y-m-d H:i')
                : '-';

            $serviceTitle = $order->service_snapshot['title'] ?? $order->service_snapshot['name'] ?? 'Layanan Servis Jasa';

            $workerStats[$workerId]['completed_count']++;
            $workerStats[$workerId]['total_activities']++;
            $workerStats[$workerId]['total_work_value'] += $orderValue;
            $workerStats[$workerId]['orders'][] = [
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'service_title' => $serviceTitle,
                'completion_date' => $completionDate,
                'activity_type' => 'EXECUTION_COMPLETED',
                'activity_label' => 'Pengerjaan Selesai',
                'status' => 'COMPLETED',
                'order_value' => $orderValue,
                'diagnosis_fee' => $diagFee,
                'labor_fee' => $workSubtotal,
                'parts_fee' => $partsSubtotal,
            ];
        }

        // Process Category B: Diagnosis Selesai — Order Batal
        foreach ($cancelledOrders as $order) {
            $hasDiagnosis = $order->diagnosisVersions->isNotEmpty() || ($order->cancellation?->diagnosis_fulfilled);
            if (!$hasDiagnosis) {
                // Cancelled BEFORE diagnosis -> Exclude!
                continue;
            }

            // Must not be FULL_REFUND
            $cancellation = $order->cancellation;
            $refundVal = $cancellation?->refund_eligibility_snapshot;
            $isFullRefund = false;
            if (is_string($refundVal)) {
                $isFullRefund = ($refundVal === 'FULL_REFUND' || stripos($refundVal, '"FULL_REFUND"') !== false);
            } elseif (is_array($refundVal)) {
                $isFullRefund = (($refundVal['refund_type'] ?? null) === 'FULL_REFUND');
            }

            if ($isFullRefund) {
                // Diagnosis was refunded -> Exclude from earned recap
                continue;
            }

            $workerId = $order->booking?->activeAssignment?->worker_id
                ?: $order->booking?->activeAssignment?->attempt?->worker_id
                ?: $order->visit?->worker_id;

            if (!$workerId) {
                continue;
            }

            if (!isset($workerStats[$workerId])) {
                $workerStats[$workerId] = [
                    'worker_id' => $workerId,
                    'name' => $order->booking?->activeAssignment?->attempt?->worker_name ?? 'Teknisi Bertugas',
                    'employee_id' => null,
                    'photo_url' => null,
                    'completed_count' => 0,
                    'diagnosis_only_count' => 0,
                    'total_activities' => 0,
                    'total_work_value' => 0,
                    'orders' => [],
                ];
            }

            $diagFee = (int) ($order->diagnosis_fee_idr ?? 0);
            $completionDate = $order->cancelled_at 
                ? Carbon::parse($order->cancelled_at)->setTimezone($tz)->format('Y-m-d H:i')
                : '-';

            $serviceTitle = $order->service_snapshot['title'] ?? $order->service_snapshot['name'] ?? 'Layanan Servis Jasa';

            $workerStats[$workerId]['diagnosis_only_count']++;
            $workerStats[$workerId]['total_activities']++;
            $workerStats[$workerId]['total_work_value'] += $diagFee;
            $workerStats[$workerId]['orders'][] = [
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'service_title' => $serviceTitle,
                'completion_date' => $completionDate,
                'activity_type' => 'DIAGNOSIS_ONLY_COMPLETED',
                'activity_label' => 'Diagnosis Selesai — Perbaikan Tidak Dilanjutkan',
                'status' => 'CANCELLED',
                'order_value' => $diagFee,
                'diagnosis_fee' => $diagFee,
                'labor_fee' => 0,
                'parts_fee' => 0,
            ];
        }

        // Search filter if provided
        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $workerStats = array_filter($workerStats, function ($w) use ($search) {
                return stripos($w['name'], $search) !== false || stripos((string) ($w['employee_id'] ?? ''), $search) !== false;
            });
        }

        $technicianList = array_values($workerStats);

        // Overall summary totals
        $totalCompleted = array_sum(array_column($technicianList, 'completed_count'));
        $totalDiagOnly = array_sum(array_column($technicianList, 'diagnosis_only_count'));
        $totalActivities = array_sum(array_column($technicianList, 'total_activities'));
        $totalWorkValue = array_sum(array_column($technicianList, 'total_work_value'));

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        return ApiResponse::success([
            'period' => [
                'month' => $month,
                'year' => $year,
                'month_name' => $monthNames[$month] ?? 'Bulan ' . $month,
                'timezone' => 'Asia/Jakarta',
            ],
            'organization' => [
                'id' => $orgId,
            ],
            'summary' => [
                'total_technicians' => count($technicianList),
                'total_completed_count' => $totalCompleted,
                'total_diagnosis_only_count' => $totalDiagOnly,
                'total_activities' => $totalActivities,
                'total_work_value' => $totalWorkValue,
            ],
            'technicians' => $technicianList,
        ]);
    }

    /**
     * Resolve provider technicians with graceful fallback
     */
    private function resolveProviderTechnicians(string $orgId): array
    {
        try {
            $rows = DB::table('servio_identity_db.memberships as m')
                ->join('servio_identity_db.users as u', 'm.user_id', '=', 'u.id')
                ->leftJoin('servio_identity_db.user_profiles as p', 'u.id', '=', 'p.user_id')
                ->where('m.organization_id', $orgId)
                ->where('m.kind', 'WORKER')
                ->select([
                    'm.user_id as worker_id',
                    'p.display_name',
                    'p.legal_name',
                    'u.email',
                    'p.photo_path',
                    'p.employee_id',
                ])
                ->get();

            if ($rows->isNotEmpty()) {
                return $rows->map(fn ($r) => [
                    'worker_id' => (string) $r->worker_id,
                    'name' => $r->display_name ?: ($r->legal_name ?: ($r->email ?: 'Teknisi')),
                    'employee_id' => $r->employee_id,
                    'photo_url' => $r->photo_path,
                ])->toArray();
            }
        } catch (\Throwable $e) {
            // In unit tests with SQLite or isolated DBs, fallback smoothly
        }

        // Fallback: collect known workers from worker_assignment_attempts or active assignments
        try {
            $workerIds = DB::table('worker_assignment_attempts as waa')
                ->join('service_orders as so', 'waa.order_id', '=', 'so.id')
                ->where('so.provider_org_id', $orgId)
                ->pluck('waa.worker_id')
                ->unique()
                ->filter();

            return $workerIds->map(fn ($id) => [
                'worker_id' => (string) $id,
                'name' => 'Teknisi ' . substr((string) $id, 0, 8),
                'employee_id' => null,
                'photo_url' => null,
            ])->values()->toArray();
        } catch (\Throwable $e) {
            return [];
        }
    }
}
