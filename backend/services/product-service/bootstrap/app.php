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
        $middleware->alias([
            'product.auth' => \App\Http\Middleware\AuthenticateProductActor::class,
            'product.perm' => \App\Http\Middleware\RequireProductPermission::class,
            'product.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
            'product.idempotency' => \App\Http\Middleware\HandleIdempotency::class,
        ]);

        $middleware->statefulApi();

        $middleware->validateCsrfTokens(except: [
            'internal/*',
            'api/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'PRODUCT_VALIDATION_FAILED',
                    'Validasi data formulir gagal.',
                    422,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'PRODUCT_UNAUTHENTICATED',
                    403 => 'PRODUCT_ACCESS_DENIED',
                    404 => 'PRODUCT_NOT_FOUND',
                    409 => 'PRODUCT_VERSION_CONFLICT',
                    413 => 'PRODUCT_MEDIA_TOO_LARGE',
                    415 => 'PRODUCT_MEDIA_UNSUPPORTED',
                    422 => 'PRODUCT_VALIDATION_FAILED',
                    428 => 'PRODUCT_PRECONDITION_REQUIRED',
                    429 => 'PRODUCT_RATE_LIMITED',
                    503 => 'PRODUCT_SERVICE_UNAVAILABLE',
                    default => 'PRODUCT_ERROR',
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan pada layanan produk.',
                    $e->getStatusCode()
                );
            }
        });
    })->create();
