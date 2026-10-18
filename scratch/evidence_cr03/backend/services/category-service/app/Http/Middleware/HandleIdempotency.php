<?php

namespace App\Http\Middleware;

use App\Models\CategoryIdempotencyRecord;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class HandleIdempotency
{
    /**
     * Handle an incoming request with safe lease fencing, concurrency protection, and replay.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('X-Idempotency-Key') ?: $request->header('Idempotency-Key');

        if (empty($idempotencyKey)) {
            return $next($request);
        }

        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        if (! $actor || $actor->isGuest || empty($actor->id)) {
            return ApiResponse::error(
                'CATEGORY_UNAUTHENTICATED',
                'Autentikasi diperlukan untuk operasi idempotency.',
                401
            );
        }

        $actorUserId = $actor->id;
        $payload = $request->getContent();
        $requestHash = hash('sha256', $request->method() . ':' . $request->path() . ':' . $payload);

        $existing = CategoryIdempotencyRecord::where('actor_user_id', $actorUserId)
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing) {
            // 1. IN_PROGRESS claim: DO NOT delete even if expired to prevent duplicate mutation
            if ((int) $existing->response_status === 0) {
                return ApiResponse::error(
                    'CATEGORY_CONCURRENT_REQUEST',
                    'Permintaan mutasi dengan idempotency key yang sama sedang diproses.',
                    409
                );
            }

            // 2. Completed record past its retention expiry (24h)
            if ($existing->expires_at && $existing->expires_at->isPast()) {
                $existing->delete();
            } else {
                // If identical payload, replay cached response
                if ($existing->request_hash === $requestHash) {
                    return response()->json($existing->response_body, $existing->response_status)
                        ->header('X-Idempotent-Replayed', 'true');
                }

                // Key reused with different payload
                return ApiResponse::error(
                    'CATEGORY_IDEMPOTENCY_KEY_REUSED',
                    'Idempotency key telah digunakan untuk request dengan payload atau rute berbeda.',
                    409
                );
            }
        }

        // 3. Attempt atomic pre-claim before executing business mutation
        $claimId = (string) Str::uuid();
        try {
            CategoryIdempotencyRecord::create([
                'id' => $claimId,
                'actor_user_id' => $actorUserId,
                'idempotency_key' => $idempotencyKey,
                'request_hash' => $requestHash,
                'response_status' => 0, // In progress marker
                'response_body' => ['status' => 'IN_PROGRESS'],
                'expires_at' => now()->addMinutes(15), // Safe lease window
            ]);
        } catch (QueryException $e) {
            // Concurrent insert caught by MySQL unique constraint uk_idempotency_actor_key
            $existingAfterConflict = CategoryIdempotencyRecord::where('actor_user_id', $actorUserId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingAfterConflict) {
                if ((int) $existingAfterConflict->response_status === 0) {
                    return ApiResponse::error(
                        'CATEGORY_CONCURRENT_REQUEST',
                        'Permintaan mutasi dengan idempotency key yang sama sedang diproses.',
                        409
                    );
                }

                if ($existingAfterConflict->request_hash === $requestHash) {
                    return response()->json($existingAfterConflict->response_body, $existingAfterConflict->response_status)
                        ->header('X-Idempotent-Replayed', 'true');
                }

                return ApiResponse::error(
                    'CATEGORY_IDEMPOTENCY_KEY_REUSED',
                    'Idempotency key telah digunakan untuk request dengan payload atau rute berbeda.',
                    409
                );
            }

            throw $e;
        }

        try {
            $response = $next($request);
        } catch (\Throwable $t) {
            // On unhandled exception during mutation, release claim to allow retry
            CategoryIdempotencyRecord::where('id', $claimId)
                ->where('response_status', 0)
                ->delete();
            throw $t;
        }

        // 4. Finalize idempotent response with ownership fencing
        if ($response->getStatusCode() < 500) {
            $responseBody = json_decode($response->getContent(), true);

            if (is_array($responseBody)) {
                CategoryIdempotencyRecord::where('id', $claimId)
                    ->where('response_status', 0)
                    ->update([
                        'response_status' => $response->getStatusCode(),
                        'response_body' => $responseBody,
                        'expires_at' => now()->addHours(24),
                    ]);
            } else {
                CategoryIdempotencyRecord::where('id', $claimId)
                    ->where('response_status', 0)
                    ->delete();
            }
        } else {
            // Delete in-progress claim on 5xx server error to allow retry
            CategoryIdempotencyRecord::where('id', $claimId)
                ->where('response_status', 0)
                ->delete();
        }

        return $response;
    }
}
