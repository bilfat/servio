<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class HandleOrderJasaIdempotency
{
    private const MIN_KEY_LENGTH = 16;
    private const MAX_KEY_LENGTH = 128;
    private const MAX_PAYLOAD_BYTES = 262144; // 256 KB
    private const STALE_LOCK_SECONDS = 120;

    public function handle(Request $request, Closure $next, string $operation = 'mutation'): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        // 1. Check if key is required
        if (empty($idempotencyKey)) {
            if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                return ApiResponse::error(
                    'ORDER_JASA_IDEMPOTENCY_KEY_REQUIRED',
                    'Operasi mutasi memerlukan header Idempotency-Key.',
                    400
                );
            }
            return $next($request);
        }

        // 2. Validate Key Length & Format
        $keyLength = strlen($idempotencyKey);
        if ($keyLength < self::MIN_KEY_LENGTH || $keyLength > self::MAX_KEY_LENGTH) {
            return ApiResponse::error(
                'ORDER_JASA_IDEMPOTENCY_KEY_INVALID',
                'Idempotency-Key harus memiliki panjang antara ' . self::MIN_KEY_LENGTH . ' dan ' . self::MAX_KEY_LENGTH . ' karakter.',
                400
            );
        }

        if (!preg_match('/^[A-Za-z0-9_-]+$/', $idempotencyKey)) {
            return ApiResponse::error(
                'ORDER_JASA_IDEMPOTENCY_KEY_INVALID',
                'Format Idempotency-Key tidak valid. Gunakan karakter alfanumerik, dash, atau underscore.',
                400
            );
        }

        // 3. Payload Normalization & Canonical Hash
        $rawContent = (string) $request->getContent();
        $payloadSizeBytes = strlen($rawContent);
        if ($payloadSizeBytes > self::MAX_PAYLOAD_BYTES) {
            return ApiResponse::error(
                'ORDER_JASA_PAYLOAD_TOO_LARGE',
                'Ukuran payload melebihi batas maksimum idempotensi (256 KB).',
                413
            );
        }

        $payload = $request->all();
        $this->recursiveKsort($payload);
        $canonicalPayloadJson = (string) json_encode($payload);

        $requestHash = hash('sha256', $request->method() . ':' . $request->path() . ':' . $canonicalPayloadJson);
        $keyHash = hash('sha256', $idempotencyKey);

        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');
        $actorScope = $actor ? "{$actor->role}:{$actor->id}" : 'ANONYMOUS:' . ($request->ip() ?? 'unknown');

        $recordId = (string) Str::ulid();
        $leaseToken = (string) Str::uuid();
        $fencingVersion = 1;
        $now = now();

        $acquired = false;

        // 4. ATOMIC ACQUISITION: Attempt INSERT with state = PROCESSING
        try {
            DB::table('idempotency_records')->insert([
                'id' => $recordId,
                'actor_scope' => $actorScope,
                'operation' => $operation,
                'key_hash' => $keyHash,
                'request_hash' => $requestHash,
                'response_status' => 0,
                'response_body_redacted' => null,
                'state' => 'PROCESSING',
                'recovery_state' => null,
                'lease_token' => $leaseToken,
                'fencing_version' => $fencingVersion,
                'payload_size_bytes' => $payloadSizeBytes,
                'expires_at' => $now->copy()->addHours(24),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $acquired = true;
        } catch (QueryException $e) {
            // Handle duplicate entry on unique ['actor_scope', 'operation', 'key_hash']
            if ($e->getCode() === '23000' || ($e->errorInfo[1] ?? 0) === 1062) {
                $existing = DB::table('idempotency_records')
                    ->where('actor_scope', $actorScope)
                    ->where('operation', $operation)
                    ->where('key_hash', $keyHash)
                    ->first();

                if (!$existing) {
                    return ApiResponse::error(
                        'ORDER_JASA_IDEMPOTENCY_IN_PROGRESS',
                        'Permintaan dengan kunci idempotensi ini sedang diproses. Mohon tunggu.',
                        409
                    );
                }

                // Check payload mismatch
                if ($existing->request_hash !== $requestHash) {
                    return ApiResponse::error(
                        'ORDER_JASA_IDEMPOTENCY_CONFLICT',
                        'Idempotency-Key telah digunakan sebelumnya dengan payload yang berbeda.',
                        409
                    );
                }

                $recordId = $existing->id;

                // Check state
                if ($existing->state === 'COMPLETED') {
                    // Safe Replay of cached completed response
                    $cachedBody = json_decode((string) $existing->response_body_redacted, true);
                    return response()->json($cachedBody, (int) $existing->response_status)
                        ->header('X-Idempotent-Replay', 'true');
                }

                if ($existing->state === 'RECONCILIATION_REQUIRED') {
                    return ApiResponse::error(
                        'ORDER_JASA_IDEMPOTENCY_RECONCILIATION_REQUIRED',
                        'Operasi dengan kunci idempotensi ini berada dalam status ambigu dan memerlukan rekonsiliasi sebelum dapat diproses ulang.',
                        409
                    );
                }

                if ($existing->state === 'PROCESSING') {
                    $updatedAt = $existing->updated_at ? \Carbon\Carbon::parse($existing->updated_at) : now();
                    $ageSeconds = $updatedAt->diffInSeconds(now());

                    if ($ageSeconds < self::STALE_LOCK_SECONDS) {
                        return ApiResponse::error(
                            'ORDER_JASA_IDEMPOTENCY_IN_PROGRESS',
                            'Permintaan dengan kunci idempotensi ini sedang diproses. Mohon tunggu.',
                            409,
                            null,
                            [],
                            2
                        );
                    }

                    // Stale lock (> 120s): DO NOT blindly re-run mutations!
                    // Mark state as RECONCILIATION_REQUIRED atomically via CAS
                    DB::table('idempotency_records')
                        ->where('id', $existing->id)
                        ->where('state', 'PROCESSING')
                        ->where('fencing_version', $existing->fencing_version)
                        ->update([
                            'state' => 'RECONCILIATION_REQUIRED',
                            'recovery_state' => 'STALE_PROCESSING_DETECTED',
                            'fencing_version' => $existing->fencing_version + 1,
                            'updated_at' => now(),
                        ]);

                    return ApiResponse::error(
                        'ORDER_JASA_IDEMPOTENCY_RECONCILIATION_REQUIRED',
                        'Deteksi proses tertunda lama. Status transaksi ambigu dan memerlukan rekonsiliasi sebelum dapat diulang demi mencegah mutasi ganda.',
                        409
                    );
                }

                if ($existing->state === 'FAILED_RETRYABLE') {
                    // Transition back to PROCESSING atomically with new lease and bumped version
                    $targetVersion = (int) $existing->fencing_version + 1;
                    $reclaimed = DB::table('idempotency_records')
                        ->where('id', $existing->id)
                        ->where('state', 'FAILED_RETRYABLE')
                        ->where('fencing_version', $existing->fencing_version)
                        ->update([
                            'state' => 'PROCESSING',
                            'lease_token' => $leaseToken,
                            'fencing_version' => $targetVersion,
                            'response_status' => 0,
                            'response_body_redacted' => null,
                            'updated_at' => now(),
                        ]);

                    if ($reclaimed > 0) {
                        $acquired = true;
                        $fencingVersion = $targetVersion;
                    } else {
                        return ApiResponse::error(
                            'ORDER_JASA_IDEMPOTENCY_IN_PROGRESS',
                            'Permintaan dengan kunci idempotensi ini sedang diproses oleh worker lain.',
                            409
                        );
                    }
                }
            } else {
                // Non-duplicate database error on acquisition -> FAIL-CLOSED!
                Log::error('Idempotency storage database error on acquire: ' . $e->getMessage(), [
                    'actor_scope' => $actorScope,
                    'key_hash' => $keyHash,
                ]);

                return ApiResponse::error(
                    'ORDER_JASA_IDEMPOTENCY_STORAGE_ERROR',
                    'Gagal menginisialisasi verifikasi idempotensi. Permintaan tidak dapat diproses demi mencegah mutasi ganda.',
                    503
                );
            }
        } catch (\Throwable $e) {
            Log::error('Idempotency acquisition unexpected error: ' . $e->getMessage());

            return ApiResponse::error(
                'ORDER_JASA_IDEMPOTENCY_STORAGE_ERROR',
                'Gagal memverifikasi idempotensi permintaan.',
                503
            );
        }

        if (!$acquired) {
            return ApiResponse::error(
                'ORDER_JASA_IDEMPOTENCY_CONFLICT',
                'Kunci idempotensi tidak dapat diperoleh.',
                409
            );
        }

        // 5. DOWNSTREAM EXECUTION
        try {
            $response = $next($request);
        } catch (\Throwable $e) {
            // Unhandled downstream crash:
            // If downstream has executed side effects (e.g. created records or contacted Finance),
            // it is NOT safe to blindly retry. Transition to RECONCILIATION_REQUIRED!
            $hasSideEffect = (bool) $request->attributes->get('idempotency_has_side_effect', false);
            $crashState = $hasSideEffect ? 'RECONCILIATION_REQUIRED' : 'FAILED_RETRYABLE';
            $recoveryState = $hasSideEffect ? 'EXCEPTION_AFTER_SIDE_EFFECT' : null;

            try {
                DB::table('idempotency_records')
                    ->where('id', $recordId)
                    ->where('lease_token', $leaseToken)
                    ->where('fencing_version', $fencingVersion)
                    ->update([
                        'state' => $crashState,
                        'recovery_state' => $recoveryState,
                        'updated_at' => now(),
                    ]);
            } catch (\Throwable $ignore) {}

            throw $e;
        }

        // 6. RESULT STORING RULES WITH FENCING & PERSISTENCE FAIL-CLOSED
        $statusCode = $response->getStatusCode();
        $isServerError = ($statusCode >= 500);
        $hasSideEffect = (bool) $request->attributes->get('idempotency_has_side_effect', false);

        if ($isServerError) {
            if ($hasSideEffect) {
                // CRITICAL: 5xx after side effect MUST NOT be retryable!
                // Downstream side effects may already be committed or in-flight in Finance.
                $targetState = 'RECONCILIATION_REQUIRED';
                $recoveryState = '5XX_AFTER_SIDE_EFFECT';
            } else {
                $targetState = 'FAILED_RETRYABLE';
                $recoveryState = null;
            }
        } else {
            $targetState = 'COMPLETED';
            $recoveryState = null;
        }

        try {
            $persisted = DB::table('idempotency_records')
                ->where('id', $recordId)
                ->where('lease_token', $leaseToken)
                ->where('fencing_version', $fencingVersion)
                ->update([
                    'state' => $targetState,
                    'recovery_state' => $recoveryState,
                    'response_status' => $statusCode,
                    'response_body_redacted' => ($isServerError && !$hasSideEffect) ? null : $response->getContent(),
                    'updated_at' => now(),
                ]);

            if ($persisted === 0) {
                // Fencing violation: lease was bumped or stolen
                Log::critical('FENCING VIOLATION: Idempotency worker was fenced out during finalization', [
                    'record_id' => $recordId,
                    'lease_token' => $leaseToken,
                    'fencing_version' => $fencingVersion,
                ]);

                return ApiResponse::error(
                    'ORDER_JASA_IDEMPOTENCY_FENCED_OUT',
                    'Eksekusi ditolak: sesi idempotensi telah kedaluwarsa atau diambil alih oleh proses lain.',
                    409
                );
            }
        } catch (\Throwable $e) {
            // CRITICAL: Database failure while persisting final result
            Log::critical('CRITICAL IDEMPOTENCY PERSISTENCE FAILURE: Failed to save final response', [
                'record_id' => $recordId,
                'error' => $e->getMessage(),
            ]);

            // Attempt to mark as RECONCILIATION_REQUIRED
            try {
                DB::table('idempotency_records')
                    ->where('id', $recordId)
                    ->update([
                        'state' => 'RECONCILIATION_REQUIRED',
                        'recovery_state' => 'PERSISTENCE_FAILURE_AFTER_EXECUTION',
                        'updated_at' => now(),
                    ]);
            } catch (\Throwable $ignore) {}

            // FAIL-CLOSED: NEVER return a success response without guaranteed idempotency persistence!
            return ApiResponse::error(
                'ORDER_JASA_IDEMPOTENCY_PERSISTENCE_FAILED',
                'Gagal mencatat status final verifikasi idempotensi. Respons dibatalkan demi menjaga integritas transaksi.',
                503
            );
        }

        return $response;
    }

    private function recursiveKsort(array &$array): void
    {
        foreach ($array as &$value) {
            if (is_array($value)) {
                $this->recursiveKsort($value);
            }
        }
        ksort($array);
    }
}
