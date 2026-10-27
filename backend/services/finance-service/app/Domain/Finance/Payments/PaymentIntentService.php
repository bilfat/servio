<?php

namespace App\Domain\Finance\Payments;

use App\Models\FinanceCheckout;
use App\Models\PaymentIntent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PaymentIntentService
{
    /**
     * Issues or reuses a mock payment intent for a quoted checkout.
     *
     * @param string $checkoutGroupId
     * @param string $method 'QRIS' or 'VA'
     * @param string $quotePayloadHash
     * @param int|null $orderQuoteRevision
     * @return PaymentIntent
     */
    public function createPaymentIntent(string $checkoutGroupId, string $method, string $quotePayloadHash, ?int $orderQuoteRevision = null): PaymentIntent
    {
        $rawMethod = strtoupper($method);
        if (!in_array($rawMethod, ['QRIS', 'VA', 'MOCK_QRIS', 'MOCK_VA', 'MOCK_VA_BCA', 'MOCK_VA_BRI', 'MOCK_VA_BNI', 'MOCK_VA_MANDIRI', 'MOCK_VA_PERMATA'], true)) {
            throw new HttpException(422, 'Metode pembayaran tidak valid. Harus QRIS atau VA.');
        }

        $bankCode = 'BCA';
        if (str_contains($rawMethod, 'BRI')) {
            $bankCode = 'BRI';
        } elseif (str_contains($rawMethod, 'BNI')) {
            $bankCode = 'BNI';
        } elseif (str_contains($rawMethod, 'MANDIRI')) {
            $bankCode = 'MANDIRI';
        } elseif (str_contains($rawMethod, 'PERMATA')) {
            $bankCode = 'PERMATA';
        }

        $method = str_contains($rawMethod, 'VA') ? 'VA' : 'QRIS';

        $checkout = FinanceCheckout::where('checkout_group_id', $checkoutGroupId)->first();
        if (!$checkout) {
            throw new HttpException(404, 'Checkout tidak ditemukan.');
        }

        if ($checkout->status === 'PAID') {
            throw new HttpException(409, 'Tagihan checkout ini telah lunas dibayar.');
        }

        if ($checkout->status === 'EXPIRED') {
            throw new HttpException(410, 'Tagihan checkout telah kedaluwarsa.');
        }

        if ($checkout->status === 'CANCELLED') {
            throw new HttpException(409, 'Tagihan checkout telah dibatalkan.');
        }

        // Snapshot hash consistency check
        if ($checkout->checkout_payload_hash !== $quotePayloadHash) {
            throw new HttpException(409, 'Snapshot data checkout telah berubah atau terkunci dengan versi berbeda.');
        }

        return DB::transaction(function () use ($checkout, $method, $bankCode) {
            // Check for active intent
            $activeIntent = PaymentIntent::where('finance_checkout_id', $checkout->id)
                ->where('is_active', true)
                ->where('status', 'PENDING')
                ->first();

            if ($activeIntent) {
                $existingBank = $activeIntent->instruction_payload['bank_code'] ?? null;
                $isSameBank = $method === 'QRIS' || $existingBank === $bankCode;

                // If same method and bank and not expired, idempotent reuse
                if ($activeIntent->method === $method && $isSameBank && now()->lt($activeIntent->expires_at)) {
                    return $activeIntent;
                }

                // If switching method or bank, deactivate old intent cleanly
                $activeIntent->update(['status' => 'CANCELLED', 'is_active' => false]);
            }

            $providerRef = 'MOCK-PAY-' . strtoupper(Str::random(12));
            $bankPrefix = match ($bankCode) {
                'BRI' => '88002',
                'BNI' => '88003',
                'MANDIRI' => '88004',
                'PERMATA' => '88005',
                default => '88001',
            };

            $instruction = $method === 'QRIS'
                ? [
                    'type' => 'DEMO_QRIS',
                    'display_text' => 'SIMULASI - BUKAN UNTUK PEMBAYARAN NYATA',
                    'reference' => 'MOCK-QR-' . strtoupper(Str::random(8)),
                ]
                : [
                    'type' => 'DEMO_VA',
                    'bank_code' => $bankCode,
                    'va_number' => $bankPrefix . mt_rand(10000000, 99999999),
                    'display_text' => 'SIMULASI - BUKAN UNTUK PEMBAYARAN NYATA',
                ];

            $intent = PaymentIntent::create([
                'finance_checkout_id' => $checkout->id,
                'method' => $method,
                'provider' => 'MOCK',
                'provider_reference' => $providerRef,
                'instruction_payload' => $instruction,
                'amount_idr' => $checkout->customer_payable_total_idr,
                'currency' => $checkout->currency,
                'status' => 'PENDING',
                'issued_at' => now(),
                'expires_at' => now()->addHours(6), // Exact 6-hour expiry
                'is_active' => true,
            ]);

            $checkout->update([
                'status' => 'PAYMENT_PENDING',
                'expires_at' => $intent->expires_at,
            ]);

            return $intent;
        });
    }

    public function getPayment(string $paymentId): PaymentIntent
    {
        $intent = PaymentIntent::with(['checkout.paymentAllocations'])->find($paymentId);
        if (!$intent) {
            throw new HttpException(404, 'Tagihan pembayaran tidak ditemukan.');
        }
        return $intent;
    }
}
