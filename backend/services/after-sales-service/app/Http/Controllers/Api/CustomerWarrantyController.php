<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Warranties\WarrantyService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerWarrantyController
{
    public function __construct(
        private readonly WarrantyService $warrantyService
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        if ($actor && $actor->id) {
            $this->warrantyService->syncCustomerCompletedOrders($actor->id);
        }

        $state = $request->query('state'); // active, expired
        $type = $request->query('type'); // goods, service
        $perPage = (int) $request->query('per_page', 15);

        $paginator = $this->warrantyService->listCustomerEntitlements($actor->id, $state, $type, $perPage);

        $transformedItems = collect($paginator->items())->map(function ($entitlement) {
            return $this->transformEntitlement($entitlement);
        })->all();

        return ApiResponse::success($transformedItems, 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        if ($actor && $actor->id) {
            $this->warrantyService->syncCustomerCompletedOrders($actor->id);
        }

        $activeCount = \App\Models\OrderWarrantyEntitlement::where('customer_id', $actor->id)
            ->where('status', 'ACTIVE')
            ->whereRaw('(quantity - COALESCE(claimed_quantity, 0)) > 0')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->count();

        $expiredCount = \App\Models\OrderWarrantyEntitlement::where('customer_id', $actor->id)
            ->where(function ($q) {
                $q->where('status', 'EXPIRED')
                    ->orWhere(function ($sub) {
                        $sub->whereIn('status', ['ACTIVE', 'CLAIM_LOCKED'])
                            ->whereRaw('(quantity - COALESCE(claimed_quantity, 0)) > 0')
                            ->whereNotNull('expires_at')
                            ->where('expires_at', '<', now());
                    });
            })
            ->count();

        $activeCasesCount = \App\Models\AfterSalesCase::where('customer_id', $actor->id)
            ->whereIn('main_status', ['SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'IN_RESOLUTION'])
            ->count();

        $actionRequiredCount = \App\Models\AfterSalesCase::where('customer_id', $actor->id)
            ->where(function ($q) {
                $q->whereIn('substate', ['AWAITING_CUSTOMER_INFO', 'AWAITING_CUSTOMER_CONSENT'])
                    ->orWhere('response_state', 'OVERDUE');
            })
            ->count();

        return ApiResponse::success([
            'active_warranties_count' => $activeCount,
            'expired_warranties_count' => $expiredCount,
            'active_cases_count' => $activeCasesCount,
            'action_required_count' => $actionRequiredCount,
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $entitlement = $this->warrantyService->getCustomerEntitlementDetail($id, $actor->id);

        if (!$entitlement) {
            return ApiResponse::error(
                'AFTER_SALES_WARRANTY_NOT_FOUND',
                'Hak garansi tidak ditemukan atau bukan milik akun Anda.',
                404
            );
        }

        return ApiResponse::success($this->transformEntitlement($entitlement));
    }

    private function transformEntitlement($entitlement): array
    {
        $now = now();
        $expiresAt = $entitlement->expires_at;
        $isNotExpired = $expiresAt ? $now->lte($expiresAt) : true;
        $remainingDays = ($expiresAt && $isNotExpired) ? max(0, (int) $now->diffInDays($expiresAt, false)) : 0;

        $cases = $entitlement->cases ?? collect();
        $latestCase = $cases->sortByDesc('created_at')->first();
        $activeCase = $cases->first(function ($c) {
            return in_array($c->main_status, ['SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'IN_RESOLUTION'], true);
        });

        $quantity = (int) ($entitlement->quantity ?: 1);
        $claimedQty = (int) ($entitlement->claimed_quantity ?? 0);
        $remainingQty = max(0, $quantity - $claimedQty);

        $hasActiveCase = $activeCase !== null;
        $isClaimEligible = ($entitlement->status === 'ACTIVE') && $isNotExpired && ($remainingQty > 0) && !$hasActiveCase;
        $isActive = ($entitlement->status === 'ACTIVE') && $isNotExpired && ($remainingQty > 0);

        $catalogSnap = is_array($entitlement->catalog_snapshot)
            ? $entitlement->catalog_snapshot
            : (json_decode((string) ($entitlement->catalog_snapshot ?? ''), true) ?: []);

        $resolvedItemTitle = $entitlement->item_title;
        if (!$resolvedItemTitle || $resolvedItemTitle === $entitlement->snapshot_name) {
            $resolvedItemTitle = $catalogSnap['name'] ?? $catalogSnap['title'] ?? $catalogSnap['product_snapshot']['name'] ?? $entitlement->item_title ?: $entitlement->snapshot_name;
        }

        $orgMap = [
            '0c1467e7-af68-4b26-ae84-daa41d51aed0' => 'Sinar AC & Sparepart Glodok (BUDIAJASA)',
            '0740d857-b665-4191-aaf5-d7dd3611dc1d' => 'PT Servio Mandiri Teknik',
            'org-merch-jaya-motor' => 'Jaya Motor Official',
            'org-prov-surya-teknik' => 'Surya Teknik AC & Listrik',
        ];

        $resolvedOrgName = $entitlement->organization_name;
        if (!$resolvedOrgName || preg_match('/^[0-9a-f-]{36}$/i', (string) $resolvedOrgName)) {
            try {
                $dbProfile = \Illuminate\Support\Facades\DB::table('servio_identity_db.organization_profiles')
                    ->where('organization_id', $entitlement->owner_org_id)
                    ->first();
                if ($dbProfile && !empty($dbProfile->display_name)) {
                    $resolvedOrgName = $dbProfile->display_name;
                }
            } catch (\Throwable $e) {}
            if (!$resolvedOrgName || preg_match('/^[0-9a-f-]{36}$/i', (string) $resolvedOrgName)) {
                $resolvedOrgName = $orgMap[$entitlement->owner_org_id] ?? ($entitlement->organization_name ?: $entitlement->owner_org_id);
            }
        }

        return [
            'id' => $entitlement->id,
            'source_kind' => $entitlement->source_kind,
            'order_id' => $entitlement->order_id,
            'merchant_order_id' => $entitlement->merchant_order_id,
            'order_number' => $entitlement->order_number ?: ($entitlement->merchant_order_id ?: $entitlement->order_id),
            'order_item_key' => $entitlement->order_item_key,
            'customer_id' => $entitlement->customer_id,
            'owner_org_type' => $entitlement->owner_org_type,
            'owner_org_id' => $entitlement->owner_org_id,
            'organization_name' => $resolvedOrgName,
            'catalog_ref' => $entitlement->catalog_ref,
            'item_title' => $resolvedItemTitle,
            'item_image_url' => $entitlement->item_image_url,
            'warranty_option_version_id' => $entitlement->warranty_option_version_id,
            'snapshot_name' => $entitlement->snapshot_name,
            'snapshot_duration_days' => (int) $entitlement->snapshot_duration_days,
            'snapshot_coverage' => $entitlement->snapshot_coverage,
            'snapshot_exclusion' => $entitlement->snapshot_exclusion,
            'catalog_snapshot' => $entitlement->catalog_snapshot,
            'quantity' => $quantity,
            'claimed_quantity' => $claimedQty,
            'remaining_quantity' => $remainingQty,
            'status' => $entitlement->status,
            'is_active' => $isActive,
            'ordered_at' => $entitlement->ordered_at?->toIso8601String(),
            'source_completed_at' => $entitlement->source_completed_at?->toIso8601String(),
            'starts_at' => $entitlement->starts_at?->toIso8601String(),
            'expires_at' => $entitlement->expires_at?->toIso8601String(),
            'remaining_days' => $remainingDays,
            'has_active_case' => $hasActiveCase,
            'active_case_id' => $activeCase?->id,
            'active_case_status' => $activeCase?->main_status,
            'latest_case' => $latestCase ? [
                'id' => $latestCase->id,
                'case_number' => $latestCase->case_number,
                'main_status' => $latestCase->main_status,
                'created_at' => $latestCase->created_at?->toIso8601String(),
            ] : null,
            'is_claim_eligible' => $isClaimEligible,
            'cases' => $cases->map(function ($c) {
                return [
                    'id' => $c->id,
                    'case_number' => $c->case_number,
                    'case_type' => $c->case_type,
                    'main_status' => $c->main_status,
                    'special_condition' => $c->special_condition,
                    'customer_requested_solution' => $c->customer_requested_solution,
                    'approved_solution' => $c->approved_solution,
                    'issue_reason' => $c->issue_reason,
                    'issue_description' => $c->issue_description,
                    'rejection_reason' => $c->rejection_reason,
                    'submitted_at' => $c->submitted_at?->toIso8601String() ?: $c->created_at?->toIso8601String(),
                    'sla_deadline_at' => $c->sla_deadline_at?->toIso8601String(),
                    'created_at' => $c->created_at?->toIso8601String(),
                ];
            })->values()->all(),
        ];
    }
}

