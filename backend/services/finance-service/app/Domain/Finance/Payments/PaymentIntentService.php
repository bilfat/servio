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
        $method = strtoupper($method);
        $normalizedMethod = str_contains($method, 'VA') ? 'VA' : 'QRIS';
        if (!in_array($method, ['QRIS', 'VA', 'MOCK_QRIS', 'MOCK_VA_BCA', 'MOCK_VA_BRI', 'MOCK_VA_BNI', 'MOCK_VA_MANDIRI', 'MOCK_VA_PERMATA'], true)) {
            throw new HttpException(422, 'Metode pembayaran tidak valid. Harus QRIS atau VA.');
        }
        $method = $normalizedMethod;

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

        return DB::transaction(function () use ($checkout, $method) {
            // Check for active intent
            $activeIntent = PaymentIntent::where('finance_checkout_id', $checkout->id)
                ->where('is_active', true)
                ->where('status', 'PENDING')
                ->first();

            if ($activeIntent) {
                // If same method and not expired, idempotent reuse
                if ($activeIntent->method === $method && now()->lt($activeIntent->expires_at)) {
                    return $activeIntent;
                }

                // If different method on active pending intent
                if ($activeIntent->method !== $method && now()->lt($activeIntent->expires_at)) {
                    throw new HttpException(409, 'Terdapat tagihan aktif lain yang sedang berjalan untuk checkout ini.');
                }

                // If expired, deactivate old intent
                if (now()->gte($activeIntent->expires_at)) {
                    $activeIntent->update(['status' => 'EXPIRED', 'is_active' => false]);
                }
            }

            $providerRef = 'MOCK-PAY-' . strtoupper(Str::random(12));
            $instruction = $method === 'QRIS'
                ? [
                    'type' => 'DEMO_QRIS',
                    'display_text' => 'SIMULASI - BUKAN UNTUK PEMBAYARAN NYATA',
                    'reference' => 'MOCK-QR-' . strtoupper(Str::random(8)),
                ]
                : [
                    'type' => 'DEMO_VA',
                    'bank_code' => 'BCA',
                    'va_number' => '88001' . mt_rand(10000000, 99999999),
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
