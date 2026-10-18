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

            // 2. Completed / settled record handling
            if ($existing->request_hash !== $requestHash) {
                // Key reused with different payload
                return ApiResponse::error(
                    'CATEGORY_IDEMPOTENCY_KEY_REUSED',
                    'Idempotency key telah digunakan untuk request dengan payload atau rute berbeda.',
                    409
                );
            }

            // Identical payload: check retention expiry
            if ($existing->expires_at && $existing->expires_at->isPast()) {
                // Retention expired: DO NOT delete record to prevent duplicate mutation on retry!
                return ApiResponse::error(
                    'CATEGORY_IDEMPOTENCY_EXPIRED',
                    'Masa retensi idempotency key telah berakhir. Mutasi tidak dapat dijalankan ulang untuk mencegah mutasi ganda.',
                    409,
                    [
                        'idempotency_key' => $idempotencyKey,
                        'settled_status' => (int) $existing->response_status,
                        'expired_at' => $existing->expires_at->toIso8601String(),
                    ]
                );
            }

            // Within retention window: replay cached response safely
            return response()->json($existing->response_body, $existing->response_status)
                ->header('X-Idempotent-Replayed', 'true');
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
                    if ($existingAfterConflict->expires_at && $existingAfterConflict->expires_at->isPast()) {
                        return ApiResponse::error(
                            'CATEGORY_IDEMPOTENCY_EXPIRED',
                            'Masa retensi idempotency key telah berakhir. Mutasi tidak dapat dijalankan ulang untuk mencegah mutasi ganda.',
                            409,
                            [
                                'idempotency_key' => $idempotencyKey,
                                'settled_status' => (int) $existingAfterConflict->response_status,
                                'expired_at' => $existingAfterConflict->expires_at->toIso8601String(),
                            ]
                        );
                    }

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
            // Ambiguous failure: the business transaction may have already committed before the exception was thrown.
            // DO NOT delete the claim! Deleting the claim would allow client retry to execute a duplicate mutation.
            // Instead, finalize the claim as an ambiguous failure (500) with a safe error payload.
            $errorPayload = [
                'success' => false,
                'code' => 'CATEGORY_AMBIGUOUS_MUTATION_FAILURE',
                'message' => 'Terjadi kendala sistem saat pemrosesan mutasi. Transaksi diverifikasi untuk mencegah mutasi ganda.',
            ];

            CategoryIdempotencyRecord::where('id', $claimId)
                ->where('response_status', 0)
                ->update([
                    'response_status' => 500,
                    'response_body' => $errorPayload,
                    'expires_at' => now()->addHours(24),
                ]);

            throw $t;
        }

        // 4. Finalize idempotent response with ownership fencing
        $statusCode = $response->getStatusCode();
        $responseBody = json_decode($response->getContent(), true);

        if (! is_array($responseBody)) {
            $responseBody = [
                'success' => $statusCode < 400,
                'code' => $statusCode >= 500 ? 'CATEGORY_SERVER_ERROR' : 'CATEGORY_RESPONSE',
                'raw_content' => (string) $response->getContent(),
            ];
        }

        // Finalize record regardless of whether status is 2xx, 4xx, or 5xx.
        // Recording 5xx status prevents subsequent retries from creating a duplicate mutation
        // if the business transaction committed before returning the 5xx response.
        CategoryIdempotencyRecord::where('id', $claimId)
            ->where('response_status', 0)
            ->update([
                'response_status' => $statusCode,
                'response_body' => $responseBody,
                'expires_at' => now()->addHours(24),
            ]);

        return $response;
    }
}

