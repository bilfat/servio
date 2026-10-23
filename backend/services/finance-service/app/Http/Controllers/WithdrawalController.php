<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Finance\Withdrawals\WithdrawalService;
use App\Http\Requests\CreateWithdrawalRequest;
use App\Http\Requests\WithdrawalQuoteRequest;
use App\Models\BankDestination;
use App\Models\SPayAccount;
use App\Models\WithdrawalRequest;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WithdrawalController extends Controller
{
    public function __construct(
        private readonly WithdrawalService $withdrawalService,
    ) {}

    public function quote(WithdrawalQuoteRequest $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $data = $request->validated();
        $ownerType = $data['owner_type'];
        $ownerId = $ownerType === 'MERCHANT_ORGANIZATION'
            ? ($data['owner_id'] ?? $actor->organizationId)
            : $actor->actorId;

        if (!$ownerId) {
            return ApiResponse::error('FORBIDDEN', 'Konteks penarik dana tidak valid.', 403);
        }

        $authError = $this->checkWithdrawalAuthorization($actor, $ownerType, (string) $ownerId);
        if ($authError) {
            return $authError;
        }

        $quote = $this->withdrawalService->quoteWithdrawal(
            ownerType: $ownerType,
            ownerExternalId: (string) $ownerId,
            amountIdr: (int) $data['amount_idr'],
            bankDestinationId: $data['bank_destination_id']
        );

        return ApiResponse::success($quote, 'Kutipan penarikan dana berhasil dibuat.');
    }

    public function store(CreateWithdrawalRequest $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $data = $request->validated();
        $quote = Cache::get("finance_quote_{$data['quote_id']}");
        if (!$quote) {
            return ApiResponse::error('QUOTE_EXPIRED', 'Penawaran pencairan (quote) telah kedaluwarsa atau tidak valid.', 410);
        }

        $ownerType = $quote['owner_type'];
        $ownerId = (string) $quote['owner_external_id'];

        // Strict authorization check at submit time (catches revoked permissions / inactive memberships post-quote)
        $authError = $this->checkWithdrawalAuthorization($actor, $ownerType, $ownerId);
        if ($authError) {
            return $authError;
        }

        $withdrawal = $this->withdrawalService->createWithdrawal(
            actorUserId: $actor->actorId ?? 'SYSTEM',
            ownerType: $ownerType,
            ownerExternalId: $ownerId,
            quoteId: $data['quote_id'],
            bankDestinationId: $data['bank_destination_id'],
            stepUpReference: $data['step_up_reference'] ?? null
        );

        $account = SPayAccount::find($withdrawal->spay_account_id);

        return ApiResponse::success([
            'withdrawal_id' => $withdrawal->id,
            'status' => $withdrawal->status,
            'requested_amount_idr' => $withdrawal->requested_amount_idr,
            'transfer_fee_idr' => $withdrawal->transfer_fee_idr,
            'net_to_bank_idr' => $withdrawal->net_to_bank_idr,
            'locked_amount_idr' => $withdrawal->requested_amount_idr,
            'remaining_available_idr' => (int) ($account?->available_idr ?? 0),
            'mode' => 'MOCK',
            'disclaimer' => 'Permintaan penarikan dana tercatat dalam mode simulasi MOCK.',
        ], 'Permintaan penarikan dana berhasil diajukan.', 201);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $query = WithdrawalRequest::query()->with('bankDestination', 'spayAccount')->latest();

        $ownerType = $request->query('owner_type');
        $ownerId = $request->query('owner_id');

        if ($actor->isFinanceOps()) {
            if ($ownerType && $ownerId) {
                $query->whereHas('spayAccount', fn ($q) => $q->where('owner_type', $ownerType)->where('owner_external_id', $ownerId));
            }
        } elseif ($actor->isMerchant() && $actor->organizationId) {
            $query->whereHas('spayAccount', fn ($q) => $q->where('owner_type', 'MERCHANT_ORGANIZATION')->where('owner_external_id', $actor->organizationId));
        } else {
            $query->whereHas('spayAccount', fn ($q) => $q->where('owner_type', 'CUSTOMER')->where('owner_external_id', $actor->actorId));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $withdrawals = $query->paginate((int) $request->query('per_page', 15));

        return ApiResponse::success($withdrawals);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $withdrawal = WithdrawalRequest::with(['bankDestination', 'spayAccount'])->find($id);
        if (!$withdrawal) {
            return ApiResponse::error('WITHDRAWAL_NOT_FOUND', 'Permintaan penarikan dana tidak ditemukan.', 404);
        }

        $account = $withdrawal->spayAccount;
        if (!$actor->isFinanceOps()) {
            if ($account && $account->owner_type === 'CUSTOMER' && $account->owner_external_id !== $actor->actorId) {
                return ApiResponse::error('FORBIDDEN', 'Bukan pemilik penarikan dana.', 403);
            }
            if ($account && $account->owner_type === 'MERCHANT_ORGANIZATION' && $account->owner_external_id !== $actor->organizationId) {
                return ApiResponse::error('FORBIDDEN', 'Bukan anggota organisasi pemilik penarikan dana.', 403);
            }
        }

        return ApiResponse::success($withdrawal);
    }

    /**
     * Reusable authorization check for withdrawal operations (Quote & Submit).
     */
    private function checkWithdrawalAuthorization(AuthenticatedActor $actor, string $ownerType, string $ownerExternalId): ?JsonResponse
    {
        // 1. Finance Ops or Admin cannot withdraw merchant/customer money
        if ($actor->isFinanceOps() || $actor->isAdmin()) {
            return ApiResponse::error(
                'FORBIDDEN_OPERATIONS_WITHDRAWAL',
                'Staf operasional (Finance Ops/Admin) tidak diizinkan mencairkan saldo Merchant atau Customer.',
                403
            );
        }

        // 2. Organization withdrawal
        if ($ownerType === 'MERCHANT_ORGANIZATION') {
            if (empty($actor->organizationId) || $actor->organizationId !== $ownerExternalId) {
                return ApiResponse::error(
                    'FORBIDDEN_ORGANIZATION_ACCESS',
                    'Anda tidak berhak mengakses atau mencairkan dana organisasi ini.',
                    403
                );
            }

            if (!$actor->organizationIsActive) {
                return ApiResponse::error(
                    'INACTIVE_ORGANIZATION',
                    'Organisasi sedang tidak aktif.',
                    403
                );
            }

            if (!$actor->membershipIsActive) {
                return ApiResponse::error(
                    'INACTIVE_MEMBERSHIP',
                    'Keanggotaan organisasi Anda sedang tidak aktif.',
                    403
                );
            }

            $hasWithdrawPermission = $actor->isCeo()
                || $actor->hasPermission('finance.spay.withdraw_organization')
                || $actor->hasPermission('finance.withdrawal.create');

            if (!$hasWithdrawPermission) {
                return ApiResponse::error(
                    'FORBIDDEN_PERMISSION_REQUIRED',
                    'Anda tidak memiliki izin (permission finance.spay.withdraw_organization) untuk mencairkan saldo organisasi.',
                    403
                );
            }
        } elseif ($ownerType === 'CUSTOMER') {
            if ($actor->actorId !== $ownerExternalId) {
                return ApiResponse::error(
                    'FORBIDDEN',
                    'Konteks penarik dana tidak cocok dengan akun S-Pay.',
                    403
                );
            }

            $hasWithdrawPermission = $actor->isCustomer()
                || $actor->isCeo()
                || $actor->hasPermission('finance.spay.withdraw_self');

            if (!$hasWithdrawPermission) {
                return ApiResponse::error(
                    'FORBIDDEN_PERMISSION_REQUIRED',
                    'Anda tidak memiliki izin untuk mencairkan saldo pribadi.',
                    403
                );
            }
        } else {
            return ApiResponse::error('INVALID_OWNER_TYPE', 'Jenis pemilik akun (owner_type) tidak valid.', 422);
        }

        return null;
    }
}
