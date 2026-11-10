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
            'order.auth' => \App\Http\Middleware\AuthenticateOrderActor::class,
            'order.role' => \App\Http\Middleware\RequireOrderRole::class,
            'order.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
            'order.idempotency' => \App\Http\Middleware\HandleOrderIdempotency::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'ORDER_VALIDATION_FAILED',
                    'Validasi data pesanan gagal.',
                    422,
                    null,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'ORDER_UNAUTHENTICATED',
                    403 => 'ORDER_FORBIDDEN',
                    404 => 'ORDER_RESOURCE_NOT_FOUND',
                    409 => 'ORDER_CONFLICT',
                    410 => 'PAYMENT_EXPIRED',
                    422 => 'ORDER_VALIDATION_FAILED',
                    428 => 'ORDER_PRECONDITION_REQUIRED',
                    429 => 'ORDER_RATE_LIMITED',
                    502 => 'GATEWAY_UPSTREAM_ERROR',
                    503 => 'DEPENDENCY_UNAVAILABLE',
                    default => 'ORDER_HTTP_ERROR_'.$e->getStatusCode(),
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan HTTP pada Order Service.',
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

                $code = match ($statusCode) {
                    401 => 'ORDER_UNAUTHENTICATED',
                    403 => 'ORDER_FORBIDDEN',
                    404 => 'ORDER_RESOURCE_NOT_FOUND',
                    409 => 'ORDER_CONFLICT',
                    410 => 'PAYMENT_EXPIRED',
                    422 => 'ORDER_VALIDATION_FAILED',
                    428 => 'ORDER_PRECONDITION_REQUIRED',
                    429 => 'ORDER_RATE_LIMITED',
                    502 => 'GATEWAY_UPSTREAM_ERROR',
                    503 => 'DEPENDENCY_UNAVAILABLE',
                    default => 'ORDER_SERVER_ERROR',
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan pemrosesan pesanan.',
                    $statusCode
                );
            }
        });
    })->create();
