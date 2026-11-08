<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\IdempotencyRecord;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class HandleAfterSalesIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        if (!$idempotencyKey) {
            return $next($request);
        }

        $actor = $request->attributes->get('actor');
        $actorId = $actor ? $actor->id : 'anon';
        $actorOrgId = $actor ? ($actor->organizationId ?? '') : '';
        $payloadHash = hash('sha256', (string) $request->getContent());

        $scopeKey = hash('sha256', $request->method() . '|' . $request->path() . '|' . $actorId . '|' . $actorOrgId . '|' . $idempotencyKey);

        // Atomic check and lock
        $isNewOwner = false;
        $isPayloadMismatch = false;
        $currentGeneration = 1;
        $record = null;

        try {
            $record = DB::transaction(function () use ($scopeKey, $payloadHash, &$isNewOwner, &$isPayloadMismatch, &$currentGeneration) {
                /** @var IdempotencyRecord|null $existing */
                $existing = IdempotencyRecord::where('scope_key', $scopeKey)->lockForUpdate()->first();

                if ($existing) {
                    // STRICT INVARIANT: Same scoped key + different payload is ALWAYS 409 Conflict, even if FAILED or stale
                    if ($existing->payload_hash !== $payloadHash) {
                        $isPayloadMismatch = true;
                        return $existing;
                    }

                    // Check if stale IN_FLIGHT lease (e.g. crashed process after 60s) with SAME payload
                    if ($existing->status === 'IN_FLIGHT' && $existing->locked_at && $existing->locked_at->lt(now()->subSeconds(60))) {
                        $nextGen = ((int) $existing->generation) + 1;
                        $existing->update([
                            'status' => 'IN_FLIGHT',
                            'generation' => $nextGen,
                            'locked_at' => now(),
                        ]);
                        $currentGeneration = $nextGen;
                        $isNewOwner = true;
                        return $existing;
                    }

                    // If previously FAILED with SAME payload, allow safe retry with incremented fencing generation
                    if ($existing->status === 'FAILED') {
                        $nextGen = ((int) $existing->generation) + 1;
                        $existing->update([
                            'status' => 'IN_FLIGHT',
                            'generation' => $nextGen,
                            'locked_at' => now(),
                        ]);
                        $currentGeneration = $nextGen;
                        $isNewOwner = true;
                        return $existing;
                    }

                    $currentGeneration = (int) $existing->generation;
                    return $existing;
                }

                $isNewOwner = true;
                $currentGeneration = 1;
                return IdempotencyRecord::create([
                    'scope_key' => $scopeKey,
                    'payload_hash' => $payloadHash,
                    'status' => 'IN_FLIGHT',
                    'generation' => 1,
                    'locked_at' => now(),
                ]);
            });
        } catch (Throwable $e) {
            // Concurrent insert race condition: fetch locked existing
            try {
                $record = IdempotencyRecord::where('scope_key', $scopeKey)->first();
                if ($record && $record->payload_hash !== $payloadHash) {
                    $isPayloadMismatch = true;
                }
            } catch (Throwable) {
                $record = null;
            }
        }

        // STRICT FAIL-CLOSED: If idempotency layer is unavailable or record could not be secured,
        // NEVER execute the downstream business operation!
        if (!$record) {
            return ApiResponse::error(
                'IDEMPOTENCY_UNAVAILABLE',
                'Layanan proteksi idempotensi tidak dapat mengamankan permintaan ini. Operasi bisnis dibatalkan secara aman (FAIL_CLOSED). Silakan coba beberapa saat lagi.',
                503
            );
        }

        if ($isPayloadMismatch || ($record && $record->payload_hash !== $payloadHash)) {
            return ApiResponse::error(
                'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
                'Kunci idempotensi yang sama digunakan dengan payload permintaan yang berbeda.',
                409
            );
        }

        if ($record && !$isNewOwner) {
            // Concurrent duplicate in-flight request: NEVER run second business operation!
            if ($record->status === 'IN_FLIGHT') {
                return ApiResponse::error(
                    'REQUEST_IN_FLIGHT',
                    'Permintaan serupa dengan kunci idempotensi ini sedang diproses secara bersamaan. Silakan tunggu beberapa saat.',
                    409
                );
            }

            if ($record->status === 'COMPLETED' && $record->response_body_json !== null) {
                return response()->json($record->response_body_json, $record->response_status ?? 200, [
                    'X-Cache-Lookup' => 'HIT',
                    'X-Idempotent-Replay' => 'true',
                ]);
            }
        }

        try {
            $response = $next($request);

            if ($response->isSuccessful() && $response instanceof JsonResponse) {
                IdempotencyRecord::where('scope_key', $scopeKey)
                    ->where('generation', $currentGeneration)
                    ->update([
                        'status' => 'COMPLETED',
                        'response_status' => $response->getStatusCode(),
                        'response_body_json' => $response->getData(true),
                        'updated_at' => now(),
                    ]);
            } else {
                IdempotencyRecord::where('scope_key', $scopeKey)
                    ->where('generation', $currentGeneration)
                    ->update([
                        'status' => 'FAILED',
                        'updated_at' => now(),
                    ]);
            }

            return $response;
        } catch (Throwable $e) {
            IdempotencyRecord::where('scope_key', $scopeKey)
                ->where('generation', $currentGeneration)
                ->update([
                    'status' => 'FAILED',
                    'updated_at' => now(),
                ]);
            throw $e;
        }
    }
}
