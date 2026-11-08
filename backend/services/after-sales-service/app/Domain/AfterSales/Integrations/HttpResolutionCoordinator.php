<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Integrations;

use App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseResolution;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class HttpResolutionCoordinator implements ResolutionCoordinatorInterface
{
    public function initiateExternalResolution(AfterSalesCase $case, CaseResolution $resolution): array
    {
        $solution = $resolution->solution_code;

        if ($solution === 'REFUND') {
            return $this->initiateRefund($case, $resolution);
        }

        if ($solution === 'REPLACEMENT') {
            return $this->initiateReplacement($case, $resolution);
        }

        if ($solution === 'REPAIR_GOODS') {
            throw new RuntimeException("Integrasi solusi REPAIR_GOODS saat ini ditangguhkan (BLOCKED): Modul 05A belum menyediakan kontrak alur perbaikan barang. Barang pengganti (REPLACEMENT) dilarang dikirimkan untuk perbaikan.");
        }

        if ($solution === 'REWORK') {
            return $this->initiateRework($case, $resolution);
        }

        throw new RuntimeException("Jenis solusi '{$solution}' tidak didukung untuk resolusi eksternal.");
    }

    protected function initiateRefund(AfterSalesCase $case, CaseResolution $resolution): array
    {
        $baseUrl = config('after_sales.services.finance.base_url', 'http://127.0.0.1:8006');
        $internalKey = config('after_sales.services.finance.internal_key', 'servio_local_internal_service_key_2026');
        $orderId = $case->source_merchant_order_id ?: $case->source_order_id;

        // Authoritative amount calculation strictly from verified order items (NO GUESSED DEFAULTS)
        if ($case->items->isEmpty()) {
            throw new InvalidArgumentException("Kasus tidak memiliki item pesanan yang valid untuk diproses pengembalian dana (REFUND_EMPTY_ITEMS).");
        }

        $calculatedAmount = 0;
        foreach ($case->items as $item) {
            $price = $item->catalog_snapshot['price']
                ?? $item->catalog_snapshot['unit_price']
                ?? $item->catalog_snapshot['unit_price_idr']
                ?? $item->catalog_snapshot['price_idr']
                ?? ($item->catalog_snapshot['variant_snapshot']['price_idr'] ?? null);

            if ($price === null || !is_numeric($price) || (int) $price <= 0) {
                throw new InvalidArgumentException("Item '{$item->source_item_ref}' tidak memiliki nominal harga transaksi yang valid dari pesanan asal. Nominal tebakan dilarang.");
            }

            $qty = (int) $item->quantity_requested;
            if ($qty <= 0) {
                throw new InvalidArgumentException("Kuantitas klaim untuk item '{$item->source_item_ref}' tidak valid ({$qty}).");
            }

            $calculatedAmount += ((int) $price * $qty);
        }

        if ($calculatedAmount <= 0) {
            throw new InvalidArgumentException("Total nominal pengembalian dana tidak valid ({$calculatedAmount}). Dilarang menggunakan nominal tebakan.");
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(5)->post("{$baseUrl}/internal/v1/finance/refunds/after-sales", [
                'case_id' => $case->id,
                'merchant_order_id' => $orderId,
                'customer_id' => $case->customer_id,
                'refund_amount_idr' => $calculatedAmount,
                'reason_code' => $case->reason_code,
                'idempotency_key' => 'after_sales_' . $case->id,
            ]);

            if ($response->successful()) {
                $data = $response->json()['data'] ?? [];
                $realRefundId = trim((string) ($data['refund_id'] ?? ''));
                $status = trim((string) ($data['status'] ?? ''));

                if (empty($realRefundId)) {
                    throw new RuntimeException("Layanan Finance (06) merespons sukses tetapi tidak mengembalikan refund_id otoritatif. Pembuatan resource ID fiktif dilarang.");
                }

                if (empty($status)) {
                    throw new RuntimeException("Layanan Finance (06) tidak mengembalikan status transaksi yang valid. Resolusi dibatalkan.");
                }

                return [
                    'external_id' => $realRefundId,
                    'external_status' => $status,
                    'target_service' => '06',
                    'purpose' => 'REFUND_DECISION',
                ];
            }

            Log::error("Failed to initiate refund with Finance 06: " . $response->body());
        } catch (Throwable $e) {
            Log::error("Exception initiating refund with Finance 06: " . $e->getMessage());
            if ($e instanceof InvalidArgumentException || $e instanceof RuntimeException) {
                throw $e;
            }
        }

        throw new RuntimeException("Gagal mendaftarkan permintaan refund ke Finance Service (06). Resolusi tidak dapat dimulai.");
    }

    protected function initiateReplacement(AfterSalesCase $case, CaseResolution $resolution): array
    {
        $baseUrl = config('after_sales.services.order_barang.base_url', 'http://127.0.0.1:8005');
        $internalKey = config('after_sales.services.order_barang.internal_key', 'servio_local_internal_service_key_2026');

        try {
            $itemsPayload = [];
            foreach ($case->items as $item) {
                $itemsPayload[] = [
                    'item_ref' => $item->source_item_ref,
                    'quantity' => $item->quantity_requested,
                    'catalog_snapshot' => $item->catalog_snapshot,
                ];
            }

            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(5)->post("{$baseUrl}/internal/v1/order-barang/replacements", [
                'case_id' => $case->id,
                'source_order_id' => $case->source_order_id,
                'merchant_org_id' => $case->owner_org_id,
                'customer_id' => $case->customer_id,
                'items' => $itemsPayload,
            ]);

            if ($response->successful()) {
                $data = $response->json()['data'] ?? [];
                $realReplacementId = trim((string) ($data['id'] ?? ''));
                $status = trim((string) ($data['status'] ?? ''));

                if (empty($realReplacementId)) {
                    throw new RuntimeException("Layanan Order Barang (05A) merespons sukses tetapi tidak mengembalikan fulfillment ID otoritatif. Pembuatan resource ID fiktif dilarang.");
                }

                return [
                    'external_id' => $realReplacementId,
                    'external_status' => $status ?: 'PREPARING',
                    'target_service' => '05A',
                    'purpose' => 'REPLACEMENT_FULFILLMENT',
                ];
            }

            Log::error("Failed to initiate replacement with Order Barang 05A: " . $response->body());
        } catch (Throwable $e) {
            Log::error("Exception initiating replacement with Order Barang 05A: " . $e->getMessage());
            if ($e instanceof RuntimeException) {
                throw $e;
            }
        }

        throw new RuntimeException("Gagal mendaftarkan replacement fulfillment ke Order Barang Service (05A). Resolusi tidak dapat dimulai.");
    }

    protected function initiateRework(AfterSalesCase $case, CaseResolution $resolution): array
    {
        $baseUrl = config('after_sales.services.order_jasa.base_url', 'http://127.0.0.1:8007');
        $internalKey = config('after_sales.services.order_jasa.internal_key', 'servio_local_internal_service_key_2026');

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(5)->post("{$baseUrl}/internal/v1/order-jasa/warranty-jobs", [
                'case_id' => $case->id,
                'source_order_id' => $case->source_order_id,
                'provider_org_id' => $case->owner_org_id,
                'customer_id' => $case->customer_id,
                'scope_description' => $case->description,
            ]);

            if ($response->successful()) {
                $data = $response->json()['data'] ?? [];
                $realJobId = trim((string) ($data['id'] ?? ''));
                $status = trim((string) ($data['status'] ?? ''));

                if (empty($realJobId)) {
                    throw new RuntimeException("Layanan Order Jasa (05B) merespons sukses tetapi tidak mengembalikan warranty job ID otoritatif. Pembuatan resource ID fiktif dilarang.");
                }

                return [
                    'external_id' => $realJobId,
                    'external_status' => $status ?: 'ASSIGNED',
                    'target_service' => '05B',
                    'purpose' => 'WARRANTY_JOB',
                ];
            }

            Log::error("Failed to initiate warranty job with Order Jasa 05B: " . $response->body());
        } catch (Throwable $e) {
            Log::error("Exception initiating warranty job with Order Jasa 05B: " . $e->getMessage());
            if ($e instanceof RuntimeException) {
                throw $e;
            }
        }

        throw new RuntimeException("Gagal mendaftarkan pekerjaan garansi ke Order Jasa Service (05B). Resolusi tidak dapat dimulai.");
    }

    public function verifyExternalCompletion(AfterSalesCase $case, CaseResolution $resolution, string $evidenceRef): bool
    {
        $solution = $resolution->solution_code;

        /** @var CaseExternalRef|null $extRef */
        $extRef = CaseExternalRef::where('case_id', $case->id)
            ->where('resolution_id', $resolution->id)
            ->first();

        if (!$extRef) {
            throw new RuntimeException("Kasus tidak memiliki catatan koordinasi eksternal (CaseExternalRef). Eksekusi resolusi belum pernah dimulai.");
        }

        if ($solution === 'REFUND') {
            return $this->verifyRefundCompletion($case, $extRef, $evidenceRef);
        }

        if ($solution === 'REPLACEMENT') {
            return $this->verifyReplacementCompletion($case, $extRef, $evidenceRef);
        }

        if ($solution === 'REPAIR_GOODS') {
            throw new RuntimeException("Verifikasi solusi REPAIR_GOODS saat ini ditangguhkan (BLOCKED): Modul 05A belum menyediakan kontrak alur perbaikan barang.");
        }

        if ($solution === 'REWORK') {
            return $this->verifyReworkCompletion($case, $extRef, $evidenceRef);
        }

        throw new RuntimeException("Solusi '{$solution}' tidak dikenal.");
    }

    protected function verifyRefundCompletion(AfterSalesCase $case, CaseExternalRef $extRef, string $evidenceRef): bool
    {
        $baseUrl = config('after_sales.services.finance.base_url', 'http://127.0.0.1:8006');
        $internalKey = config('after_sales.services.finance.internal_key', 'servio_local_internal_service_key_2026');
        $resourceId = $extRef->external_id;

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(4)->get("{$baseUrl}/internal/v1/finance/refunds/{$resourceId}");

            if ($response->successful()) {
                $data = $response->json()['data'] ?? [];
                $status = strtoupper((string) ($data['status'] ?? ''));
                $matchedCaseId = (string) ($data['case_id'] ?? '');
                $matchedCustomerId = (string) ($data['customer_id'] ?? '');

                if ($status === 'SUCCEEDED') {
                    if (empty($matchedCaseId) || $matchedCaseId !== $case->id) {
                        throw new RuntimeException("IDOR Mismatch: Resource refund {$resourceId} tidak terikat secara sah pada kasus {$case->id} (Ditemukan: '{$matchedCaseId}').");
                    }

                    if (!empty($matchedCustomerId) && $matchedCustomerId !== $case->customer_id) {
                        throw new RuntimeException("IDOR Mismatch: Resource refund {$resourceId} terikat pada customer {$matchedCustomerId}, bukan customer {$case->customer_id}.");
                    }

                    $extRef->update([
                        'external_status' => 'SUCCEEDED',
                        'last_checked_at' => now(),
                    ]);
                    return true;
                }

                throw new RuntimeException("Transaksi refund pada Finance 06 belum selesai (Status saat ini: '{$status}').");
            }
        } catch (RuntimeException $re) {
            throw $re;
        } catch (Throwable $e) {
            Log::warning("Finance refund verification request exception: " . $e->getMessage());
        }

        throw new RuntimeException("Verifikasi ke Finance Service (06) gagal: Bukti transaksi pengembalian dana tidak sah atau belum selesai.");
    }

    protected function verifyReplacementCompletion(AfterSalesCase $case, CaseExternalRef $extRef, string $evidenceRef): bool
    {
        $baseUrl = config('after_sales.services.order_barang.base_url', 'http://127.0.0.1:8005');
        $internalKey = config('after_sales.services.order_barang.internal_key', 'servio_local_internal_service_key_2026');
        $resourceId = $extRef->external_id;

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(4)->get("{$baseUrl}/internal/v1/order-barang/replacements/{$resourceId}");

            if ($response->successful()) {
                $data = $response->json()['data'] ?? [];
                $status = strtoupper((string) ($data['status'] ?? ''));
                $matchedCaseId = (string) ($data['case_id'] ?? '');

                if ($status === 'DELIVERED') {
                    if (empty($matchedCaseId) || $matchedCaseId !== $case->id) {
                        throw new RuntimeException("IDOR Mismatch: Replacement {$resourceId} tidak terikat secara sah pada kasus {$case->id} (Ditemukan: '{$matchedCaseId}').");
                    }

                    $extRef->update([
                        'external_status' => 'DELIVERED',
                        'last_checked_at' => now(),
                    ]);
                    return true;
                }

                throw new RuntimeException("Pengiriman barang pengganti pada Order Barang 05A belum selesai (Status saat ini: '{$status}').");
            }
        } catch (RuntimeException $re) {
            throw $re;
        } catch (Throwable $e) {
            Log::warning("Order barang replacement verification request exception: " . $e->getMessage());
        }

        throw new RuntimeException("Verifikasi ke Order Barang Service (05A) gagal: Bukti pengiriman pengganti tidak sah atau belum terkirim.");
    }

    protected function verifyReworkCompletion(AfterSalesCase $case, CaseExternalRef $extRef, string $evidenceRef): bool
    {
        $baseUrl = config('after_sales.services.order_jasa.base_url', 'http://127.0.0.1:8007');
        $internalKey = config('after_sales.services.order_jasa.internal_key', 'servio_local_internal_service_key_2026');
        $resourceId = $extRef->external_id;

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(4)->get("{$baseUrl}/internal/v1/order-jasa/warranty-jobs/{$resourceId}");

            if ($response->successful()) {
                $data = $response->json()['data'] ?? [];
                $status = strtoupper((string) ($data['status'] ?? ''));
                $matchedCaseId = (string) ($data['case_id'] ?? '');

                if ($status === 'COMPLETED') {
                    if (empty($matchedCaseId) || $matchedCaseId !== $case->id) {
                        throw new RuntimeException("IDOR Mismatch: Pekerjaan garansi {$resourceId} tidak terikat secara sah pada kasus {$case->id} (Ditemukan: '{$matchedCaseId}').");
                    }

                    $extRef->update([
                        'external_status' => 'COMPLETED',
                        'last_checked_at' => now(),
                    ]);
                    return true;
                }

                throw new RuntimeException("Pekerjaan perbaikan garansi pada Order Jasa 05B belum selesai (Status saat ini: '{$status}').");
            }
        } catch (RuntimeException $re) {
            throw $re;
        } catch (Throwable $e) {
            Log::warning("Order jasa warranty job verification request exception: " . $e->getMessage());
        }

        throw new RuntimeException("Verifikasi ke Order Jasa Service (05B) gagal: Bukti pekerjaan garansi tidak sah atau belum selesai.");
    }
}
