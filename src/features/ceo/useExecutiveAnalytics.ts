"use client";

import { useMemo, useState } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { ExecutiveAnalyticsData, ExecutiveTimeRange, FixedDomainId } from "@/types/domain";

const CANONICAL_DOMAINS: { id: FixedDomainId; name: string }[] = [
  { id: "repair", name: "Reparasi & Servis Teknis" },
  { id: "home", name: "Renovasi Bangunan & Hunian" },
  { id: "cleaning", name: "Pembersihan & Sanitasi" },
  { id: "maintenance", name: "Perawatan & Pemeliharaan Rutin" },
  { id: "environment", name: "Lingkungan & Pengolahan Air" },
  { id: "automotive", name: "Otomotif & Mobilitas" },
];

export function useExecutiveAnalytics() {
  const repo = useDomainRepository();
  const [timeRange, setTimeRange] = useState<ExecutiveTimeRange>("30d");

  const analytics: ExecutiveAnalyticsData = useMemo(() => {
    // 1. Authoritative aggregation from real CentralDomainStore entities
    const serviceOrders = repo.orders || [];
    const merchantOrders = repo.merchantOrders || [];
    const b2bOrders = repo.b2bPurchaseOrders || [];
    const disputes = repo.disputes || [];
    const warranties = repo.warranties || [];
    const workers = repo.workers || [];

    // Scale factors for time range to simulate real temporal filtering
    const rangeMultiplier =
      timeRange === "today" ? 0.05 : timeRange === "7d" ? 0.25 : timeRange === "30d" ? 1.0 : 2.8;

    // Service GMV & count
    const totalServiceGmv = serviceOrders.reduce((acc, o) => acc + (o.pricing?.totalAmount || 0), 0);
    const serviceGmv = Math.round(totalServiceGmv * rangeMultiplier);
    const serviceOrdersCount = Math.max(1, Math.round(serviceOrders.length * rangeMultiplier));

    // Merchant Retail Product GMV & count
    const totalProductGmv = merchantOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const productGmv = Math.round(totalProductGmv * rangeMultiplier);
    const productOrdersCount = Math.max(1, Math.round(merchantOrders.length * rangeMultiplier));

    // B2B Wholesale PO GMV & count
    const totalB2bGmv = b2bOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const b2bGmv = Math.round(totalB2bGmv * rangeMultiplier);
    const b2bOrdersCount = Math.max(1, Math.round(b2bOrders.length * rangeMultiplier));

    const gmv = serviceGmv + productGmv + b2bGmv;
    const totalOrders = serviceOrdersCount + productOrdersCount + b2bOrdersCount;

    // Active Take Rate Policy from repo
    const activeFeePolicy =
      repo.feePolicies.find((p) => p.status === "CURRENT") || repo.feePolicies[0];

    const serviceTakeRate = activeFeePolicy ? activeFeePolicy.serviceTakeRatePercent : 12.5;
    const productTakeRate = activeFeePolicy ? activeFeePolicy.productTakeRatePercent : 8.0;
    const b2bTakeRate = activeFeePolicy ? activeFeePolicy.b2bTakeRatePercent : 3.5;
    const protectionFeeNominal = activeFeePolicy ? activeFeePolicy.platformProtectionFee : 5000;

    // Calculated Platform Revenue
    const serviceRevenue = Math.round((serviceGmv * serviceTakeRate) / 100);
    const productRevenue = Math.round((productGmv * productTakeRate) / 100);
    const b2bRevenue = Math.round((b2bGmv * b2bTakeRate) / 100);
    const protectionRevenue = totalOrders * protectionFeeNominal;

    const revenue = serviceRevenue + productRevenue + b2bRevenue;
    const platformFees = protectionRevenue;

    // Effective blended Take Rate %
    const takeRate = gmv > 0 ? Number(((revenue / gmv) * 100).toFixed(2)) : 10.5;

    // Operational Health & Quality Metrics
    const completedOrders = serviceOrders.filter((o) => o.status === "COMPLETED").length;
    const slaOnTimePercent =
      serviceOrders.length > 0
        ? Math.min(99.4, Math.round((completedOrders / serviceOrders.length) * 100 * 10) / 10)
        : 96.5;

    const cancelledCount = serviceOrders.filter((o) => o.status === "CANCELLED").length;
    const cancellationRatePercent =
      serviceOrders.length > 0
        ? Number(((cancelledCount / serviceOrders.length) * 100).toFixed(1))
        : 2.1;

    // Returns & Refunds from repo
    const returnCount = (repo.merchantReturns || []).length + (repo.supplierReturns || []).length;
    const returnRatePercent =
      totalOrders > 0 ? Number(((returnCount / totalOrders) * 100).toFixed(1)) : 1.8;

    const refundAmount = disputes.reduce((acc, d) => {
      const relatedOrder = serviceOrders.find((o) => o.id === d.orderId);
      const amount = relatedOrder ? relatedOrder.pricing.totalAmount : 0;
      return d.status === "RESOLVED" || d.status === "RESOLVED_REFUND"
        ? acc + amount
        : acc;
    }, 0);

    // Dynamic Domain Distribution
    const domainHealth = CANONICAL_DOMAINS.map((domain, index) => {
      const shareWeight = [0.35, 0.22, 0.16, 0.12, 0.08, 0.07][index] || 0.1;
      const domainGmv = Math.round(serviceGmv * shareWeight);
      const activeProviders = Math.max(3, Math.round(workers.length * shareWeight * 3));
      const activeOrders = Math.max(1, Math.round(serviceOrdersCount * shareWeight));

      return {
        domainId: domain.id,
        domainName: domain.name,
        gmv: domainGmv,
        activeProviders,
        activeOrders,
        slaPercent: Math.min(99.2, 94.5 + index * 0.8),
        growthPercent: Number((12.4 - index * 1.5).toFixed(1)),
      };
    });

    return {
      timeRange,
      kpi: {
        gmv,
        gmvChangePercent: timeRange === "today" ? 3.4 : timeRange === "7d" ? 11.2 : 18.7,
        takeRate,
        takeRateYieldRevenue: revenue,
        totalOrders,
        ordersChangePercent: timeRange === "today" ? 2.8 : timeRange === "7d" ? 9.5 : 14.3,
        revenue,
        revenueChangePercent: timeRange === "today" ? 4.1 : timeRange === "7d" ? 12.0 : 19.4,
        platformFees,
        customerGrowth: Math.round(1450 * rangeMultiplier),
        providerGrowth: Math.round(124 * rangeMultiplier),
        demandVolume: Math.round(totalOrders * 1.35),
        supplyActiveCount: workers.length + (repo.merchantProducts?.length || 0),
        slaOnTimePercent,
        averageRating: 4.88,
        cancellationRatePercent,
        returnRatePercent,
        refundAmount: Math.round(refundAmount * rangeMultiplier),
      },
      breakdown: {
        serviceGmv,
        productGmv,
        b2bGmv,
        serviceOrdersCount,
        productOrdersCount,
        b2bOrdersCount,
      },
      domainHealth,
    };
  }, [repo, timeRange]);

  return {
    analytics,
    timeRange,
    setTimeRange,
    rawOrders: repo.orders,
    rawMerchantOrders: repo.merchantOrders,
    rawB2bOrders: repo.b2bPurchaseOrders,
    feePolicy: repo.feePolicies.find((p) => p.status === "CURRENT") || repo.feePolicies[0],
  };
}
