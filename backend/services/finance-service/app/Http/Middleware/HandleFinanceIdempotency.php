<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class HandleFinanceIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        if (empty($idempotencyKey)) {
            return $next($request);
        }

        $bodyHash = hash('sha256', (string) $request->getContent());
        $cacheKey = 'finance_idempotency_' . hash('sha256', $idempotencyKey);

        $cached = Cache::get($cacheKey);
        if ($cached) {
            if ($cached['body_hash'] !== $bodyHash) {
                return ApiResponse::error(
                    'IDEMPOTENCY_KEY_REUSED',
                    'Idempotency-Key telah digunakan sebelumnya dengan payload data yang berbeda.',
                    409
                );
            }

            return response()->json($cached['response'], $cached['status']);
        }

        /** @var Response $response */
        $response = $next($request);

        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            $content = json_decode($response->getContent(), true);
            Cache::put($cacheKey, [
                'body_hash' => $bodyHash,
                'status' => $response->getStatusCode(),
                'response' => $content,
            ], now()->addHours(24));
        }

        return $response;
    }
}
