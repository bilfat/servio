"use client";

import { useState } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import {
  MerchantProduct,
  MerchantOrderStatus,
  MerchantFulfillmentStatus,
  MerchantShipment,
  MerchantReturnDisposition,
} from "@/types/domain";
import { inventoryApi, fulfillmentApi, returnsApi } from "@/lib/servioApi";

export type MerchantStoreStatus = "ONLINE_ACCEPTING" | "BUSY_DELAYED" | "TEMPORARY_CLOSED";

export function useMerchantOperations() {
  const repo = useDomainRepository();
  const [storeStatus, setStoreStatus] = useState<MerchantStoreStatus>("ONLINE_ACCEPTING");

  const updateStoreStatus = (newStatus: MerchantStoreStatus) => {
    setStoreStatus(newStatus);
  };

  const addProduct = (product: Omit<MerchantProduct, "id" | "createdAt" | "updatedAt">) => {
    return repo.addMerchantProduct(product);
  };

  const updateProduct = (id: string, updates: Partial<MerchantProduct>) => {
    repo.updateMerchantProduct(id, updates);
  };

  const updateOrderStatus = (orderId: string, status: MerchantOrderStatus) => {
    repo.updateMerchantOrderStatus(orderId, status);
  };

  const adjustStock = (
    productId: string,
    warehouseId: string,
    quantity: number,
    type: "RESTOCK" | "DAMAGE" | "AUDIT_CORRECTION" | "TRANSFER",
    reason: string
  ) => {
    // 1. Optimistic UI update
    repo.adjustMerchantStock(productId, warehouseId, quantity, type, reason);
    // 2. Canonical backend call
    inventoryApi.adjust({
      variantId: productId,
      quantity,
      type,
      reason,
    }).catch((err) => {
      console.warn("Backend inventory adjust async sync:", err);
    });
  };

  const updateFulfillmentStatus = (
    fulfillmentId: string,
    status: MerchantFulfillmentStatus,
    boxDimensions?: { lengthCm: number; widthCm: number; heightCm: number; weightKg: number }
  ) => {
    repo.updateMerchantFulfillmentStatus(fulfillmentId, status, boxDimensions);
    if (status === "PACKED") {
      fulfillmentApi.pack(fulfillmentId).catch(() => {});
    }
  };

  const dispatchShipment = (
    shipmentData: Omit<MerchantShipment, "id" | "dispatchedAt" | "checkpoints">
  ) => {
    return repo.dispatchMerchantShipment(shipmentData);
  };

  const inspectReturn = (
    returnId: string,
    disposition: MerchantReturnDisposition,
    acceptedQty: number,
    rejectedQty: number,
    notes: string,
    refundAmount: number
  ) => {
    repo.inspectMerchantReturn(returnId, disposition, acceptedQty, rejectedQty, notes, refundAmount);
    returnsApi.inspect(returnId, {
      inventoryDisposition: disposition,
      notes,
    }).catch(() => {});
  };

  const createPurchaseOrder = (
    poData: Parameters<typeof repo.createPurchaseOrder>[0]
  ) => {
    return repo.createPurchaseOrder(poData);
  };

  const updatePurchaseOrderStatus = (
    poId: string,
    status: Parameters<typeof repo.updatePurchaseOrderStatus>[1],
    options?: Parameters<typeof repo.updatePurchaseOrderStatus>[2]
  ) => {
    return repo.updatePurchaseOrderStatus(poId, status, {
      ...options,
      actorRole: options?.actorRole || "MERCHANT",
    });
  };

  const confirmPurchaseOrderReceiving = (
    poId: string,
    receiving: Parameters<typeof repo.confirmPurchaseOrderReceiving>[1]
  ) => {
    return repo.confirmPurchaseOrderReceiving(poId, receiving);
  };

  const addWarehouse = (
    warehouseData: Parameters<typeof repo.addMerchantWarehouse>[0]
  ) => {
    return repo.addMerchantWarehouse(warehouseData);
  };

  const updateWarehouse = (
    id: string,
    updates: Parameters<typeof repo.updateMerchantWarehouse>[1]
  ) => {
    return repo.updateMerchantWarehouse(id, updates);
  };

  const toggleWarehouseStatus = (id: string) => {
    return repo.toggleMerchantWarehouseStatus(id);
  };

  return {
    storeStatus,
    updateStoreStatus,
    products: repo.merchantProducts,
    addProduct,
    updateProduct,
    orders: repo.merchantOrders,
    updateOrderStatus,
    warehouses: repo.merchantWarehouses,
    addWarehouse,
    updateWarehouse,
    toggleWarehouseStatus,
    stocks: repo.merchantStocks,
    stockMovements: repo.merchantStockMovements,
    adjustStock,
    fulfillments: repo.merchantFulfillments,
    updateFulfillmentStatus,
    shipments: repo.merchantShipments,
    dispatchShipment,
    returns: repo.merchantReturns,
    inspectReturn,
    settlements: repo.merchantSettlements,
    b2bSuppliers: repo.b2bSuppliers,
    b2bSupplierOffers: repo.b2bSupplierOffers,
    b2bPurchaseOrders: repo.b2bPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    confirmPurchaseOrderReceiving,
  };
}
