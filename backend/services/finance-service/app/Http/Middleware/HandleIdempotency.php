<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class HandleIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        if (empty($idempotencyKey)) {
            return $next($request);
        }

        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');
        $actorKey = $actor && ! $actor->isGuest ? (string) ($actor->organizationId ?: $actor->id) : ($request->ip() ?: 'anonymous');
        $routeKey = $request->method() . ':' . $request->path();
        $requestHash = hash('sha256', $request->getContent() ?: '');

        // 1. Look up existing idempotency record
        try {
            $existing = DB::table('service_idempotency_records')
                ->where('actor_key', $actorKey)
                ->where('route_key', $routeKey)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                if ($existing->expires_at && now()->isAfter($existing->expires_at)) {
                    DB::table('service_idempotency_records')->where('id', $existing->id)->delete();
                } else {
                    if ($existing->request_hash !== $requestHash) {
                        return ApiResponse::error(
                            'SERVICE_IDEMPOTENCY_KEY_REUSED',
                            'Idempotency-Key telah digunakan untuk payload permintaan yang berbeda.',
                            409
                        );
                    }

                    $body = json_decode($existing->response_body, true);
                    return response()->json($body, (int) $existing->response_status);
                }
            }
        } catch (\Throwable $e) {
            // If table doesn't exist yet or DB issue, proceed without breaking
        }

        $response = $next($request);

        // 2. Save response if 2xx or 4xx
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 500) {
            try {
                DB::table('service_idempotency_records')->insert([
                    'id' => (string) Str::uuid(),
                    'actor_key' => $actorKey,
                    'route_key' => $routeKey,
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash,
                    'response_status' => $response->getStatusCode(),
                    'response_body' => $response->getContent(),
                    'expires_at' => now()->addHours(24),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Throwable $e) {
                // Ignore duplicate race insert error
            }
        }

        return $response;
    }
}
