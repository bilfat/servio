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
            'finance.auth' => \App\Http\Middleware\AuthenticateFinanceActor::class,
            'finance.role' => \App\Http\Middleware\RequireFinanceRole::class,
            'finance.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
            'finance.demo' => \App\Http\Middleware\EnsureDemoMode::class,
            'finance.idempotency' => \App\Http\Middleware\HandleFinanceIdempotency::class,
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
                    'FINANCE_VALIDATION_FAILED',
                    'Validasi data keuangan gagal.',
                    422,
                    null,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'FINANCE_UNAUTHENTICATED',
                    403 => 'FINANCE_FORBIDDEN',
                    404 => 'FINANCE_RESOURCE_NOT_FOUND',
                    409 => 'FINANCE_CONFLICT',
                    422 => 'FINANCE_VALIDATION_FAILED',
                    428 => 'FINANCE_PRECONDITION_REQUIRED',
                    429 => 'FINANCE_RATE_LIMITED',
                    503 => 'DEPENDENCY_UNAVAILABLE',
                    default => 'FINANCE_HTTP_ERROR',
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan pada permintaan HTTP keuangan.',
                    $e->getStatusCode()
                );
            }
        });

        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $debug = config('app.debug', false);

                return ApiResponse::error(
                    'FINANCE_INTERNAL_SERVER_ERROR',
                    $debug ? $e->getMessage() : 'Terjadi kesalahan internal pada layanan keuangan.',
                    500,
                    $debug ? [
                        'exception' => get_class($e),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ] : null
                );
            }
        });
    })->create();
