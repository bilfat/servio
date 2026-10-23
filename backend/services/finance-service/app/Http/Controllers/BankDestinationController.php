<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\AddBankDestinationRequest;
use App\Models\BankDestination;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankDestinationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $query = BankDestination::query()->latest();

        $orgId = $request->query('organization_id');

        if ($orgId) {
            if (!$actor->isFinanceOps() && $actor->organizationId !== $orgId) {
                return ApiResponse::error('FORBIDDEN_ORGANIZATION_ACCESS', 'Anda tidak memiliki akses ke rekening organisasi ini.', 403);
            }
            $query->where('owner_type', 'MERCHANT_ORGANIZATION')->where('owner_external_id', $orgId);
        } else {
            if ($actor->isMerchant() && $actor->organizationId) {
                $query->where('owner_type', 'MERCHANT_ORGANIZATION')->where('owner_external_id', $actor->organizationId);
            } else {
                $query->where('owner_type', 'CUSTOMER')->where('owner_external_id', $actor->actorId);
            }
        }

        $destinations = $query->get()->map(fn ($bank) => [
            'id' => $bank->id,
            'owner_type' => $bank->owner_type,
            'owner_id' => $bank->owner_external_id,
            'bank_code' => $bank->bank_code,
            'account_last4' => $bank->account_last4,
            'account_holder_name_masked' => $bank->account_holder_name_masked,
            'verification_status' => $bank->verification_status,
            'verification_method' => $bank->verification_method,
            'is_default' => $bank->is_default,
            'created_at' => $bank->created_at?->toIso8601String(),
        ]);

        return ApiResponse::success($destinations);
    }

    public function store(AddBankDestinationRequest $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $data = $request->validated();
        $ownerType = $data['owner_type'];

        if ($ownerType === 'MERCHANT_ORGANIZATION') {
            $ownerId = $data['organization_id'] ?? $actor->organizationId;
            if (!$ownerId || (!$actor->isFinanceOps() && $actor->organizationId !== $ownerId)) {
                return ApiResponse::error('FORBIDDEN_ORGANIZATION_ACCESS', 'Anda tidak berhak mendaftarkan rekening untuk organisasi ini.', 403);
            }
        } else {
            $ownerId = $actor->actorId;
        }

        $hmac = hash_hmac('sha256', $data['account_number'], (string) config('app.key'));
        $existing = BankDestination::where('owner_type', $ownerType)
            ->where('owner_external_id', $ownerId)
            ->where('bank_code', strtoupper($data['bank_code']))
            ->where('account_number_hmac', $hmac)
            ->first();

        if ($existing) {
            return ApiResponse::error('BANK_DESTINATION_EXISTS', 'Rekening bank ini sudah terdaftar.', 409);
        }

        $bank = new BankDestination();
        $bank->owner_type = $ownerType;
        $bank->owner_external_id = $ownerId;
        $bank->bank_code = strtoupper($data['bank_code']);
        $bank->account_number = $data['account_number'];
        $bank->account_holder_name = $data['account_holder_name'];
        $bank->verification_status = 'PENDING';
        $bank->verification_method = 'MOCK';
        $bank->is_default = false;
        $bank->created_by_user_id = $actor->actorId ?? 'SYSTEM';
        $bank->save();

        return ApiResponse::success([
            'id' => $bank->id,
            'owner_type' => $bank->owner_type,
            'owner_id' => $bank->owner_external_id,
            'bank_code' => $bank->bank_code,
            'account_last4' => $bank->account_last4,
            'account_holder_name_masked' => $bank->account_holder_name_masked,
            'verification_status' => $bank->verification_status,
        ], 'Rekening bank berhasil didaftarkan.', 201);
    }

    public function verifyDemo(Request $request, string $id): JsonResponse
    {
        // 1. Production environment check
        if (app()->environment('production') || !config('finance.mock_payout_enabled')) {
            return ApiResponse::error(
                'DEMO_ENDPOINT_DISABLED',
                'Simulasi verifikasi rekening bank tidak tersedia di lingkungan ini.',
                404
            );
        }

        // 2. Authentication & Authorization check
        $actor = AuthenticatedActor::fromRequest($request);
        if (!$actor) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        // Strictly restrict verify-demo to FINANCE_PAYMENT_OPS ONLY!
        // Customer, Merchant, CEO, and Admin Operations are strictly forbidden (403)
        if (!$actor->isFinanceOps()) {
            return ApiResponse::error(
                'FORBIDDEN_DEMO_VERIFICATION',
                'Hanya pengguna dengan peran FINANCE_PAYMENT_OPS yang diizinkan melakukan simulasi verifikasi rekening demo.',
                403
            );
        }

        // 3. Find target bank destination
        $bank = BankDestination::find($id);
        if (!$bank) {
            return ApiResponse::error('BANK_DESTINATION_NOT_FOUND', 'Rekening bank tidak ditemukan.', 404);
        }

        // 4. Validate that destination has proper bank data before verifying
        if (empty($bank->account_number_ciphertext) || empty($bank->bank_code) || empty($bank->account_holder_name_ciphertext)) {
            return ApiResponse::error('INVALID_BANK_DESTINATION', 'Data rekening bank tidak lengkap untuk diverifikasi.', 422);
        }

        // 5. Update status (Finance Ops cannot alter account ownership)
        $bank->update([
            'verification_status' => 'VERIFIED',
            'verification_method' => 'MOCK',
            'verified_at' => now(),
        ]);

        // 6. Record audit log
        \App\Models\FinanceAuditLog::create([
            'actor_user_id' => $actor->actorId,
            'actor_service' => 'finance-service',
            'action' => 'BANK_DESTINATION_DEMO_VERIFIED',
            'subject_type' => 'BankDestination',
            'subject_id' => $bank->id,
            'result' => 'SUCCESS',
            'after_state' => [
                'verification_status' => 'VERIFIED',
                'verification_method' => 'MOCK',
                'verified_at' => $bank->verified_at?->toIso8601String(),
            ],
        ]);

        return ApiResponse::success([
            'id' => $bank->id,
            'owner_type' => $bank->owner_type,
            'owner_id' => $bank->owner_external_id,
            'verification_status' => $bank->verification_status,
            'verification_method' => $bank->verification_method,
            'verified_at' => $bank->verified_at?->toIso8601String(),
            'disclaimer' => 'Verifikasi rekening ini adalah simulasi DEMO dan tidak berlaku untuk pemindahan dana riil.',
        ], 'Rekening bank berhasil diverifikasi secara demo.');
    }
}
