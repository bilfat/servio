<?php

use App\Support\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::group([], __DIR__.'/../routes/internal.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(\App\Http\Middleware\CorrelationTraceMiddleware::class);

        $middleware->alias([
            'order_jasa.auth' => \App\Http\Middleware\AuthenticateOrderJasaActor::class,
            'order_jasa.role' => \App\Http\Middleware\RequireOrderJasaRole::class,
            'order_jasa.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
            'order_jasa.idempotency' => \App\Http\Middleware\HandleOrderJasaIdempotency::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'ORDER_JASA_VALIDATION_FAILED',
                    'Validasi data pesanan jasa gagal.',
                    422,
                    null,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'ORDER_JASA_UNAUTHENTICATED',
                    403 => 'ORDER_JASA_FORBIDDEN',
                    404 => 'ORDER_JASA_RESOURCE_NOT_FOUND',
                    409 => 'ORDER_JASA_CONFLICT',
                    410 => 'PAYMENT_EXPIRED',
                    422 => 'ORDER_JASA_VALIDATION_FAILED',
                    428 => 'ORDER_JASA_PRECONDITION_REQUIRED',
                    429 => 'ORDER_JASA_RATE_LIMITED',
                    502 => 'GATEWAY_UPSTREAM_ERROR',
                    503 => 'DEPENDENCY_NOT_READY',
                    default => 'ORDER_JASA_HTTP_ERROR_'.$e->getStatusCode(),
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan HTTP pada Order Jasa Service.',
                    $e->getStatusCode()
                );
            }
        });

        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $statusCode = (int) $e->getCode();
                if ($statusCode < 400 || $statusCode > 599) {
                    $statusCode = 500;
                }

                /** @var \App\Support\AuthenticatedActor|null $actor */
                $actor = $request->attributes->get('actor');
                $actorTelemetry = $actor ? [
                    'id' => $actor->id,
                    'role' => $actor->role,
                    'org_id' => $actor->organizationId,
                ] : null;

                // Internal logging: full telemetry with request ID, never exposed to client
                \Illuminate\Support\Facades\Log::error('Unhandled exception in Order Jasa API: ' . $e->getMessage(), [
                    'exception_class' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'status_code' => $statusCode,
                    'url' => $request->path(),
                    'method' => $request->method(),
                    'actor' => $actorTelemetry,
                    'trace' => $e->getTraceAsString(),
                ]);

                // Sanitized public message: NEVER leak raw SQL, table names, or internal paths
                if ($statusCode === 500 || $e instanceof \Illuminate\Database\QueryException || $e instanceof \PDOException) {
                    return ApiResponse::error(
                        'ORDER_JASA_SERVER_ERROR',
                        'Terjadi kesalahan internal pada pemrosesan pesanan jasa. Silakan hubungi dukungan dengan menyertakan request_id.',
                        500
                    );
                }

                $code = match ($statusCode) {
                    401 => 'ORDER_JASA_UNAUTHENTICATED',
                    403 => 'ORDER_JASA_FORBIDDEN',
                    404 => 'ORDER_JASA_RESOURCE_NOT_FOUND',
                    409 => 'ORDER_JASA_CONFLICT',
                    410 => 'PAYMENT_EXPIRED',
                    422 => 'ORDER_JASA_VALIDATION_FAILED',
                    428 => 'ORDER_JASA_PRECONDITION_REQUIRED',
                    429 => 'ORDER_JASA_RATE_LIMITED',
                    502 => 'GATEWAY_UPSTREAM_ERROR',
                    503 => 'DEPENDENCY_NOT_READY',
                    default => 'ORDER_JASA_SERVER_ERROR',
                };

                return ApiResponse::error(
                    $code,
                    'Terjadi kesalahan pada pemrosesan permintaan.',
                    $statusCode
                );
            }
        });
    })->create();
