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
            'category.auth' => \App\Http\Middleware\AuthenticateCategoryActor::class,
            'category.perm' => \App\Http\Middleware\RequireCategoryPermission::class,
            'category.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
            'category.idempotency' => \App\Http\Middleware\HandleIdempotency::class,
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
                    'CATEGORY_VALIDATION_FAILED',
                    'Validasi data formulir gagal.',
                    422,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'CATEGORY_UNAUTHENTICATED',
                    403 => 'CATEGORY_PERMISSION_DENIED',
                    404 => 'CATEGORY_NOT_FOUND',
                    409 => 'CATEGORY_VERSION_CONFLICT',
                    422 => 'CATEGORY_VALIDATION_FAILED',
                    428 => 'CATEGORY_PRECONDITION_REQUIRED',
                    429 => 'CATEGORY_RATE_LIMITED',
                    503 => 'CATEGORY_REFERENCE_VERIFICATION_UNAVAILABLE',
                    default => 'CATEGORY_ERROR',
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan pada layanan kategori.',
                    $e->getStatusCode()
                );
            }
        });
    })->create();
