<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\AdminOrderResource;
use App\Models\ServiceOrder;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController
{
    public function index(Request $request): JsonResponse
    {
        $query = ServiceOrder::query()
            ->with([
                'booking.activeAssignment.attempt',
                'visit',
                'execution.evidences',
                'diagnosisVersions.workItems',
                'diagnosisVersions.partItems',
                'paymentObligations.attempts',
                'issues',
            ])
            ->orderBy('created_at', 'desc');

        if ($request->has('status') && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('phase') && $request->input('phase') !== 'ALL') {
            $query->where('phase', $request->input('phase'));
        }

        if ($request->has('provider_org_id')) {
            $query->where('provider_org_id', $request->input('provider_org_id'));
        }

        if ($request->has('q')) {
            $q = trim((string) $request->input('q'));
            $query->where(function ($w) use ($q) {
                $w->where('order_no', 'like', "%{$q}%")
                  ->orWhere('id', 'like', "%{$q}%")
                  ->orWhere('customer_id', 'like', "%{$q}%")
                  ->orWhere('provider_org_id', 'like', "%{$q}%");
            });
        }

        // Robust pagination validation: clamp strictly between 1 and 100 for admin
        $rawPerPage = $request->input('per_page', 20);
        if (!is_numeric($rawPerPage) || (int) $rawPerPage < 1) {
            $perPage = 20;
        } else {
            $perPage = min((int) $rawPerPage, 100);
        }

        $rawPage = $request->input('page', 1);
        $page = (!is_numeric($rawPage) || (int) $rawPage < 1) ? 1 : (int) $rawPage;

        $orders = $query->paginate(perPage: $perPage, page: $page);

        return ApiResponse::success(
            AdminOrderResource::collection($orders),
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
        $order = ServiceOrder::with([
            'booking.activeAssignment.attempt',
            'visit',
            'execution.evidences',
            'diagnosisVersions.workItems',
            'diagnosisVersions.partItems',
            'paymentObligations.attempts',
            'issues',
            'cancellation',
        ])
            ->where('id', $id)
            ->first();

        if (!$order) {
            return ApiResponse::error(
                'ORDER_JASA_NOT_FOUND',
                'Pesanan jasa tidak ditemukan.',
                404
            );
        }

        return ApiResponse::success(new AdminOrderResource($order));
    }

    public function aggregates(Request $request): JsonResponse
    {
        $totalOrders = ServiceOrder::count();
        $inProgress = ServiceOrder::whereNotIn('status', ['COMPLETED', 'CANCELLED'])->count();
        $completed = ServiceOrder::where('status', 'COMPLETED')->count();
        $cancelled = ServiceOrder::where('status', 'CANCELLED')->count();

        return ApiResponse::success([
            'total_orders' => $totalOrders,
            'active_in_progress' => $inProgress,
            'completed' => $completed,
            'cancelled' => $cancelled,
        ]);
    }

    public function resolveIssue(Request $request, string $id, \App\Services\OperationalIssueService $issueService): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'resolution_code' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $issue = $issueService->resolveIssue($actor, $id, $validated['resolution_code'], $validated['notes'] ?? null);

        return ApiResponse::success($issue, 200);
    }
}
