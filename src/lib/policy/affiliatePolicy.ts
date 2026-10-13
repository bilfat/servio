import {
  AffiliateEligibilityStatus,
  MerchantOrderStatus,
  AffiliateFeePolicy,
  MerchantProfile,
} from "@/types/domain";

export interface AffiliatePolicyConfig {
  workerPointsPerThousandIdr: number;
  providerPointsPerThousandIdr: number;
  workerMinPoints: number;
  providerMinPoints: number;
  workerCommissionPercent: number;
  providerCommissionPercent: number;
}

export const DEFAULT_AFFILIATE_POLICY: AffiliatePolicyConfig = {
  workerPointsPerThousandIdr: 1, // 1 point per Rp 1.000 harga suku cadang
  providerPointsPerThousandIdr: 1, // 1 point per Rp 1.000 harga suku cadang untuk bengkel
  workerMinPoints: 30, // Default deterministic mock policy: Worker reward 30 pts
  providerMinPoints: 50, // Default deterministic mock policy: Provider reward 50 pts
  workerCommissionPercent: 2.5, // 2.5% komisi insentif teknisi
  providerCommissionPercent: 5.0, // 5% komisi kemitraan bengkel
};

/**
 * Locked Section 109: Initial Policy Defaults
 */
export const DEFAULT_AFFILIATE_FEE_POLICY: AffiliateFeePolicy = {
  feePolicyId: "fee-pol-001",
  rate: 0.05, // 5% of Eligible Product Subtotal
  basis: "ELIGIBLE_PRODUCT_SUBTOTAL",
  allowedMinRate: 0.01, // 1%
  allowedMaxRate: 0.10, // 10%
  providerSharePercent: 60, // 60% of Affiliate Fee economics
  workerSharePercent: 40, // 40% of Affiliate Fee economics
  pointsPerThousandIdr: 10, // 100 Points = Rp 10.000 (1 Point = Rp 100)
  effectiveFrom: "2026-09-23",
  policyVersion: "AFF-001",
  status: "ACTIVE",
  createdBy: "CEO / Platform Governance",
  createdAt: "2026-09-23T00:00:00Z",
};

export interface AffiliateEconomicsResult {
  affiliateFeeAmount: number;
  providerRewardAmount: number;
  workerRewardAmount: number;
  providerPoints: number;
  workerPoints: number;
  feeRate: number;
  policyVersion: string;
  netMerchantSettlement: number;
}

/**
 * Section 16, 23, 24, 92: Canonical Affiliate Economics Calculation
 * Customer Surcharge: Rp 0 (Not charged to customer).
 * Merchant Settlement: Gross - Affiliate Fee.
 */
export function calculateAffiliateEconomics(
  productPrice: number,
  feePolicy: AffiliateFeePolicy = DEFAULT_AFFILIATE_FEE_POLICY
): AffiliateEconomicsResult {
  const safePrice = Math.max(0, productPrice);
  const affiliateFeeAmount = Math.round(safePrice * feePolicy.rate);
  const providerRewardAmount = Math.round((affiliateFeeAmount * feePolicy.providerSharePercent) / 100);
  const workerRewardAmount = affiliateFeeAmount - providerRewardAmount;

  // 100 Points = Rp 10.000 reward value (1 point = Rp 100)
  const providerPoints = Math.round((providerRewardAmount * feePolicy.pointsPerThousandIdr) / 1000);
  const workerPoints = Math.round((workerRewardAmount * feePolicy.pointsPerThousandIdr) / 1000);

  return {
    affiliateFeeAmount,
    providerRewardAmount,
    workerRewardAmount,
    providerPoints,
    workerPoints,
    feeRate: feePolicy.rate,
    policyVersion: feePolicy.policyVersion,
    netMerchantSettlement: safePrice - affiliateFeeAmount,
  };
}

export interface AffiliateRewardCalculation {
  pointsWorker: number;
  pointsProvider: number;
  commissionAmountWorker: number;
  commissionAmountProvider: number;
  formulaDescription: string;
  economics?: AffiliateEconomicsResult;
}

/**
 * Menghitung estimasi poin dan komisi afiliasi secara terpusat berdasarkan policy Servio.
 * Mencegah hardcoding nominal poin di komponen UI.
 */
export function calculateAffiliateReward(
  productPrice: number,
  config: AffiliatePolicyConfig = DEFAULT_AFFILIATE_POLICY,
  feePolicy: AffiliateFeePolicy = DEFAULT_AFFILIATE_FEE_POLICY
): AffiliateRewardCalculation {
  const safePrice = Math.max(0, productPrice);
  const thousandUnits = Math.floor(safePrice / 1000);

  const pointsWorker = Math.max(
    config.workerMinPoints,
    thousandUnits * config.workerPointsPerThousandIdr
  );

  const pointsProvider = Math.max(
    config.providerMinPoints,
    thousandUnits * config.providerPointsPerThousandIdr
  );

  const commissionAmountWorker = Math.round(
    (safePrice * config.workerCommissionPercent) / 100
  );

  const commissionAmountProvider = Math.round(
    (safePrice * config.providerCommissionPercent) / 100
  );

  const economics = calculateAffiliateEconomics(safePrice, feePolicy);

  return {
    pointsWorker,
    pointsProvider,
    commissionAmountWorker,
    commissionAmountProvider,
    economics,
    formulaDescription: `Policy ${feePolicy.policyVersion}: Fee ${(feePolicy.rate * 100).toFixed(0)}% (Prov ${feePolicy.providerSharePercent}% / Wrk ${feePolicy.workerSharePercent}%), 100 pts = Rp 10.000`,
  };
}

