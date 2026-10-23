<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\HeldOrderFund;
use App\Models\SPayAccount;
use App\Models\SPayMovement;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SPayController extends Controller
{
    public function myAccount(Request $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor || !$actor->actorId) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $account = SPayAccount::firstOrCreate(
            ['owner_type' => 'CUSTOMER', 'owner_external_id' => $actor->actorId],
            [
                'currency' => 'IDR',
                'available_idr' => 0,
                'withdrawal_locked_idr' => 0,
                'account_status' => 'ACTIVE',
            ]
        );

        $available = (int) $account->available_idr;
        $canWithdraw = $available >= 20000;

        return ApiResponse::success([
            'account_id' => $account->id,
            'owner_type' => 'CUSTOMER',
            'owner_id' => $account->owner_external_id,
            'currency' => $account->currency,
            'available_idr' => $available,
            'withdrawal_locked_idr' => (int) $account->withdrawal_locked_idr,
            'minimum_withdrawal_idr' => 20000,
            'can_withdraw' => $canWithdraw,
            'source_label' => 'REFUND_ONLY',
            'is_wallet_payment_enabled' => false,
            'disclaimer' => 'S-Pay adalah catatan akuntansi pengembalian dana (refund) dan bukan dompet belanja.',
        ]);
    }

    public function myMovements(Request $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor || !$actor->actorId) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $account = SPayAccount::where('owner_type', 'CUSTOMER')
            ->where('owner_external_id' , $actor->actorId)
            ->first();

        if (!$account) {
            return ApiResponse::success([
                'data' => [],
                'total' => 0,
            ]);
        }

        $query = SPayMovement::where('spay_account_id', $account->id)->latest();

        if ($type = $request->query('movement_type')) {
            $query->where('movement_type', $type);
        }

        $movements = $query->paginate((int) $request->query('per_page', 15));

        return ApiResponse::success($movements);
    }

    public function organizationAccount(Request $request, string $orgId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        if (!$actor->isFinanceOps() && $actor->organizationId !== $orgId) {
            return ApiResponse::error('FORBIDDEN_ORGANIZATION_ACCESS', 'Anda tidak berhak mengakses keuangan organisasi ini.', 403);
        }

        $account = SPayAccount::firstOrCreate(
            ['owner_type' => 'MERCHANT_ORGANIZATION', 'owner_external_id' => $orgId],
            [
                'currency' => 'IDR',
                'available_idr' => 0,
                'withdrawal_locked_idr' => 0,
                'account_status' => 'ACTIVE',
            ]
        );

        $pendingHeld = (int) HeldOrderFund::whereHas('allocation', fn ($q) => $q->where('merchant_org_id', $orgId))
            ->where('status', 'HELD')
            ->sum('merchant_entitlement_idr');

        $available = (int) $account->available_idr;

        return ApiResponse::success([
            'account_id' => $account->id,
            'owner_type' => 'MERCHANT_ORGANIZATION',
            'organization_id' => $orgId,
            'currency' => $account->currency,
            'available_idr' => $available,
            'withdrawal_locked_idr' => (int) $account->withdrawal_locked_idr,
            'pending_held_idr' => $pendingHeld,
            'minimum_withdrawal_idr' => 20000,
            'can_withdraw' => $available >= 20000,
            'disclaimer' => 'Saldo S-Pay Merchant merupakan hasil pencairan penjualan produk setelah masa hold 120 jam.',
        ]);
    }

    public function organizationMovements(Request $request, string $orgId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        if (!$actor->isFinanceOps() && $actor->organizationId !== $orgId) {
            return ApiResponse::error('FORBIDDEN_ORGANIZATION_ACCESS', 'Anda tidak berhak mengakses keuangan organisasi ini.', 403);
        }

        $account = SPayAccount::where('owner_type', 'MERCHANT_ORGANIZATION')
            ->where('owner_external_id', $orgId)
            ->first();

        if (!$account) {
            return ApiResponse::success([
                'data' => [],
                'total' => 0,
            ]);
        }

        $query = SPayMovement::where('spay_account_id', $account->id)->latest();

        if ($type = $request->query('movement_type')) {
            $query->where('movement_type', $type);
        }

        $movements = $query->paginate((int) $request->query('per_page', 15));

        return ApiResponse::success($movements);
    }

    public function heldFunds(Request $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $orgId = $request->query('organization_id') ?: $actor->organizationId;

        if (!$actor->isFinanceOps()) {
            if (!$orgId || $orgId !== $actor->organizationId) {
                return ApiResponse::error('FORBIDDEN_ORGANIZATION_ACCESS', 'Anda tidak berhak mengakses data Dana Tertahan organisasi ini.', 403);
            }
        }

        $query = HeldOrderFund::with('allocation')->latest();

        if ($orgId) {
            $query->whereHas('allocation', fn ($q) => $q->where('merchant_org_id', $orgId));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $funds = $query->paginate((int) $request->query('per_page', 15));

        return ApiResponse::success($funds);
    }
}
