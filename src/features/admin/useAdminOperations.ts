"use client";

import { useMemo, useState } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { MOCK_TAXONOMY_DOMAINS } from "@/mocks/taxonomy";

export function useAdminOperations() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  // Search & Filter local states
  const [kycRoleFilter, setKycRoleFilter] = useState<string>("ALL");
  const [kycStatusFilter, setKycStatusFilter] = useState<string>("ALL");
  const [kycSearchQuery, setKycSearchQuery] = useState<string>("");

  const [productStatusFilter, setProductStatusFilter] = useState<string>("ALL");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");

  const [orderTypeTab, setOrderTypeTab] = useState<"SERVICE" | "PRODUCT" | "B2B_PO" | "BOOKING">("SERVICE");
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");

  const [disputePriorityFilter, setDisputePriorityFilter] = useState<string>("ALL");
  const [disputeSearchQuery, setDisputeSearchQuery] = useState<string>("");

  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState<string>("ALL");
  const [inventorySearchQuery, setInventorySearchQuery] = useState<string>("");

  const [auditActionFilter, setAuditActionFilter] = useState<string>("ALL");
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");

  // =========================================================================
  // 1. DASHBOARD OVERVIEW AGGREGATIONS
  // =========================================================================
  const dashboardStats = useMemo(() => {
    const pendingKYC = repo.kycRecords.filter((k) => k.status === "PENDING_REVIEW").length;
    const openDisputes = repo.disputes.filter((d) => !d.status.startsWith("RESOLVED")).length;
    const pendingProductModeration = repo.productModerations.filter((p) => p.status === "PENDING").length;
    const pendingContentModeration = repo.contentModerations.filter((c) => c.status === "PENDING").length;

    // Fulfillment SLA risks
    const merchantAtRisk = repo.merchantFulfillments.filter((f) => f.status === "PICKING" || f.status === "PACKED").length;
    const supplierAtRisk = repo.supplierFulfillments.filter((f) => f.status === "STAGING" || f.status === "PALLETIZING").length;
    const totalFulfillmentAtRisk = merchantAtRisk + supplierAtRisk;

    // Shipping Exceptions
    const shippingExceptions = repo.merchantShipments.filter((s) => s.status === "DELIVERY_EXCEPTION" || s.status === "FAILED_ATTEMPT").length;

    // Inventory Safety Alerts
    const merchantLowStock = repo.merchantStocks.filter((s) => s.available <= s.minStockAlert).length;
    const supplierLowStock = repo.supplierProducts.filter((p) => p.stock <= (p.moq || 10) * 2).length;
    const totalInventoryAlerts = merchantLowStock + supplierLowStock;

    // Platform Volumes
    const totalServices = repo.orders.length;
    const totalProductOrders = repo.merchantOrders.length;
    const totalB2BPOs = repo.b2bPurchaseOrders.length;
    const totalBookings = repo.bookings.length;

    return {
      pendingKYC,
      openDisputes,
      pendingProductModeration,
      pendingContentModeration,
      totalFulfillmentAtRisk,
      shippingExceptions,
      totalInventoryAlerts,
      totalServices,
      totalProductOrders,
      totalB2BPOs,
      totalBookings,
    };
  }, [
    repo.kycRecords,
    repo.disputes,
    repo.productModerations,
    repo.contentModerations,
    repo.merchantFulfillments,
    repo.supplierFulfillments,
    repo.merchantShipments,
    repo.merchantStocks,
    repo.supplierProducts,
    repo.orders,
    repo.merchantOrders,
    repo.b2bPurchaseOrders,
    repo.bookings,
  ]);

  // =========================================================================
  // 2. FILTERED LISTS
  // =========================================================================

  // KYC
  const filteredKYC = useMemo(() => {
    return repo.kycRecords.filter((k) => {
      const matchRole = kycRoleFilter === "ALL" || kycRoleFilter === "" || k.userRole === kycRoleFilter;
      const matchStatus = kycStatusFilter === "ALL" || kycStatusFilter === "" || k.status === kycStatusFilter;
      const q = (kycSearchQuery || "").toLowerCase();
      const matchSearch =
        !q ||
        (k.userName || "").toLowerCase().includes(q) ||
        (k.userEmail || "").toLowerCase().includes(q) ||
        (k.organizationName || "").toLowerCase().includes(q) ||
        (k.idNumber || "").includes(q);
      return matchRole && matchStatus && matchSearch;
    });
  }, [repo.kycRecords, kycRoleFilter, kycStatusFilter, kycSearchQuery]);

  // Product Moderation
  const filteredProducts = useMemo(() => {
    return repo.productModerations.filter((p) => {
      const matchStatus = productStatusFilter === "ALL" || productStatusFilter === "" || p.status === productStatusFilter;
      const q = (productSearchQuery || "").toLowerCase();
      const matchSearch =
        !q ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.sellerName || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [repo.productModerations, productStatusFilter, productSearchQuery]);

  // Disputes
  const filteredDisputes = useMemo(() => {
    return repo.disputes.filter((d) => {
      const matchPriority = disputePriorityFilter === "ALL" || disputePriorityFilter === "" || d.priority === disputePriorityFilter;
      const q = (disputeSearchQuery || "").toLowerCase();
      const matchSearch =
        !q ||
        (d.id || "").toLowerCase().includes(q) ||
        (d.customerName || "").toLowerCase().includes(q) ||
        (d.providerName || "").toLowerCase().includes(q) ||
        (d.reason || "").toLowerCase().includes(q);
      return matchPriority && matchSearch;
    });
  }, [repo.disputes, disputePriorityFilter, disputeSearchQuery]);

  // Combined Platform Inventory Matrix
  const platformInventory = useMemo(() => {
    // 1. Merchant Stocks
    const merchantItems = repo.merchantStocks.map((s) => ({
      ownerRole: "MERCHANT" as const,
      ownerName: "Toko Suku Cadang Servio Sentosa",
      warehouseId: s.warehouseId,
      warehouseName: s.warehouseName,
      sku: s.sku,
      title: s.title,
      category: s.category,
      onHand: s.onHand,
      reserved: s.reserved,
      allocated: s.allocated,
      unavailable: s.unavailable,
      available: s.available,
      unit: s.unit,
      minStockAlert: s.minStockAlert,
      isLowStock: s.available <= s.minStockAlert,
    }));

    // 2. Supplier Stocks
    const supplierItems = repo.supplierProducts.map((p) => {
      const onHand = p.stock;
      const reserved = 10;
      const allocated = 5;
      const unavailable = 0;
      const available = Math.max(0, onHand - reserved - allocated - unavailable);
      return {
        ownerRole: "SUPPLIER" as const,
        ownerName: "Distributor Kompresor Nusantara",
        warehouseId: "wh-sup-01",
        warehouseName: "Gudang Logistik Pusat Cikarang",
        sku: p.sku,
        title: p.title,
        category: p.category,
        onHand,
        reserved,
        allocated,
        unavailable,
        available,
        unit: p.unit || "unit",
        minStockAlert: (p.moq || 10) * 2,
        isLowStock: available <= (p.moq || 10) * 2,
      };
    });

    const combined = [...merchantItems, ...supplierItems];

    return combined.filter((item) => {
      const matchWh = inventoryWarehouseFilter === "ALL" || inventoryWarehouseFilter === "" || item.warehouseId === inventoryWarehouseFilter;
      const q = (inventorySearchQuery || "").toLowerCase();
      const matchSearch =
        !q ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.sku || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.ownerName || "").toLowerCase().includes(q);
      return matchWh && matchSearch;
    });
  }, [repo.merchantStocks, repo.supplierProducts, inventoryWarehouseFilter, inventorySearchQuery]);

  // Combined Platform Returns
  const platformReturns = useMemo(() => {
    const customerReturns = repo.merchantReturns.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      customerName: r.customerName,
      productTitle: r.items.map((i) => i.title).join(", "),
      sku: r.items[0]?.sku || "-",
      quantity: r.items.reduce((sum, i) => sum + i.quantity, 0),
      reason: r.reason,
      photoUrl: r.evidencePhotoUrls?.[0] || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
      status: r.status,
      requestedAt: r.requestedAt,
      reviewedAt: r.inspectedAt,
      disposition: (r.items[0]?.disposition || "PENDING_INSPECTION") as string,
      returnChannel: "RETAIL_CUSTOMER" as const,
      orderType: "PRODUCT_ORDER",
      sellerName: "Toko Sinar AC Glodok",
    }));

    const b2bReturns = repo.supplierReturns.map((sr) => ({
      id: sr.id,
      orderId: sr.poNumber,
      orderNumber: sr.returnNumber,
      customerName: sr.buyerName,
      productTitle: sr.items.map((i) => i.title).join(", "),
      sku: sr.items[0]?.sku || "-",
      quantity: sr.items.reduce((sum, i) => sum + i.quantity, 0),
      reason: sr.items[0]?.reason || "Klaim cacat pabrik B2B",
      photoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
      status: sr.status,
      requestedAt: sr.requestedAt,
      reviewedAt: sr.inspectedAt,
      disposition: "PENDING_INSPECTION" as const,
      returnChannel: "B2B_SUPPLIER" as const,
      orderType: "B2B_PURCHASE_ORDER",
      sellerName: "Distributor Kompresor Nusantara",
    }));

    return [...customerReturns, ...b2bReturns];
  }, [repo.merchantReturns, repo.supplierReturns]);

  // Combined Fulfillment Queue
  const platformFulfillments = useMemo(() => {
    const mFul = repo.merchantFulfillments.map((f) => ({
      id: f.id,
      orderId: f.orderId,
      channel: "RETAIL_MERCHANT" as const,
      entityName: "Toko Suku Cadang Servio Sentosa",
      itemsCount: f.items.length,
      itemSummary: f.items.map((i) => `${i.title} (${i.quantity}x)`).join(", "),
      status: f.status,
      slaTargetMinutes: 120,
      elapsedMinutes: f.status === "PACKED" ? 85 : 45,
      slaStatus: (f.status === "PACKED" ? "ON_TIME" : "AT_RISK") as "ON_TIME" | "AT_RISK" | "BREACHED",
    }));

    const sFul = repo.supplierFulfillments.map((f) => ({
      id: f.id,
      orderId: f.poNumber,
      channel: "B2B_SUPPLIER" as const,
      entityName: "Distributor Kompresor Nusantara",
      itemsCount: f.items.length,
      itemSummary: f.items.map((i) => `${i.title} (${i.requestedQty}x)`).join(", "),
      status: f.status,
      slaTargetMinutes: 240,
      elapsedMinutes: 110,
      slaStatus: (f.status === "STAGING" ? "AT_RISK" : "ON_TIME") as "ON_TIME" | "AT_RISK" | "BREACHED",
    }));

    return [...mFul, ...sFul];
  }, [repo.merchantFulfillments, repo.supplierFulfillments]);

  // Audit Logs Filtered
  const filteredAuditLogs = useMemo(() => {
    return repo.auditLogs.filter((log) => {
      const matchAction = auditActionFilter === "ALL" || auditActionFilter === "" || log.action.includes(auditActionFilter);
      const q = (auditSearchQuery || "").toLowerCase();
      const matchSearch =
        !q ||
        (log.actorName || "").toLowerCase().includes(q) ||
        (log.action || "").toLowerCase().includes(q) ||
        (log.resource || "").toLowerCase().includes(q) ||
        (log.resourceId || "").toLowerCase().includes(q) ||
        (log.reason || "").toLowerCase().includes(q);
      return matchAction && matchSearch;
    });
  }, [repo.auditLogs, auditActionFilter, auditSearchQuery]);

  // =========================================================================
  // 3. ATOMIC OPERATIONAL ACTIONS
  // =========================================================================
  const evaluateKYC = (
    kycId: string,
    decision: "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION",
    reviewNotes: string
  ) => {
    return repo.evaluateKYC(kycId, decision, reviewNotes, user.name, user.id);
  };

  const moderateProduct = (
    id: string,
    decision: "APPROVED" | "REJECTED" | "REVISION_REQUIRED",
    reason?: string
  ) => {
    return repo.moderateProduct(id, decision, reason, user.name, user.id);
  };

  const moderateContent = (
    id: string,
    decision: "APPROVED" | "CENSORED",
    reason?: string
  ) => {
    return repo.moderateContent(id, decision, reason, user.name, user.id);
  };

  const escalateDispute = (
    disputeId: string,
    newPriority: "NORMAL" | "HIGH" | "URGENT",
    escalationNotes: string
  ) => {
    return repo.escalateDispute(disputeId, newPriority, escalationNotes, user.name, user.id);
  };

  const resolveDisputeToFinance = (
    disputeId: string,
    refundAmount: number,
    resolutionNotes: string
  ) => {
    return repo.resolveDisputeToFinance(disputeId, refundAmount, resolutionNotes, user.name, user.id);
  };

  const adjustInventoryOperational = (
    warehouseId: string,
    sku: string,
    deltaQty: number,
    reason: string
  ) => {
    return repo.adjustInventoryOperational(warehouseId, sku, deltaQty, reason, user.name, user.id);
  };

  return {
    repo,
    user,
    // Dashboard
    dashboardStats,
    // KYC
    kycRecords: filteredKYC,
    rawKycCount: repo.kycRecords.length,
    kycRoleFilter,
    setKycRoleFilter,
    kycStatusFilter,
    setKycStatusFilter,
    kycSearchQuery,
    setKycSearchQuery,
    evaluateKYC,
    // Taxonomy
    taxonomyDomains: MOCK_TAXONOMY_DOMAINS,
    // Services
    serviceOrders: repo.orders,
    // Products
    productModerations: filteredProducts,
    rawProductCount: repo.productModerations.length,
    productStatusFilter,
    setProductStatusFilter,
    productSearchQuery,
    setProductSearchQuery,
    moderateProduct,
    // Global Orders
    orderTypeTab,
    setOrderTypeTab,
    orderSearchQuery,
    setOrderSearchQuery,
    orderStatusFilter,
    setOrderStatusFilter,
    merchantOrders: repo.merchantOrders,
    b2bPurchaseOrders: repo.b2bPurchaseOrders,
    bookings: repo.bookings,
    // Disputes
    disputes: filteredDisputes,
    disputePriorityFilter,
    setDisputePriorityFilter,
    disputeSearchQuery,
    setDisputeSearchQuery,
    escalateDispute,
    resolveDisputeToFinance,
    // Warranties
    warranties: repo.warranties,
    // Inventory
    platformInventory,
    inventoryWarehouseFilter,
    setInventoryWarehouseFilter,
    inventorySearchQuery,
    setInventorySearchQuery,
    adjustInventoryOperational,
    // Fulfillment
    platformFulfillments,
    // Shipping
    merchantShipments: repo.merchantShipments,
    supplierShipments: repo.supplierShipments,
    shippingAdapters: repo.shippingAdapters,
    // Returns
    platformReturns,
    // Moderation
    contentModerations: repo.contentModerations,
    moderateContent,
    // Audit Logs
    auditLogs: filteredAuditLogs,
    auditActionFilter,
    setAuditActionFilter,
    auditSearchQuery,
    setAuditSearchQuery,
  };
}
