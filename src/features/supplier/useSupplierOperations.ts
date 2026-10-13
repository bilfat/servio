"use client";

import { useDomainRepository } from "@/lib/repository/domainRepository";
import {
  SupplierProduct,
  SupplierOrderStatus,
  SupplierFulfillment,
  SupplierShipment,
  SupplierReturnItem,
} from "@/types/domain";

export function useSupplierOperations() {
  const repo = useDomainRepository();

  const addProduct = (product: Omit<SupplierProduct, "id" | "updatedAt">) => {
    return repo.addSupplierProduct(product);
  };

  const adjustSupplierStock = (productId: string, quantity: number) => {
    repo.adjustSupplierStock(productId, quantity);
  };

  const updateOrderStatus = (poId: string, status: SupplierOrderStatus) => {
    repo.updateSupplierOrderStatus(poId, status);
  };

  const updateFulfillmentQC = (fulfillmentId: string, checkId: string, isPassed: boolean) => {
    repo.updateSupplierFulfillmentQC(fulfillmentId, checkId, isPassed);
  };

  const updateFulfillmentStatus = (fulfillmentId: string, status: SupplierFulfillment["status"]) => {
    repo.updateSupplierFulfillmentStatus(fulfillmentId, status);
  };

  const createShipmentManifest = (
    manifestData: Omit<SupplierShipment, "id" | "departureDate" | "manifestNumber"> & { manifestNumber?: string }
  ) => {
    return repo.createSupplierShipmentManifest(manifestData);
  };

  const inspectReturn = (
    returnId: string,
    condition: SupplierReturnItem["condition"],
    creditAmount: number,
    notes: string
  ) => {
    repo.inspectSupplierReturn(returnId, condition, creditAmount, notes);
  };

  const updateB2BPurchaseOrderStatus = (
    poId: string,
    status: Parameters<typeof repo.updatePurchaseOrderStatus>[1],
    options?: Parameters<typeof repo.updatePurchaseOrderStatus>[2]
  ) => {
    return repo.updatePurchaseOrderStatus(poId, status, {
      ...options,
      actorRole: options?.actorRole || "SUPPLIER",
    });
  };

  const addWarehouse = (warehouseData: Parameters<typeof repo.addSupplierWarehouse>[0]) => {
    return repo.addSupplierWarehouse(warehouseData);
  };

  const updateWarehouse = (id: string, updates: Parameters<typeof repo.updateSupplierWarehouse>[1]) => {
    return repo.updateSupplierWarehouse(id, updates);
  };

  const toggleWarehouseStatus = (id: string) => {
    return repo.toggleSupplierWarehouseStatus(id);
  };

  return {
    products: repo.supplierProducts,
    addProduct,
    adjustSupplierStock,
    orders: repo.supplierOrders,
    updateOrderStatus,
    fulfillments: repo.supplierFulfillments,
    updateFulfillmentQC,
    updateFulfillmentStatus,
    shipments: repo.supplierShipments,
    createShipmentManifest,
    returns: repo.supplierReturns,
    inspectReturn,
    b2bPurchaseOrders: repo.b2bPurchaseOrders,
    updateB2BPurchaseOrderStatus,
    warehouses: repo.supplierWarehouses,
    zones: repo.supplierWarehouseZones,
    addWarehouse,
    updateWarehouse,
    toggleWarehouseStatus,
  };
}