/**
 * Section 7 & 72: Merchant Affiliate Readiness Checklist
 */
export interface MerchantAffiliateChecklistItem {
  key: string;
  label: string;
  description: string;
  passed: boolean;
}

export function checkMerchantAffiliateReadiness(merchant?: MerchantProfile): {
  isEligible: boolean;
  checklist: MerchantAffiliateChecklistItem[];
  missingRequirements: string[];
} {
  if (!merchant) {
    return {
      isEligible: false,
      checklist: [],
      missingRequirements: ["Data profil merchant tidak ditemukan"],
    };
  }

  const checklist: MerchantAffiliateChecklistItem[] = [
    {
      key: "account_status",
      label: "Akun Merchant Terverifikasi",
      description: "Akun toko berstatus APPROVED oleh Admin/Ops platform Servio.",
      passed: merchant.status === "APPROVED",
    },
    {
      key: "business_profile",
      label: "Profil Bisnis Lengkap",
      description: "Nama toko, kategori, deskripsi, alamat, kontak, dan jam operasional valid.",
      passed: merchant.isProfileComplete,
    },
    {
      key: "product_catalog",
      label: "Katalog Suku Cadang Valid",
      description: "Memiliki produk suku cadang aktif dengan spesifikasi dan harga terdaftar.",
      passed: merchant.isProductCatalogValid,
    },
    {
      key: "fulfillment_capability",
      label: "Kesiapan Fulfillment & Stok",
      description: "Sistem operasional siap melakukan pick & pack pesanan tepat waktu.",
      passed: merchant.isFulfillmentReady,
    },
    {
      key: "settlement_info",
      label: "Informasi Rekening & Settlement",
      description: "Rekening bank penampungan terdaftar untuk pencairan dana hasil penjualan.",
      passed: merchant.isSettlementInfoComplete,
    },
    {
      key: "compliance_standing",
      label: "Bebas Sanksi & Penangguhan",
      description: "Tidak memiliki sanksi aktif atau isu kepatuhan yang mendiskualifikasi.",
      passed: !merchant.hasActiveSuspension,
    },
  ];

  const missingRequirements = checklist.filter((item) => !item.passed).map((item) => item.label);
  const isEligible = missingRequirements.length === 0;

  return {
    isEligible,
    checklist,
    missingRequirements,
  };
}

/**
 * Menentukan status eligibility reward berdasarkan siklus order suku cadang & rekomendasi.
 * Canonical Flow:
 * Recommendation Sent -> ELIGIBLE
 * Product Order Created -> PENDING
 * Product Order Delivered/Completed -> CONFIRMED
 * Order Cancelled / Returned / Refunded -> REVERSED / CANCELLED
 */
export function resolveAffiliateEligibilityStatus(
  orderStatus?: MerchantOrderStatus,
  hasProductOrder: boolean = false,
  isReturnedOrRefunded: boolean = false
): AffiliateEligibilityStatus {
  if (isReturnedOrRefunded || orderStatus === "RETURNED") {
    return "REVERSED";
  }

  if (orderStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (!hasProductOrder) {
    return "ELIGIBLE";
  }

  if (orderStatus === "COMPLETED" || orderStatus === "DELIVERED") {
    return "CONFIRMED";
  }

  return "PENDING";
}

/**
 * Helper informasi visual untuk status eligibility di UI Worker, Provider, dan Merchant.
 */
export function getAffiliateStatusBadgeInfo(status: AffiliateEligibilityStatus): {
  label: string;
  variant: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
  description: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        variant: "warning",
        description: "Pesanan suku cadang sedang diproses toko mitra. Poin akan dikonfirmasi setelah barang diterima.",
      };
    case "CONFIRMED":
    case "DISBURSED":
      return {
        label: "Confirmed",
        variant: "success",
        description: "Pesanan selesai dan barang diterima. Poin reward telah dikonfirmasi dan masuk saldo aktif.",
      };
    case "REVERSED":
      return {
        label: "Reversed",
        variant: "danger",
        description: "Pesanan suku cadang diretur atau refund. Reward dibatalkan sesuai kebijakan Servio.",
      };
    case "REVOKED":
      return {
        label: "Reversed (Retur)",
        variant: "danger",
        description: "Pesanan suku cadang diretur atau refund. Poin dibatalkan sesuai kebijakan retur.",
      };
    case "CANCELLED":
      return {
        label: "Dibatalkan",
        variant: "neutral",
        description: "Pesanan suku cadang dibatalkan sebelum pengiriman.",
      };
    case "ELIGIBLE":
    default:
      return {
        label: "Eligible",
        variant: "secondary",
        description: "Rekomendasi disetujui pelanggan. Menunggu pemrosesan pesanan toko rekanan.",
      };
  }
}
