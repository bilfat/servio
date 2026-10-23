<?php

namespace App\Domain\Finance\Pricing;

use App\Models\FeePolicyTarget;
use App\Models\FeePolicyVersion;
use App\Models\FinanceCheckout;
use App\Models\PaymentAllocation;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CheckoutPricingService
{
    /**
     * Calculate and persist a checkout quote from 05A Order Service.
     *
     * @param array $payload
     * @return FinanceCheckout
     */
    public function quoteCheckout(array $payload): FinanceCheckout
    {
        $checkoutGroupId = $payload['checkout_group_id'];
        $customerId = $payload['customer_id'];
        $currency = $payload['currency'] ?? 'IDR';
        $merchantOrders = $payload['merchant_orders'] ?? [];

        if (empty($merchantOrders)) {
            throw new HttpException(422, 'Daftar pesanan merchant (merchant_orders) tidak boleh kosong.');
        }

        // Canonical payload hash calculation
        $canonicalData = [
            'checkout_group_id' => $checkoutGroupId,
            'customer_id' => $customerId,
            'merchant_orders' => $merchantOrders,
        ];
        $payloadHash = hash('sha256', json_encode($canonicalData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        // Check if quote already exists for this checkout_group_id
        $existing = FinanceCheckout::where('checkout_group_id', $checkoutGroupId)->first();
        if ($existing) {
            // If already exists with matching payload hash, idempotent return
            if ($existing->checkout_payload_hash === $payloadHash) {
                return $existing->load('paymentAllocations');
            }
            // If exists with different payload hash
            throw new HttpException(409, 'Checkout group telah terkunci dengan snapshot data berbeda.');
        }

        // Fetch active fee policies
        $policies = $this->resolveActivePolicies();

        $appFeeTarget = $policies['CUSTOMER_PRODUCT_APP_FEE'] ?? null;
        $commissionTarget = $policies['MERCHANT_PRODUCT_COMMISSION'] ?? null;

        if (!$appFeeTarget || !$commissionTarget) {
            throw new HttpException(409, 'Kebijakan biaya platform (fee policy) belum dikonfigurasi aktif.');
        }

        $productSubtotalTotal = 0;
        $shippingTotal = 0;
        $discountTotal = 0;

        $allocationItems = [];

        foreach ($merchantOrders as $order) {
            $subtotal = (int) ($order['product_subtotal_idr'] ?? 0);
            $shipping = (int) ($order['shipping_customer_idr'] ?? 0);
            $discount = (int) ($order['discount_idr'] ?? 0);

            $productSubtotalTotal += $subtotal;
            $shippingTotal += $shipping;
            $discountTotal += $discount;

            $allocationItems[] = [
                'id' => $order['merchant_order_id'],
                'weight' => $subtotal,
            ];
        }

        // 1. Calculate Customer App Fee (Once per checkout group)
        $customerAppFeeTotal = 0;
        if ($appFeeTarget->fee_type === 'FIXED') {
            $customerAppFeeTotal = (int) ($appFeeTarget->fixed_amount_idr ?? 0);
        } elseif ($appFeeTarget->fee_type === 'PERCENTAGE') {
            $rate = (float) $appFeeTarget->percentage_rate;
            $customerAppFeeTotal = (int) round(($productSubtotalTotal * $rate) / 100);
        }

        // 2. Allocate Customer App Fee across merchant orders using Largest Remainder Method
        $allocatedAppFees = LargestRemainderAllocator::allocate($customerAppFeeTotal, $allocationItems);

        // 3. Build allocations and totals
        $allocationsToCreate = [];
        $rank = 1;
        $customerPayableSum = 0;

        foreach ($merchantOrders as $order) {
            $orderId = $order['merchant_order_id'];
            $subtotal = (int) ($order['product_subtotal_idr'] ?? 0);
            $shipping = (int) ($order['shipping_customer_idr'] ?? 0);
            $discount = (int) ($order['discount_idr'] ?? 0);
            $appFeeAllocated = $allocatedAppFees[$orderId] ?? 0;

            $discountBearer = strtoupper((string) ($order['discount_bearer'] ?? 'MERCHANT'));
            if (!in_array($discountBearer, ['MERCHANT', 'PLATFORM'], true)) {
                throw new HttpException(422, "Penanggung diskon '{$discountBearer}' tidak valid. Harus MERCHANT atau PLATFORM.");
            }

            // FIX 14: Platform subsidy funding validation
            if ($discountBearer === 'PLATFORM' && $discount > 0) {
                $subsidyEnabled = (bool) config('finance.platform_subsidy_enabled', false);
                if (!$subsidyEnabled) {
                    throw new HttpException(422, 'PENDING_POLICY: Sumber pendanaan subsidi diskon Platform belum dikonfigurasi aktif.');
                }
            }

            if ($discount > ($subtotal + $shipping)) {
                throw new HttpException(422, "Nominal diskon (Rp{$discount}) tidak boleh melebihi subtotal dan ongkos kirim pesanan.");
            }

            // Commission calculation per merchant order
            $commission = 0;
            if ($commissionTarget->fee_type === 'PERCENTAGE') {
                $cRate = (float) $commissionTarget->percentage_rate;
                $commission = (int) round(($subtotal * $cRate) / 100);
            } elseif ($commissionTarget->fee_type === 'FIXED') {
                $commission = (int) ($commissionTarget->fixed_amount_idr ?? 0);
            }

            $customerTotal = (int) ($subtotal + $shipping + $appFeeAllocated - $discount);

            // Merchant net entitlement adjusted based on discount bearer
            if ($discountBearer === 'MERCHANT') {
                $merchantNet = (int) (($subtotal - $discount) + $shipping - $commission);
            } else {
                // PLATFORM sponsored discount
                $merchantNet = (int) ($subtotal + $shipping - $commission);
            }

            if ($merchantNet < 0) {
                $merchantNet = 0;
            }

            $customerPayableSum += $customerTotal;

            $allocationsToCreate[] = [
                'merchant_order_id' => $orderId,
                'merchant_org_id' => $order['merchant_org_id'],
                'customer_id' => $customerId,
                'product_subtotal_idr' => $subtotal,
                'shipping_customer_idr' => $shipping,
                'app_fee_allocated_idr' => $appFeeAllocated,
                'customer_tax_allocated_idr' => 0,
                'discount_allocated_idr' => $discount,
                'customer_total_idr' => $customerTotal,
                'merchant_commission_idr' => $commission,
                'merchant_tax_or_withholding_idr' => 0,
                'merchant_net_entitlement_idr' => $merchantNet,
                'fee_snapshot' => [
                    'app_fee_target' => $appFeeTarget->toArray(),
                    'commission_target' => $commissionTarget->toArray(),
                    'discount_bearer' => $discountBearer,
                ],
                'allocation_rank' => $rank++,
                'status' => 'PENDING',
            ];
        }

        $overallPayableTotal = $productSubtotalTotal + $shippingTotal + $customerAppFeeTotal - $discountTotal;

        // Invariant assertion: sum of allocated customer totals must match overall customer payable total exactly
        if ($customerPayableSum !== $overallPayableTotal) {
            throw new HttpException(500, 'Integritas alokasi gagal: jumlah total alokasi tidak sama dengan total tagihan.');
        }

        return DB::transaction(function () use (
            $checkoutGroupId,
            $customerId,
            $currency,
            $productSubtotalTotal,
            $shippingTotal,
            $customerAppFeeTotal,
            $discountTotal,
            $overallPayableTotal,
            $appFeeTarget,
            $commissionTarget,
            $payloadHash,
            $allocationsToCreate
        ) {
            $checkout = FinanceCheckout::create([
                'checkout_group_id' => $checkoutGroupId,
                'customer_id' => $customerId,
                'currency' => $currency,
                'status' => 'QUOTED',
                'product_subtotal_idr' => $productSubtotalTotal,
                'shipping_total_idr' => $shippingTotal,
                'customer_app_fee_idr' => $customerAppFeeTotal,
                'customer_tax_total_idr' => 0,
                'discount_total_idr' => $discountTotal,
                'customer_payable_total_idr' => $overallPayableTotal,
                'pricing_policy_snapshot' => [
                    'customer_app_fee' => $appFeeTarget->toArray(),
                    'merchant_commission' => $commissionTarget->toArray(),
                ],
                'tax_snapshot' => [
                    'status' => 'MOCK_FIXTURE',
                    'tax_total_idr' => 0,
                ],
                'checkout_payload_hash' => $payloadHash,
                'expires_at' => now()->addHours(6),
                'quoted_at' => now(),
            ]);

            foreach ($allocationsToCreate as $allocData) {
                $allocData['finance_checkout_id'] = $checkout->id;
                PaymentAllocation::create($allocData);
            }

            return $checkout->load('paymentAllocations');
        });
    }

    /**
     * Resolves the active fee policy targets.
     *
     * @return array<string, FeePolicyTarget>
     */
    protected function resolveActivePolicies(): array
    {
        $now = now();

        $activeVersions = FeePolicyVersion::where('status', 'ACTIVE')
            ->where(function ($query) use ($now) {
                $query->whereNull('effective_from')->orWhere('effective_from', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('effective_until')->orWhere('effective_until', '>', $now);
            })
            ->with('targets')
            ->get();

        $resolved = [];
        foreach ($activeVersions as $version) {
            foreach ($version->targets as $target) {
                $resolved[$target->policy_code] = $target;
            }
        }

        // Require active CEO fee policies; reject if missing
        if (empty($resolved['CUSTOMER_PRODUCT_APP_FEE']) || empty($resolved['MERCHANT_PRODUCT_COMMISSION'])) {
            throw new HttpException(422, 'Tidak ada kebijakan tarif CEO yang aktif dan berlaku untuk checkout ini.');
        }

        return $resolved;
    }
}
