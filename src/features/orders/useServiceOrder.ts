"use client";

import { useState, useCallback } from "react";
import { OrderStatus } from "@/types/domain";
import { useDomainRepository, normalizeEntityId } from "@/lib/repository/domainRepository";
import { CUSTOMER_SCENARIOS_META } from "@/mocks/customerScenarios";

export function useServiceOrder(initialOrderId: string = "SRV-C06-ADJ-PRESENT") {
  const repo = useDomainRepository();
  const [orderId, setOrderId] = useState<string>(initialOrderId);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const foundOrder = repo.getOrder(orderId);
  const currentOrder = foundOrder || repo.orders[0];

  const updateOrderStatus = useCallback((newStatus: OrderStatus, label?: string) => {
    const targetOrderId = normalizeEntityId(orderId);
    const order = repo.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (order) {
      order.status = newStatus;
      if (label) order.statusLabel = label;
      order.updatedAt = new Date().toISOString();
      repo.notify();
    }
  }, [orderId, repo]);

  const switchScenario = (scenarioIdOrOrderId: string) => {
    setIsLoading(true);
    const resolvedId = normalizeEntityId(scenarioIdOrOrderId);
    setOrderId(resolvedId);
    setTimeout(() => setIsLoading(false), 80);
  };

  const authorizePriceAdjustment = useCallback((targetOrderId: string, authorized: boolean, reason?: string) => {
    repo.authorizePriceAdjustment(targetOrderId, authorized, reason);
  }, [repo]);

  const verifyProofOfService = useCallback((targetOrderId: string, verified: boolean, notes?: string) => {
    repo.verifyProofOfService(targetOrderId, verified, notes);
  }, [repo]);

  // Customer Authority Actions
  const customerApprovePriceAdjustment = useCallback((notes?: string) => {
    return repo.customerApprovePriceAdjustment(orderId, notes);
  }, [orderId, repo]);

  const customerRejectPriceAdjustment = useCallback((reason: string, isMandatoryScope?: boolean) => {
    return repo.customerRejectPriceAdjustment(orderId, reason, isMandatoryScope);
  }, [orderId, repo]);

  const customerAcceptRecommendation = useCallback((recommendationId: string, paymentMethod?: string) => {
    return repo.customerAcceptRecommendation(recommendationId, paymentMethod);
  }, [repo]);

  const customerChooseAlternativeProduct = useCallback((
    recId: string,
    altProductId: string,
    altMerchantId: string,
    altMerchantName?: string
  ) => {
    return repo.customerChooseAlternativeProduct(recId, altProductId, altMerchantId, altMerchantName);
  }, [repo]);

  const customerOptSelfPurchase = useCallback(() => {
    return repo.customerOptSelfPurchase(orderId);
  }, [orderId, repo]);

  const customerPayOrder = useCallback((amount: number, paymentMethod: string = "BCA_VA", isAdditional: boolean = false) => {
    return repo.customerPayOrder(orderId, amount, paymentMethod, isAdditional);
  }, [orderId, repo]);

  const customerFailPayment = useCallback((reason?: string) => {
    return repo.customerFailPayment(orderId, reason);
  }, [orderId, repo]);

  const customerConfirmCompletion = useCallback(() => {
    return repo.customerConfirmCompletion(orderId);
  }, [orderId, repo]);

  const customerReportDispute = useCallback((category: string, description: string) => {
    return repo.customerReportDispute(orderId, category, description);
  }, [orderId, repo]);

  const customerSubmitReview = useCallback((providerRating: number, workerRating: number, reviewText: string) => {
    return repo.customerSubmitReview(orderId, providerRating, workerRating, reviewText);
  }, [orderId, repo]);

  const customerRebookOrder = useCallback(() => {
    return repo.customerRebookOrder(orderId);
  }, [orderId, repo]);

  // Find scenario metadata if current order matches one of SC-C01 to SC-C28
  const activeScenarioMeta = CUSTOMER_SCENARIOS_META.find(
    (s) => s.orderId === currentOrder?.id || s.id.toLowerCase() === orderId.toLowerCase()
  );

  return {
    order: currentOrder,
    rawOrder: foundOrder,
    orders: repo.orders,
    orderId,
    isLoading,
    updateOrderStatus,
    switchScenario,
    authorizePriceAdjustment,
    verifyProofOfService,
    // Customer authority methods
    customerApprovePriceAdjustment,
    customerRejectPriceAdjustment,
    customerAcceptRecommendation,
    customerChooseAlternativeProduct,
    customerOptSelfPurchase,
    customerPayOrder,
    customerFailPayment,
    customerConfirmCompletion,
    customerReportDispute,
    customerSubmitReview,
    customerRebookOrder,
    getOrderById: (id: string) => repo.getOrder(id),
    // Scenario fixtures metadata
    allScenarios: CUSTOMER_SCENARIOS_META,
    activeScenarioMeta,
  };
}
