<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Finance\Policies\FeePolicyService;
use App\Http\Requests\CreateFeePolicyRequest;
use App\Http\Requests\CreateRevisionFeePolicyRequest;
use App\Http\Requests\PublishFeePolicyRequest;
use App\Models\TaxRuleReference;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeePolicyController extends Controller
{
    public function __construct(
        private readonly FeePolicyService $policyService,
    ) {}

    public function store(CreateFeePolicyRequest $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $data = $request->validated();

        $result = $this->policyService->createPolicy(
            data: $data,
            actorUserId: $actor?->actorId ?? 'SYSTEM'
        );

        return ApiResponse::success([
            'group_id' => $result['group_id'],
            'version_id' => $result['version_id'],
            'version_no' => $result['version_no'],
            'status' => $result['status'],
            'targets_count' => $result['targets_count'],
        ], 'Draft kebijakan biaya berhasil dibuat.', 201);
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $scope = $request->query('scope');
        $search = $request->query('search');
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 20);

        $result = $this->policyService->listPolicies($status, $scope, $search, $page, $perPage);

        return ApiResponse::success($result);
    }

    public function show(string $groupId): JsonResponse
    {
        $group = $this->policyService->getPolicy($groupId);

        return ApiResponse::success($group);
    }

    public function updateGroup(Request $request, string $groupId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $group = $this->policyService->updateGroup(
            groupId: $groupId,
            data: $validated,
            actorUserId: $actor?->actorId ?? 'SYSTEM'
        );

        return ApiResponse::success($group, 'Nama aturan biaya berhasil diperbarui.');
    }

    public function publish(PublishFeePolicyRequest $request, string $groupId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $data = $request->validated();

        $group = $this->policyService->getPolicy($groupId);

        $versionId = $data['version_id'] ?? null;
        if (!$versionId) {
            $draft = $group->versions()->where('status', 'DRAFT')->latest('version_no')->first();
            $versionId = $draft?->id;
        }

        if (!$versionId) {
            return ApiResponse::error('NO_DRAFT_VERSION_FOUND', 'Tidak ada versi draft yang dapat dipublikasikan.', 404);
        }

        $effectiveFrom = $data['effective_from'] ?? null;

        $published = $this->policyService->publishVersion(
            versionId: $versionId,
            effectiveFrom: $effectiveFrom,
            reason: 'Publikasi oleh CEO',
            actorUserId: $actor?->actorId ?? 'SYSTEM'
        );

        return ApiResponse::success([
            'group_id' => $published->group_id,
            'version_id' => $published->id,
            'version_no' => $published->version_no,
            'status' => $published->status,
            'effective_from' => $published->effective_from?->toIso8601String(),
        ], 'Kebijakan biaya berhasil dipublikasikan.');
    }

    public function createRevision(CreateRevisionFeePolicyRequest $request, string $groupId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $data = $request->validated();

        $result = $this->policyService->createRevision(
            groupId: $groupId,
            data: $data,
            actorUserId: $actor?->actorId ?? 'SYSTEM'
        );

        return ApiResponse::success([
            'group_id' => $result['group_id'],
            'version_id' => $result['version_id'],
            'version_no' => $result['version_no'],
            'status' => $result['status'],
            'targets_count' => $result['targets_count'],
        ], 'Revisi draft kebijakan biaya berhasil dibuat.', 201);
    }

    public function taxReferences(Request $request): JsonResponse
    {
        $rules = TaxRuleReference::where('status', 'ACTIVE')->get();

        return ApiResponse::success($rules);
    }

    public function activeCustomerFee(Request $request): JsonResponse
    {
        $now = now();

        $activeVersions = \App\Models\FeePolicyVersion::where('status', 'ACTIVE')
            ->where(function ($query) use ($now) {
                $query->whereNull('effective_from')->orWhere('effective_from', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('effective_until')->orWhere('effective_until', '>', $now);
            })
            ->with(['targets', 'group'])
            ->orderByDesc('effective_from')
            ->get();

        $customerTarget = null;
        $policyGroup = null;
        $policyVersion = null;

        foreach ($activeVersions as $version) {
            foreach ($version->targets as $target) {
                if ($target->policy_code === 'CUSTOMER_PRODUCT_APP_FEE' && $target->payer_type === 'CUSTOMER') {
                    $customerTarget = $target;
                    $policyGroup = $version->group;
                    $policyVersion = $version;
                    break 2;
                }
            }
        }

        if (!$customerTarget) {
            return ApiResponse::success([
                'has_active_policy' => false,
                'policy_name' => 'Bebas Biaya',
                'policy_slug' => null,
                'version_no' => null,
                'policy_code' => 'CUSTOMER_PRODUCT_APP_FEE',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 0,
                'percentage_rate' => null,
                'charge_scope' => 'CHECKOUT',
                'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                'display_amount' => 0,
                'display_label' => 'Bebas Biaya',
            ]);
        }

        return ApiResponse::success([
            'has_active_policy' => true,
            'policy_name' => $policyGroup?->display_name ?? 'Biaya Layanan Aplikasi',
            'policy_slug' => $policyGroup?->slug,
            'version_no' => $policyVersion?->version_no,
            'policy_code' => 'CUSTOMER_PRODUCT_APP_FEE',
            'fee_type' => $customerTarget->fee_type,
            'fixed_amount_idr' => $customerTarget->fixed_amount_idr ? (int) $customerTarget->fixed_amount_idr : 0,
            'percentage_rate' => $customerTarget->percentage_rate ? (float) $customerTarget->percentage_rate : null,
            'charge_scope' => $customerTarget->charge_scope,
            'calculation_base' => $customerTarget->calculation_base,
            'display_amount' => $customerTarget->fee_type === 'FIXED' ? (int) $customerTarget->fixed_amount_idr : null,
            'display_label' => $policyGroup?->display_name ?? 'Biaya Layanan Aplikasi',
        ]);
    }

    public function revenueOverview(Request $request): JsonResponse
    {
        $appFeeCollected = (int) DB::table('payment_allocations')
            ->join('payment_intents', 'payment_allocations.finance_checkout_id', '=', 'payment_intents.finance_checkout_id')
            ->where('payment_intents.status', 'PAID')
            ->sum('payment_allocations.app_fee_allocated_idr');

        $commissionCollected = (int) DB::table('payment_allocations')
            ->join('payment_intents', 'payment_allocations.finance_checkout_id', '=', 'payment_intents.finance_checkout_id')
            ->where('payment_intents.status', 'PAID')
            ->sum('payment_allocations.merchant_commission_idr');

        $paymentVolume = (int) DB::table('payment_intents')
            ->where('status', 'PAID')
            ->sum('amount_idr');

        $heldLiability = (int) DB::table('held_order_funds')
            ->where('status', 'HELD')
            ->sum('merchant_entitlement_idr');

        $merchantPayable = (int) DB::table('spay_accounts')
            ->where('owner_type', 'MERCHANT_ORGANIZATION')
            ->sum('available_idr');

        $customerRefundBalance = (int) DB::table('spay_accounts')
            ->where('owner_type', 'CUSTOMER')
            ->sum('available_idr');

        return ApiResponse::success([
            'customer_product_app_fee_idr' => $appFeeCollected,
            'merchant_product_commission_idr' => $commissionCollected,
            'total_collected_fee_idr' => $appFeeCollected + $commissionCollected,
            'mock_payment_volume_idr' => $paymentVolume,
            'held_liability_idr' => $heldLiability,
            'merchant_payable_idr' => $merchantPayable,
            'customer_refund_liability_idr' => $customerRefundBalance,
            'provider_service_fee' => 'NOT_IMPLEMENTED',
            'accounting_status' => 'PENDING_ACCOUNTING_POLICY',
            'note' => 'Pendapatan riil diakui setelah kepatuhan audit PSAK/kebijakan akuntansi SERVIO disahkan.',
        ]);
    }
}
