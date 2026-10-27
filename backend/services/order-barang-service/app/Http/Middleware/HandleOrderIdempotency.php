<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\IdempotencyRecord;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class HandleOrderIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        if (empty($idempotencyKey)) {
            return $next($request);
        }

        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');
        $actorScope = $actor ? "{$actor->role}:{$actor->id}" : ($request->ip() ?: 'anonymous');
        $routeKey = $request->method() . ':' . $request->path();
        $requestHash = hash('sha256', (string) $request->getContent());

        // Check existing idempotency record
        try {
            $existing = IdempotencyRecord::where('actor_scope', $actorScope)
                ->where('route_key', $routeKey)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                if ($existing->request_hash !== $requestHash) {
                    return ApiResponse::error(
                        'IDEMPOTENCY_CONFLICT',
                        'Idempotency-Key telah digunakan dengan payload yang berbeda.',
                        409
                    );
                }

                if ($existing->state === 'RESOLVED' && $existing->response_body !== null) {
                    return response()->json($existing->response_body, $existing->response_status ?? 200);
                }

                if ($existing->state === 'PENDING') {
                    return ApiResponse::error(
                        'REQUEST_IN_PROGRESS',
                        'Permintaan serupa sedang diproses. Silakan coba beberapa saat lagi.',
                        409
                    );
                }
            }

            // Register pending record
            $record = IdempotencyRecord::create([
                'id' => (string) \Illuminate\Support\Str::ulid(),
                'actor_scope' => $actorScope,
                'route_key' => $routeKey,
                'idempotency_key' => $idempotencyKey,
                'request_hash' => $requestHash,
                'state' => 'PENDING',
                'created_at' => now(),
                'expires_at' => now()->addHours(24),
            ]);
        } catch (\Throwable $e) {
            // If table doesn't exist yet or DB issue, proceed without blocking
            return $next($request);
        }

        /** @var Response $response */
        $response = $next($request);

        // Save response body if status is 2xx or 4xx
        try {
            if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 500) {
                $body = json_decode($response->getContent() ?: '{}', true);
                $record->update([
                    'state' => 'RESOLVED',
                    'response_status' => $response->getStatusCode(),
                    'response_body' => $body,
                ]);
            } else {
                $record->delete();
            }
        } catch (\Throwable) {
            // Ignore failure to update idempotency cache
        }

        return $response;
    }
}
