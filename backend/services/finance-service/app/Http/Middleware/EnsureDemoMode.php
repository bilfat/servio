<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDemoMode
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Production check
        if (app()->environment('production')) {
            return ApiResponse::error(
                'DEMO_ENDPOINT_DISABLED',
                'Simulator demo dinonaktifkan pada lingkungan produksi.',
                404
            );
        }

        // 2. Demo config check
        if (!config('finance.mock_payment_enabled') && !config('finance.mock_payout_enabled')) {
            return ApiResponse::error(
                'DEMO_ENDPOINT_DISABLED',
                'Mode simulasi pembayaran mock sedang dinonaktifkan.',
                404
            );
        }

        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        // Strictly restrict payment, payout, and bank verification simulations to FINANCE_PAYMENT_OPS ONLY!
        // CEO_PRODUCT_OWNER, CUSTOMER, MERCHANT, ADMIN_OPERATIONS, etc. are strictly forbidden.
        if (
            $request->is('*demo/payments*') ||
            $request->is('*demo/withdrawals*') ||
            $request->is('*verify-demo*') ||
            $request->is('*bank-destinations/*/verify-demo*')
        ) {
            if (!$actor || !$actor->isFinanceOps()) {
                return ApiResponse::error(
                    'DEMO_OPERATION_FORBIDDEN',
                    'Hanya pengguna dengan peran FINANCE_PAYMENT_OPS yang diizinkan melakukan simulasi operasi demo.',
                    403
                );
            }
        }

        return $next($request);
    }
}
