<?php

namespace App\Domain\Finance\Withdrawals;

use App\Models\BankDestination;
use App\Models\FinanceAuditLog;
use App\Models\LedgerJournal;
use App\Models\LedgerLine;
use App\Models\PayoutEvent;
use App\Models\SPayAccount;
use App\Models\SPayMovement;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class WithdrawalService
{
    /**
     * Quotes a withdrawal request, validating minimum Rp20.000, bank verification, and sufficient available balance.
     */
    public function quoteWithdrawal(string $ownerType, string $ownerExternalId, int $amountIdr, string $bankDestinationId): array
    {
        if ($amountIdr < 20000) {
            throw new HttpException(422, 'Nominal pencairan minimal adalah Rp20.000.');
        }

        $bank = BankDestination::find($bankDestinationId);
        if (!$bank) {
            throw new HttpException(404, 'Rekening bank tujuan tidak ditemukan.');
        }

        if ($bank->owner_type !== $ownerType || $bank->owner_external_id !== $ownerExternalId) {
            throw new HttpException(403, 'Rekening bank bukan milik entitas penarik dana.');
        }

        if ($bank->verification_status !== 'VERIFIED') {
            throw new HttpException(422, 'Rekening bank tujuan belum diverifikasi.');
        }

        $account = SPayAccount::where('owner_type', $ownerType)
            ->where('owner_external_id', $ownerExternalId)
            ->first();

        $available = $account ? $account->available_idr : 0;
        if ($available < $amountIdr) {
            throw new HttpException(409, 'Saldo S-Pay tersedia tidak mencukupi untuk nominal pencairan ini.');
        }

        $transferFee = (int) config('finance.mock_transfer_fee_idr', 2500);
        $netToBank = $amountIdr - $transferFee;

        if ($netToBank <= 0) {
            throw new HttpException(422, 'Nominal pencairan bersih setelah biaya transfer harus lebih besar dari 0.');
        }

        $quoteId = 'wdq-' . (string) Str::uuid();
        $quoteData = [
            'quote_id' => $quoteId,
            'owner_type' => $ownerType,
            'owner_external_id' => $ownerExternalId,
            'amount_idr' => $amountIdr,
            'transfer_fee_idr' => $transferFee,
            'net_to_bank_idr' => $netToBank,
            'bank_destination_id' => $bank->id,
            'bank' => [
                'bank_code' => $bank->bank_code,
                'account_last4' => $bank->account_last4,
                'account_holder_name_masked' => $bank->account_holder_name_masked,
            ],
            'expires_at' => now()->addMinutes(5)->toIso8601String(),
            'is_real_transfer' => false,
            'warning' => 'Pastikan bank, nomor rekening dan nama penerima sudah benar.',
        ];

        Cache::put("finance_quote_{$quoteId}", $quoteData, now()->addMinutes(5));

        return $quoteData;
    }

    /**
     * Executes withdrawal creation, atomically locking the requested funds.
     */
    public function createWithdrawal(
        string $actorUserId,
        string $ownerType,
        string $ownerExternalId,
        string $quoteId,
        string $bankDestinationId,
        ?string $stepUpReference = null,
        ?string $idempotencyKey = null
    ): WithdrawalRequest {
        $quote = Cache::get("finance_quote_{$quoteId}");
        if (!$quote) {
            throw new HttpException(410, 'Penawaran pencairan (quote) telah kedaluwarsa atau tidak valid.');
        }

        if ($quote['owner_type'] !== $ownerType || $quote['owner_external_id'] !== $ownerExternalId) {
            throw new HttpException(403, 'Konteks pemilik penarikan tidak cocok dengan quote.');
        }

        // FIX 03: Ensure bank destination has NOT changed from quote
        if ($bankDestinationId !== $quote['bank_destination_id']) {
            throw new HttpException(422, 'Rekening bank tujuan berbeda dengan kutipan penarikan (quote). Buat quote baru jika ingin mengubah rekening.');
        }

        // Verify that bank destination exists, belongs to owner, and is currently VERIFIED
        $bank = BankDestination::find($bankDestinationId);
        if (!$bank || $bank->verification_status !== 'VERIFIED') {
            throw new HttpException(422, 'Rekening bank tujuan tidak ditemukan atau belum berstatus VERIFIED.');
        }

        if ($bank->owner_type !== $ownerType || $bank->owner_external_id !== $ownerExternalId) {
            throw new HttpException(403, 'Rekening bank tujuan bukan milik entitas penarik dana.');
        }

        // Require valid security step-up confirmation proof before locking funds
        $stepUpReference = (string) $stepUpReference;
        if (empty($stepUpReference) || trim($stepUpReference) === '' || in_array(strtolower(trim($stepUpReference)), ['null', 'undefined', 'none', 'false'], true)) {
            throw new HttpException(422, 'Bukti konfirmasi keamanan tambahan (step_up_reference) diperlukan.');
        }

        $idempotencyHash = hash('sha256', (string) ($idempotencyKey ?: $quoteId));

        return DB::transaction(function () use (
            $actorUserId,
            $ownerType,
            $ownerExternalId,
            $quote,
            $bankDestinationId,
            $stepUpReference,
            $idempotencyHash
        ) {
            /** @var SPayAccount $account */
            $account = SPayAccount::where('owner_type', $ownerType)
                ->where('owner_external_id', $ownerExternalId)
                ->lockForUpdate()
                ->first();

            if (!$account) {
                throw new HttpException(404, 'Akun S-Pay tidak ditemukan.');
            }

            // Idempotent check
            $existing = WithdrawalRequest::where('spay_account_id', $account->id)
                ->where('idempotency_key_hash', $idempotencyHash)
                ->first();

            if ($existing) {
                return $existing;
            }

            $amountIdr = (int) $quote['amount_idr'];

            // Cryptographic Step-Up Proof Verification (Parameter-bound, Anti-Replay, Expiration, Fail-Closed)
            // MUST succeed before any balance modification or locking!
            $this->verifyStepUpProof(
                stepUpReference: $stepUpReference,
                actorUserId: $actorUserId,
                ownerType: $ownerType,
                ownerExternalId: $ownerExternalId,
                spayAccountId: $account->id,
                amountIdr: $amountIdr,
                bankDestinationId: $bankDestinationId
            );

            if ($account->available_idr < $amountIdr) {
                throw new HttpException(409, 'Saldo S-Pay tersedia tidak mencukupi saat proses penguncian dana.');
            }

            // Lock funds
            $beforeAvailable = $account->available_idr;
            $account->available_idr -= $amountIdr;
            $afterAvailable = $account->available_idr;

            $beforeLocked = $account->withdrawal_locked_idr;
            $account->withdrawal_locked_idr += $amountIdr;
            $afterLocked = $account->withdrawal_locked_idr;

            $account->last_movement_at = now();
            $account->save();

            $withdrawal = WithdrawalRequest::create([
                'spay_account_id' => $account->id,
                'bank_destination_id' => $bankDestinationId,
                'requested_by_user_id' => $actorUserId,
                'requested_amount_idr' => $amountIdr,
                'transfer_fee_idr' => $quote['transfer_fee_idr'],
                'net_to_bank_idr' => $quote['net_to_bank_idr'],
                'status' => 'PENDING',
                'idempotency_key_hash' => $idempotencyHash,
                'provider' => 'MOCK',
                'provider_reference' => 'MOCK-WD-' . strtoupper(Str::random(12)),
                'step_up_proof_reference' => $stepUpReference,
                'bank_snapshot_masked' => $quote['bank'],
                'initiated_at' => now(),
            ]);

            // Movement: WITHDRAWAL_LOCK
            SPayMovement::create([
                'spay_account_id' => $account->id,
                'movement_type' => 'WITHDRAWAL_LOCK',
                'direction' => 'LOCK',
                'amount_idr' => $amountIdr,
                'source_type' => 'WithdrawalRequest',
                'source_id' => $withdrawal->id,
                'available_before_idr' => $beforeAvailable,
                'available_after_idr' => $afterAvailable,
                'locked_before_idr' => $beforeLocked,
                'locked_after_idr' => $afterLocked,
                'created_at' => now(),
            ]);

            FinanceAuditLog::create([
                'actor_user_id' => $actorUserId,
                'actor_service' => 'finance-service',
                'action' => 'WITHDRAWAL_REQUEST_LOCKED',
                'subject_type' => 'WithdrawalRequest',
                'subject_id' => $withdrawal->id,
                'result' => 'SUCCESS',
                'after_state' => ['requested_amount_idr' => $amountIdr],
            ]);

            return $withdrawal;
        });
    }

    /**
     * Simulates payout outcome (SUCCESS / FAILED) by mock payout provider.
     */
    public function simulatePayoutOutcome(string $withdrawalId, string $outcome, string $providerEventId): WithdrawalRequest
    {
        $outcome = strtoupper($outcome);
        if (!in_array($outcome, ['SUCCESS', 'FAILED'], true)) {
            throw new HttpException(422, 'Outcome simulator hanya boleh SUCCESS atau FAILED.');
        }

        return DB::transaction(function () use ($withdrawalId, $outcome, $providerEventId) {
            /** @var WithdrawalRequest|null $req */
            $req = WithdrawalRequest::where('id', $withdrawalId)->lockForUpdate()->first();
            if (!$req) {
                throw new HttpException(404, 'Permintaan pencairan dana tidak ditemukan.');
            }

            // Idempotent event check
            $existingEvent = PayoutEvent::where('provider', 'MOCK')
                ->where('provider_event_id', $providerEventId)
                ->first();

            if ($existingEvent) {
                return $req;
            }

            if ($req->status === 'SUCCEEDED' || $req->status === 'FAILED') {
                return $req;
            }

            /** @var SPayAccount $account */
            $account = SPayAccount::where('id', $req->spay_account_id)->lockForUpdate()->first();

            if ($outcome === 'SUCCESS') {
                $req->update([
                    'status' => 'SUCCEEDED',
                    'completed_at' => now(),
                ]);

                // Consume locked amount
                $beforeLocked = $account->withdrawal_locked_idr;
                $account->withdrawal_locked_idr -= $req->requested_amount_idr;
                $afterLocked = $account->withdrawal_locked_idr;
                $account->last_movement_at = now();
                $account->save();

                SPayMovement::create([
                    'spay_account_id' => $account->id,
                    'movement_type' => 'WITHDRAWAL_SUCCEEDED',
                    'direction' => 'DEBIT',
                    'amount_idr' => $req->requested_amount_idr,
                    'source_type' => 'WithdrawalRequest',
                    'source_id' => $req->id,
                    'available_before_idr' => $account->available_idr,
                    'available_after_idr' => $account->available_idr,
                    'locked_before_idr' => $beforeLocked,
                    'locked_after_idr' => $afterLocked,
                    'created_at' => now(),
                ]);

                // Balanced Ledger Journal:
                // Debit: SPAY_MERCHANT_PAYABLE or SPAY_CUSTOMER_REFUND_PAYABLE = requested_amount_idr
                // Credit: MOCK_PROVIDER_CLEARING = net_to_bank_idr
                // Credit: MOCK_PAYOUT_FEE_CLEARING = transfer_fee_idr
                $journal = LedgerJournal::create([
                    'journal_type' => 'WITHDRAWAL_SETTLEMENT',
                    'source_type' => 'WithdrawalRequest',
                    'source_id' => $req->id,
                    'withdrawal_request_id' => $req->id,
                    'currency' => 'IDR',
                    'posted_at' => now(),
                    'description' => 'Pencairan dana ke bank berhasil diselesaikan',
                ]);

                $debitAccount = $account->owner_type === 'MERCHANT_ORGANIZATION'
                    ? 'SPAY_MERCHANT_PAYABLE'
                    : 'SPAY_CUSTOMER_REFUND_PAYABLE';

                LedgerLine::create([
                    'ledger_journal_id' => $journal->id,
                    'account_code' => $debitAccount,
                    'owner_type' => $account->owner_type,
                    'owner_external_id' => $account->owner_external_id,
                    'entry_side' => 'DEBIT',
                    'amount_idr' => $req->requested_amount_idr,
                ]);

                LedgerLine::create([
                    'ledger_journal_id' => $journal->id,
                    'account_code' => 'MOCK_PROVIDER_CLEARING',
                    'entry_side' => 'CREDIT',
                    'amount_idr' => $req->net_to_bank_idr,
                ]);

                LedgerLine::create([
                    'ledger_journal_id' => $journal->id,
                    'account_code' => 'MOCK_PAYOUT_FEE_CLEARING',
                    'entry_side' => 'CREDIT',
                    'amount_idr' => $req->transfer_fee_idr,
                ]);
            } else {
                // Confirmed failure: release locked back to available
                $req->update([
                    'status' => 'FAILED',
                    'failure_code' => 'MOCK_TRANSFER_REJECTED',
                ]);

                $beforeLocked = $account->withdrawal_locked_idr;
                $account->withdrawal_locked_idr -= $req->requested_amount_idr;
                $afterLocked = $account->withdrawal_locked_idr;

                $beforeAvailable = $account->available_idr;
                $account->available_idr += $req->requested_amount_idr;
                $afterAvailable = $account->available_idr;

                $account->last_movement_at = now();
                $account->save();

                SPayMovement::create([
                    'spay_account_id' => $account->id,
                    'movement_type' => 'WITHDRAWAL_UNLOCK',
                    'direction' => 'UNLOCK',
                    'amount_idr' => $req->requested_amount_idr,
                    'source_type' => 'WithdrawalRequest',
                    'source_id' => $req->id,
                    'available_before_idr' => $beforeAvailable,
                    'available_after_idr' => $afterAvailable,
                    'locked_before_idr' => $beforeLocked,
                    'locked_after_idr' => $afterLocked,
                    'created_at' => now(),
                ]);
            }

            PayoutEvent::create([
                'withdrawal_request_id' => $req->id,
                'provider' => 'MOCK',
                'provider_event_id' => $providerEventId,
                'event_type' => 'PAYOUT_' . $outcome,
                'reported_net_idr' => $req->net_to_bank_idr,
                'validation_result' => 'VALID',
                'payload' => ['outcome' => $outcome],
                'received_at' => now(),
            ]);

            FinanceAuditLog::create([
                'actor_service' => 'finance-service',
                'action' => 'PAYOUT_SIMULATED_' . $outcome,
                'subject_type' => 'WithdrawalRequest',
                'subject_id' => $req->id,
                'result' => 'SUCCESS',
                'after_state' => ['status' => $req->status],
            ]);

            return $req;
        });
    }

    /**
     * Verifies cryptographic step-up authorization proof.
     */
    public function verifyStepUpProof(
        string $stepUpReference,
        string $actorUserId,
        string $ownerType,
        string $ownerExternalId,
        string $spayAccountId,
        int $amountIdr,
        string $bankDestinationId
    ): void {
        if (empty($stepUpReference) || trim($stepUpReference) === '' || in_array(strtolower(trim($stepUpReference)), ['null', 'undefined', 'none', 'false'], true)) {
            throw new HttpException(422, 'Bukti konfirmasi keamanan tambahan (step_up_reference) diperlukan.');
        }

        $secret = config('finance.step_up_secret');
        if (empty($secret)) {
            // If Identity contract / secret is not configured, fail-closed safely
            throw new HttpException(503, 'PENDING_IDENTITY_DEPENDENCY: Step-up verification provider is not configured or pending Modul 01 contract.');
        }

        // Expected format: stp_<base64url_payload>.<signature>
        if (!str_starts_with($stepUpReference, 'stp_') || !str_contains($stepUpReference, '.')) {
            throw new HttpException(422, 'Format bukti konfirmasi keamanan tidak sah.');
        }

        $rawToken = substr($stepUpReference, 4);
        $parts = explode('.', $rawToken, 2);
        if (count($parts) !== 2) {
            throw new HttpException(422, 'Struktur bukti konfirmasi keamanan tidak valid.');
        }

        [$payloadB64, $signature] = $parts;

        // Verify cryptographic signature (HMAC-SHA256)
        $expectedSignature = hash_hmac('sha256', $payloadB64, (string) $secret);
        if (!hash_equals($expectedSignature, $signature)) {
            throw new HttpException(422, 'Bukti konfirmasi keamanan palsu atau tanda tangan digital tidak sah.');
        }

        $jsonStr = base64_decode(strtr($payloadB64, '-_', '+/'), true);
        if ($jsonStr === false) {
            throw new HttpException(422, 'Payload bukti konfirmasi keamanan tidak dapat di-decode.');
        }

        $payload = json_decode($jsonStr, true);
        if (!is_array($payload)) {
            throw new HttpException(422, 'Payload bukti konfirmasi keamanan rusak.');
        }

        // 1. Purpose check
        if (($payload['purpose'] ?? '') !== 'WITHDRAWAL') {
            throw new HttpException(422, 'Tujuan bukti keamanan tidak sesuai (harus WITHDRAWAL).');
        }

        // 2. Additional authentication verification (proof of OTP/PIN/Biometric from Identity Service)
        $authMethod = $payload['auth_method'] ?? null;
        if (!in_array($authMethod, ['OTP', 'PIN', 'BIOMETRIC'], true)) {
            throw new HttpException(422, 'Bukti konfirmasi keamanan tidak menyertakan bukti autentikasi tambahan yang sah dari Identity Service.');
        }

        $challengeId = $payload['challenge_id'] ?? $payload['assertion_id'] ?? null;
        if (empty($challengeId) || trim((string) $challengeId) === '') {
            throw new HttpException(422, 'Bukti konfirmasi keamanan tidak menyertakan identifikasi tantangan autentikasi dari Identity Service.');
        }

        // 3. Identity service timeout / connectivity check
        if (config('finance.identity_step_up_timeout_simulate') || config('services.identity.simulate_timeout')) {
            throw new HttpException(503, 'Verifikasi layanan Identity gagal atau timeout, pencairan dana tidak dapat dilanjutkan demi keamanan.');
        }

        // 4. Expiration check
        $expiresAt = (int) ($payload['expires_at'] ?? 0);
        if ($expiresAt <= now()->timestamp) {
            throw new HttpException(422, 'Bukti konfirmasi keamanan telah kedaluwarsa.');
        }

        // 5. User binding check
        if (($payload['user_id'] ?? '') !== $actorUserId) {
            throw new HttpException(403, 'Bukti konfirmasi keamanan bukan milik pengguna yang sedang login.');
        }

        // 6. Organization binding check
        if ($ownerType === 'MERCHANT_ORGANIZATION') {
            if (($payload['organization_id'] ?? '') !== $ownerExternalId) {
                throw new HttpException(403, 'Bukti konfirmasi keamanan tidak terikat pada organisasi penarik dana.');
            }
        }

        // 7. S-Pay Account binding check
        if (($payload['spay_account_id'] ?? '') !== $spayAccountId) {
            throw new HttpException(422, 'Bukti konfirmasi keamanan tidak terikat pada akun S-Pay yang dimaksud.');
        }

        // 8. Amount binding check
        if ((int) ($payload['amount_idr'] ?? 0) !== $amountIdr) {
            throw new HttpException(422, "Nominal penarikan (Rp{$amountIdr}) tidak cocok dengan bukti konfirmasi keamanan.");
        }

        // 9. Bank destination binding check
        if (($payload['bank_destination_id'] ?? '') !== $bankDestinationId) {
            throw new HttpException(422, 'Rekening bank tujuan tidak cocok dengan bukti konfirmasi keamanan.');
        }

        // 10. Anti-replay check: ensure token has not been used in an existing withdrawal
        $alreadyUsed = WithdrawalRequest::where('step_up_proof_reference', $stepUpReference)->exists();
        if ($alreadyUsed) {
            throw new HttpException(422, 'Bukti konfirmasi keamanan telah digunakan sebelumnya (anti-replay).');
        }
    }

    /**
     * Generates a signed cryptographic step-up proof token.
     */
    public static function generateStepUpProof(array $params, ?string $secret = null): string
    {
        $secret = $secret ?: config('finance.step_up_secret');
        if (empty($secret)) {
            throw new \RuntimeException('STEP_UP_SECRET is not configured');
        }

        $params['auth_method'] = $params['auth_method'] ?? 'OTP';
        $params['challenge_id'] = $params['challenge_id'] ?? ('chl-' . bin2hex(random_bytes(6)));
        $params['authenticated_at'] = $params['authenticated_at'] ?? now()->timestamp;
        unset($params['nonce']);

        $payloadJson = json_encode($params, JSON_UNESCAPED_SLASHES);
        $payloadB64 = rtrim(strtr(base64_encode($payloadJson), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $payloadB64, (string) $secret);

        return 'stp_' . $payloadB64 . '.' . $sig;
    }
}
