<?php

namespace App\Http\Middleware;

use App\Models\ProductIdempotencyRecord;
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
                'PRODUCT_UNAUTHENTICATED',
                'Autentikasi diperlukan untuk operasi idempotency.',
                401
            );
        }

        $actorUserId = $actor->id;
        $payload = $request->getContent();
        $requestHash = hash('sha256', $request->method() . ':' . $request->path() . ':' . $payload);

        $existing = ProductIdempotencyRecord::where('actor_user_id', $actorUserId)
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing) {
            // 1. IN_PROGRESS claim:
            if ((int) $existing->response_status === 0) {
                return ApiResponse::error(
                    'PRODUCT_CONCURRENT_REQUEST',
                    'Permintaan mutasi dengan idempotency key yang sama sedang diproses.',
                    409
                );
            }

            // 2. Completed / settled record handling
            if ($existing->request_hash !== $requestHash) {
                return ApiResponse::error(
                    'PRODUCT_IDEMPOTENCY_KEY_REUSED',
                    'Idempotency key telah digunakan untuk request dengan payload atau rute berbeda.',
                    409
                );
            }

            // Identical payload: check retention expiry
            if ($existing->expires_at && $existing->expires_at->isPast()) {
                return ApiResponse::error(
                    'PRODUCT_IDEMPOTENCY_EXPIRED',
                    'Masa retensi idempotency key telah berakhir. Mutasi tidak dapat dijalankan ulang untuk mencegah mutasi ganda.',
                    409,
                    details: [
                        'idempotency_key' => $idempotencyKey,
                        'settled_status' => (int) $existing->response_status,
                        'expired_at' => $existing->expires_at->toIso8601String(),
                    ]
                );
            }

            // Replay cached response safely
            return response()->json($existing->response_body, $existing->response_status)
                ->header('X-Idempotent-Replayed', 'true');
        }

        // 3. Attempt atomic pre-claim before executing business mutation
        $claimId = (string) Str::uuid();
        try {
            ProductIdempotencyRecord::create([
                'id' => $claimId,
                'actor_user_id' => $actorUserId,
                'idempotency_key' => $idempotencyKey,
                'request_hash' => $requestHash,
                'response_status' => 0, // In progress marker
                'response_body' => ['status' => 'IN_PROGRESS'],
                'expires_at' => now()->addMinutes(15),
            ]);
        } catch (QueryException $e) {
            $existingAfterConflict = ProductIdempotencyRecord::where('actor_user_id', $actorUserId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingAfterConflict) {
                if ((int) $existingAfterConflict->response_status === 0) {
                    return ApiResponse::error(
                        'PRODUCT_CONCURRENT_REQUEST',
                        'Permintaan mutasi dengan idempotency key yang sama sedang diproses secara paralel.',
                        409
                    );
                }

                if ($existingAfterConflict->request_hash !== $requestHash) {
                    return ApiResponse::error(
                        'PRODUCT_IDEMPOTENCY_KEY_REUSED',
                        'Idempotency key telah digunakan untuk request berbeda.',
                        409
                    );
                }

                return response()->json($existingAfterConflict->response_body, $existingAfterConflict->response_status)
                    ->header('X-Idempotent-Replayed', 'true');
            }

            return ApiResponse::error(
                'PRODUCT_IDEMPOTENCY_CLAIM_FAILED',
                'Gagal mengamankan klaim idempotency.',
                409
            );
        }

        // Execute the actual mutation downstream
        $response = $next($request);

        // Finalize the record with actual response
        $status = $response->getStatusCode();
        $content = $response->getContent();
        $decoded = json_decode($content, true);

        ProductIdempotencyRecord::where('id', $claimId)->update([
            'response_status' => $status,
            'response_body' => is_array($decoded) ? $decoded : ['raw' => $content],
            'expires_at' => now()->addHours(24),
        ]);

        return $response;
    }
}
