<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Psr\Http\Message\RequestInterface;
use Symfony\Component\HttpFoundation\Response;

class CorrelationTraceMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-ID')
            ?: $request->header('X-Correlation-ID')
            ?: ('req-' . Str::uuid()->toString());

        $correlationId = $request->header('X-Correlation-ID') ?: $requestId;
        $route = $request->method() . ' /' . ltrim($request->path(), '/');
        $actorId = $request->header('X-Actor-User-Id');
        $actorRole = $request->header('X-Client-Role') ?: $request->header('X-Actor-Role');
        $clientRoute = $request->header('X-Client-Route');

        $request->attributes->set('request_id', $requestId);
        $request->attributes->set('correlation_id', $correlationId);
        $request->headers->set('X-Request-ID', $requestId);

        $this->ensureOutgoingCorrelationHook();

        try {
            Log::shareContext(array_filter([
                'request_id' => $requestId,
                'correlation_id' => $correlationId,
                'service' => 'identity-service',
                'route' => $route,
                'actor_id' => $actorId,
                'actor_role' => $actorRole,
                'client_route' => $clientRoute,
            ], static fn ($v) => $v !== null && $v !== ''));
        } catch (\Throwable) {
            // Non-blocking telemetry context
        }

        $startedAt = microtime(true);
        $response = $next($request);
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        if (method_exists($response->headers, 'set')) {
            $response->headers->set('X-Request-ID', $requestId);
        }

        $this->logNonSuccessResponse($request, $response, $requestId, $correlationId, $route, $durationMs);

        return $response;
    }

    private function logNonSuccessResponse(
        Request $request,
        Response $response,
        string $requestId,
        string $correlationId,
        string $route,
        int $durationMs
    ): void {
        try {
            $status = $response->getStatusCode();
            if ($status < 400) {
                return;
            }

            $cleanPath = ltrim($request->path(), '/');
            if ($status === 401 && in_array($cleanPath, ['api/v1/auth/me', 'api/v1/me'], true)) {
                return;
            }

            $errorCode = null;
            $message = "HTTP {$status} on {$route}";
            $rawContent = method_exists($response, 'getContent') ? $response->getContent() : '';
            if (is_string($rawContent) && $rawContent !== '' && str_starts_with(ltrim($rawContent), '{')) {
                $decoded = json_decode($rawContent, true);
                if (is_array($decoded)) {
                    $errorCode = $decoded['error']['code'] ?? $decoded['code'] ?? null;
                    $msg = $decoded['error']['message'] ?? $decoded['message'] ?? null;
                    if (is_string($msg) && $msg !== '') {
                        $message = $msg;
                    }
                }
            }

            $context = array_filter([
                'request_id' => $requestId,
                'correlation_id' => $correlationId,
                'service' => 'identity-service',
                'route' => $route,
                'http_status' => $status,
                'error_code' => $errorCode,
                'duration_ms' => $durationMs,
                'actor_id' => $request->header('X-Actor-User-Id'),
                'actor_role' => $request->header('X-Client-Role') ?: $request->header('X-Actor-Role'),
                'client_route' => $request->header('X-Client-Route'),
            ], static fn ($v) => $v !== null && $v !== '');

            if ($status >= 500) {
                Log::error($message, $context);
            } else {
                Log::warning($message, $context);
            }
        } catch (\Throwable) {
            // Never fail API responses because of telemetry logging
        }
    }

    private function ensureOutgoingCorrelationHook(): void
    {
        static $registeredFactoryId = null;
        try {
            $root = Http::getFacadeRoot();
            if (!is_object($root) || !method_exists($root, 'globalRequestMiddleware')) {
                return;
            }
            $oid = spl_object_id($root);
            if ($registeredFactoryId === $oid) {
                return;
            }
            $registeredFactoryId = $oid;

            $root->globalRequestMiddleware(function (RequestInterface $outgoing): RequestInterface {
                $host = $outgoing->getUri()->getHost();
                if (!in_array($host, ['127.0.0.1', 'localhost'], true) && !str_contains($host, 'servio')) {
                    return $outgoing;
                }
                if (!app()->bound('request')) {
                    return $outgoing;
                }
                $req = app('request');
                $reqId = $req?->attributes?->get('request_id');
                $corrId = $req?->attributes?->get('correlation_id');
                if (is_string($reqId) && $reqId !== '' && !$outgoing->hasHeader('X-Request-ID')) {
                    $outgoing = $outgoing->withHeader('X-Request-ID', $reqId);
                }
                if (is_string($corrId) && $corrId !== '' && !$outgoing->hasHeader('X-Correlation-ID')) {
                    $outgoing = $outgoing->withHeader('X-Correlation-ID', $corrId);
                }
                return $outgoing;
            });
        } catch (\Throwable) {
            // Non-blocking
        }
    }
}
