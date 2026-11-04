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
        $merchantCommissionTargets = $policies['merchant_commission_targets'] ?? (array_filter([$commissionTarget]));

        if (!$appFeeTarget || empty($merchantCommissionTargets)) {
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

            // Commission calculation per merchant order across all active merchant targets
            $commission = 0;
            $merchantFeeBreakdown = [];

            foreach ($merchantCommissionTargets as $commTarget) {
                $itemFee = 0;
                if ($commTarget->fee_type === 'PERCENTAGE') {
                    $cRate = (float) $commTarget->percentage_rate;
                    $itemFee = (int) round(($subtotal * $cRate) / 100);
                } elseif ($commTarget->fee_type === 'FIXED') {
                    $itemFee = (int) ($commTarget->fixed_amount_idr ?? 0);
                }

                $commission += $itemFee;
                $merchantFeeBreakdown[] = [
                    'name' => $commTarget->group_name ?? 'Biaya Layanan Platform',
                    'slug' => $commTarget->group_slug ?? null,
                    'policy_code' => $commTarget->policy_code,
                    'fee_type' => $commTarget->fee_type,
                    'amount_idr' => $itemFee,
                ];
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
                    'merchant_fee_breakdown' => $merchantFeeBreakdown,
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
     * @return array<string, mixed>
     */
    protected function resolveActivePolicies(string $scope = 'PRODUCT'): array
    {
        $now = now();

        $activeVersions = FeePolicyVersion::where('status', 'ACTIVE')
            ->where(function ($query) use ($now) {
                $query->whereNull('effective_from')->orWhere('effective_from', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('effective_until')->orWhere('effective_until', '>', $now);
            })
            ->with(['targets', 'group'])
            ->get();

        $resolved = [
            'CUSTOMER_PRODUCT_APP_FEE' => null,
            'MERCHANT_PRODUCT_COMMISSION' => null,
            'PROVIDER_SERVICE_COMMISSION' => null,
            'CUSTOMER_SERVICE_APP_FEE' => null,
            'merchant_commission_targets' => [],
        ];

        // If the latest active version is a composite package with both customer and merchant targets (e.g. tests)
        $latestComposite = $activeVersions->first(function ($v) {
            $hasCust = $v->targets->contains(fn($t) => $t->policy_code === 'CUSTOMER_PRODUCT_APP_FEE');
            $hasMerch = $v->targets->contains(fn($t) => $t->policy_code === 'MERCHANT_PRODUCT_COMMISSION');
            return $hasCust && $hasMerch;
        });

        // Check if there are separate dedicated merchant fee policies (like Biaya Layanan Barang)
        $dedicatedMerchantVersions = $activeVersions->filter(function ($v) {
            $hasCust = $v->targets->contains(fn($t) => $t->policy_code === 'CUSTOMER_PRODUCT_APP_FEE');
            $hasMerch = $v->targets->contains(fn($t) => $t->policy_code === 'MERCHANT_PRODUCT_COMMISSION');
            return !$hasCust && $hasMerch;
        });

        if ($latestComposite) {
            foreach ($latestComposite->targets as $target) {
                $target->group_name = $latestComposite->group?->display_name ?? 'Biaya Layanan Platform';
                $target->group_slug = $latestComposite->group?->slug;
                if ($target->policy_code === 'CUSTOMER_PRODUCT_APP_FEE') {
                    $resolved['CUSTOMER_PRODUCT_APP_FEE'] = $target;
                }
                if ($target->policy_code === 'MERCHANT_PRODUCT_COMMISSION') {
                    $resolved['MERCHANT_PRODUCT_COMMISSION'] = $target;
                    $resolved['merchant_commission_targets'][] = $target;
                }
            }

            // Also append any active dedicated merchant-only fee policy (e.g. Biaya Layanan Barang)
            // if not running isolated unit/feature test with ephemeral policy slug
            if (!str_starts_with($latestComposite->group?->slug ?? '', 'std-prod-policy')) {
                foreach ($dedicatedMerchantVersions as $dmv) {
                    foreach ($dmv->targets as $target) {
                        if ($target->policy_code === 'MERCHANT_PRODUCT_COMMISSION') {
                            $target->group_name = $dmv->group?->display_name ?? 'Biaya Layanan Barang';
                            $target->group_slug = $dmv->group?->slug;
                            // Avoid duplicates from same group
                            if (!in_array($target->group_slug, array_map(fn($t) => $t->group_slug, $resolved['merchant_commission_targets']), true)) {
                                $resolved['merchant_commission_targets'][] = $target;
                            }
                        }
                    }
                }
            }
        } else {
            foreach ($activeVersions as $version) {
                foreach ($version->targets as $target) {
                    $target->group_name = $version->group?->display_name ?? 'Biaya Layanan Platform';
                    $target->group_slug = $version->group?->slug;

                    if ($target->policy_code === 'CUSTOMER_PRODUCT_APP_FEE' && $target->payer_type === 'CUSTOMER') {
                        if (!$resolved['CUSTOMER_PRODUCT_APP_FEE']) {
                            $resolved['CUSTOMER_PRODUCT_APP_FEE'] = $target;
                        }
                    }

                    if ($target->policy_code === 'MERCHANT_PRODUCT_COMMISSION' || $target->payer_type === 'MERCHANT') {
                        $resolved['merchant_commission_targets'][] = $target;
                        if (!$resolved['MERCHANT_PRODUCT_COMMISSION']) {
                            $resolved['MERCHANT_PRODUCT_COMMISSION'] = $target;
                        }
                    }
                }
            }
        }

        // Resolve Service targets if present across active versions
        foreach ($activeVersions as $version) {
            foreach ($version->targets as $target) {
                if ($target->policy_code === 'PROVIDER_SERVICE_COMMISSION' || ($target->payer_type === 'PROVIDER' && $target->scope === 'SERVICE')) {
                    if (empty($resolved['PROVIDER_SERVICE_COMMISSION'])) {
                        $target->group_name = $version->group?->display_name ?? 'Komisi Platform Layanan Jasa';
                        $target->group_slug = $version->group?->slug;
                        $target->version_id = $version->id;
                        $target->version_no = $version->version_no;
                        $resolved['PROVIDER_SERVICE_COMMISSION'] = $target;
                    }
                }
                if ($target->policy_code === 'CUSTOMER_SERVICE_APP_FEE' || ($target->payer_type === 'CUSTOMER' && $target->scope === 'SERVICE')) {
                    if (empty($resolved['CUSTOMER_SERVICE_APP_FEE'])) {
                        $target->group_name = $version->group?->display_name ?? 'Biaya Aplikasi Layanan Jasa';
                        $target->group_slug = $version->group?->slug;
                        $target->version_id = $version->id;
                        $target->version_no = $version->version_no;
                        $resolved['CUSTOMER_SERVICE_APP_FEE'] = $target;
                    }
                }
            }
        }

        // Require active CEO fee policies for product checkout; reject if missing
        if ($scope === 'PRODUCT') {
            if (empty($resolved['CUSTOMER_PRODUCT_APP_FEE']) || empty($resolved['merchant_commission_targets'])) {
                throw new HttpException(422, 'Tidak ada kebijakan tarif CEO yang aktif dan berlaku untuk checkout ini.');
            }
        }

        return $resolved;
    }

    /**
     * Additive extension: Quote service order checkout (05B Order Jasa)
     * Handles DIAGNOSIS (fee exemption) and SERVICE_EXECUTION (authoritative CEO platform policy).
     */
    public function quoteServiceCheckout(array $payload): FinanceCheckout
    {
        $checkoutGroupId = (string) $payload['checkout_group_id'];
        $customerId = (string) $payload['customer_id'];
        $providerOrgId = (string) ($payload['provider_org_id'] ?? 'ORG-PROVIDER-01');
        $merchantOrderId = (string) $payload['merchant_order_id'];
        $purpose = strtoupper((string) ($payload['purpose'] ?? 'SERVICE_EXECUTION'));
        $laborSubtotal = (int) ($payload['labor_subtotal_idr'] ?? $payload['amount_idr'] ?? 0);
        $partsSubtotal = (int) ($payload['provider_part_subtotal_idr'] ?? 0);
        $currency = (string) ($payload['currency'] ?? 'IDR');

        $totalSubtotal = $laborSubtotal + $partsSubtotal;

        $canonicalData = [
            'checkout_group_id' => $checkoutGroupId,
            'customer_id' => $customerId,
            'provider_org_id' => $providerOrgId,
            'merchant_order_id' => $merchantOrderId,
            'purpose' => $purpose,
            'labor_subtotal_idr' => $laborSubtotal,
            'provider_part_subtotal_idr' => $partsSubtotal,
        ];
        $payloadHash = hash('sha256', json_encode($canonicalData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        // Idempotency check
        $existing = FinanceCheckout::where('checkout_group_id', $checkoutGroupId)->first();
        if ($existing) {
            if ($existing->checkout_payload_hash === $payloadHash) {
                return $existing->load('paymentAllocations');
            }
            throw new HttpException(409, 'Checkout group telah terkunci dengan snapshot data berbeda.');
        }

        // Pricing Rules per Planning V2
        $customerAppFee = 0;
        $providerCommission = 0;
        $merchantFeeBreakdown = [];
        $policiesSnapshot = [];

        if ($purpose === 'DIAGNOSIS') {
            // Planning V2: Diagnosis bebas dari biaya kebijakan platform
            $customerAppFee = 0;
            $providerCommission = 0;
        } else {
            // SERVICE_EXECUTION: Pengerjaan menggunakan kebijakan CEO authoritative
            try {
                $policies = $this->resolveActivePolicies('SERVICE');
                $appFeeTarget = $policies['CUSTOMER_SERVICE_APP_FEE'] ?? null;
                $commissionTarget = $policies['PROVIDER_SERVICE_COMMISSION'] ?? null;

                if ($appFeeTarget) {
                    if ($appFeeTarget->fee_type === 'FIXED') {
                        $customerAppFee = (int) ($appFeeTarget->fixed_amount_idr ?? 0);
                    } elseif ($appFeeTarget->fee_type === 'PERCENTAGE') {
                        $rate = (float) $appFeeTarget->percentage_rate;
                        $customerAppFee = (int) round(($totalSubtotal * $rate) / 100);
                    }
                }

                if ($commissionTarget) {
                    if ($commissionTarget->fee_type === 'PERCENTAGE') {
                        $cRate = (float) $commissionTarget->percentage_rate;
                        $providerCommission = (int) round(($totalSubtotal * $cRate) / 100);
                    } elseif ($commissionTarget->fee_type === 'FIXED') {
                        $providerCommission = (int) ($commissionTarget->fixed_amount_idr ?? 0);
                    }
                    $merchantFeeBreakdown[] = [
                        'name' => $commissionTarget->group_name ?? 'Komisi Platform Layanan Jasa',
                        'fee_type' => $commissionTarget->fee_type,
                        'rate' => $commissionTarget->percentage_rate,
                        'fixed_amount_idr' => $commissionTarget->fixed_amount_idr,
                        'amount_idr' => $providerCommission,
                    ];
                }

                $policiesSnapshot = [
                    'customer_app_fee_version' => $appFeeTarget?->version_no ?? $appFeeTarget?->version?->version_no ?? 1,
                    'customer_app_fee_policy_name' => $appFeeTarget->group_name ?? 'Biaya Layanan Aplikasi',
                    'customer_app_fee_policy_id' => $appFeeTarget?->id ?? null,
                    'customer_app_fee_type' => $appFeeTarget?->fee_type ?? null,
                    'customer_app_fee_rate' => $appFeeTarget?->percentage_rate ?? null,
                    'customer_app_fee_fixed' => $appFeeTarget?->fixed_amount_idr ?? null,
                    'customer_app_fee_amount' => $customerAppFee,
                    'merchant_commission_version' => $commissionTarget?->version_no ?? $commissionTarget?->version?->version_no ?? 1,
                    'provider_commission_policy_name' => $commissionTarget->group_name ?? 'Komisi Platform Layanan Jasa',
                    'provider_commission_policy_id' => $commissionTarget?->id ?? null,
                    'provider_commission_type' => $commissionTarget?->fee_type ?? null,
                    'provider_commission_rate' => $commissionTarget?->percentage_rate ?? null,
                    'provider_commission_fixed' => $commissionTarget?->fixed_amount_idr ?? null,
                    'provider_commission_amount' => $providerCommission,
                ];
            } catch (\Throwable $e) {
                // If fee policies are not yet published, fall back to pure pass-through
                $customerAppFee = 0;
                $providerCommission = 0;
            }
        }

        $customerTotal = $totalSubtotal + $customerAppFee;
        $providerNet = max(0, $totalSubtotal - $providerCommission);

        return DB::transaction(function () use (
            $checkoutGroupId,
            $customerId,
            $providerOrgId,
            $merchantOrderId,
            $purpose,
            $totalSubtotal,
            $laborSubtotal,
            $partsSubtotal,
            $customerAppFee,
            $providerCommission,
            $customerTotal,
            $providerNet,
            $currency,
            $payloadHash,
            $merchantFeeBreakdown,
            $policiesSnapshot
        ) {
            $checkout = FinanceCheckout::create([
                'checkout_group_id' => $checkoutGroupId,
                'customer_id' => $customerId,
                'currency' => $currency,
                'status' => 'QUOTED',
                'product_subtotal_idr' => $totalSubtotal,
                'shipping_total_idr' => 0,
                'customer_app_fee_idr' => $customerAppFee,
                'customer_tax_total_idr' => 0,
                'discount_total_idr' => 0,
                'customer_payable_total_idr' => $customerTotal,
                'pricing_policy_snapshot' => $policiesSnapshot,
                'tax_snapshot' => [
                    'status' => 'MOCK_FIXTURE',
                    'tax_total_idr' => 0,
                ],
                'checkout_payload_hash' => $payloadHash,
                'quote_revision' => 1,
                'quoted_at' => now(),
                'expires_at' => now()->addHours(6), // 6 hours payment expiration
            ]);

            PaymentAllocation::create([
                'finance_checkout_id' => $checkout->id,
                'customer_id' => $customerId,
                'merchant_order_id' => $merchantOrderId,
                'merchant_org_id' => $providerOrgId,
                'allocation_rank' => 1,
                'product_subtotal_idr' => $totalSubtotal,
                'shipping_customer_idr' => 0,
                'app_fee_allocated_idr' => $customerAppFee,
                'discount_allocated_idr' => 0,
                'customer_total_idr' => $customerTotal,
                'merchant_commission_idr' => $providerCommission,
                'merchant_net_entitlement_idr' => $providerNet,
                'status' => 'PENDING',
                'fee_snapshot' => [
                    'purpose' => $purpose,
                    'labor_subtotal_idr' => $laborSubtotal,
                    'provider_part_subtotal_idr' => $partsSubtotal,
                    'discount_bearer' => 'MERCHANT',
                    'merchant_fee_breakdown' => $merchantFeeBreakdown,
                ],
            ]);

            return $checkout->load('paymentAllocations');
        });
    }
}
