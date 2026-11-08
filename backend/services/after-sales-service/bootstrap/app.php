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
            'after_sales.auth' => \App\Http\Middleware\AuthenticateAfterSalesActor::class,
            'after_sales.role' => \App\Http\Middleware\RequireAfterSalesRole::class,
            'after_sales.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
            'after_sales.idempotency' => \App\Http\Middleware\HandleAfterSalesIdempotency::class,
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
                    'AFTER_SALES_VALIDATION_FAILED',
                    'Validasi data after-sales gagal.',
                    422,
                    null,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'AFTER_SALES_UNAUTHENTICATED',
                    403 => 'AFTER_SALES_FORBIDDEN',
                    404 => 'AFTER_SALES_NOT_FOUND',
                    409 => 'AFTER_SALES_CONFLICT',
                    422 => 'AFTER_SALES_UNPROCESSABLE',
                    429 => 'AFTER_SALES_TOO_MANY_REQUESTS',
                    default => 'AFTER_SALES_HTTP_ERROR',
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan pada permintaan.',
                    $e->getStatusCode()
                );
            }
        });
    })->create();

