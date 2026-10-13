"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { CartStoreGroup, CartItemEntity, ProductItem } from "@/types/domain";
import { cartApi, getCookie } from "@/lib/servioApi";

const CART_STORAGE_KEY = "servio_customer_cart_v1";

function getStoredCart(): CartStoreGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading cart from localStorage:", err);
    return [];
  }
}

function saveStoredCart(groups: CartStoreGroup[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    console.error("Error saving cart to localStorage:", err);
  }
}

interface SyncResult {
  groups: CartStoreGroup[];
  grandTotal: number | null;
  totalCount: number | null;
}

let inFlightSync: Promise<SyncResult> | null = null;
let lastSyncTimestamp = 0;
let lastSyncResult: SyncResult | null = null;

export function useCart() {
  const [cartGroups, setCartGroups] = useState<CartStoreGroup[]>([]);
  const [backendGrandTotal, setBackendGrandTotal] = useState<number | null>(null);
  const [backendTotalCount, setBackendTotalCount] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync from canonical backend Cart API with concurrency deduplication
  const syncFromBackend = useCallback(async (force = false) => {
    setIsLoading(true);
    const token = getCookie("servio_token") || getCookie("servio_session");
    if (!token) {
      const local = getStoredCart();
      setCartGroups(local);
      setBackendGrandTotal(null);
      setBackendTotalCount(null);
      setIsInitialized(true);
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    if (!force && lastSyncResult && now - lastSyncTimestamp < 2000) {
      setCartGroups(lastSyncResult.groups);
      setBackendGrandTotal(lastSyncResult.grandTotal);
      setBackendTotalCount(lastSyncResult.totalCount);
      setIsInitialized(true);
      setIsLoading(false);
      return;
    }

    if (inFlightSync && !force) {
      try {
        const res = await inFlightSync;
        setCartGroups(res.groups);
        setBackendGrandTotal(res.grandTotal);
        setBackendTotalCount(res.totalCount);
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    inFlightSync = (async (): Promise<SyncResult> => {
      try {
        const res = await cartApi.getCart();
        if (res.data && Array.isArray(res.data.groups)) {
          const mapped: CartStoreGroup[] = res.data.groups.map((g) => ({
            merchantId: g.merchantOrganizationId,
            merchantName: g.merchantName,
            subtotal: g.subtotal,
            items: g.items.map((it) => ({
              cartItemId: it.cartItemId,
              productId: it.productId,
              variantId: it.variantId,
              productTitle: `${it.productName} - ${it.variantName}`,
              merchantId: g.merchantOrganizationId,
              merchantName: g.merchantName,
              unitPrice: it.unitPriceSnapshot,
              unitPriceSnapshot: it.unitPriceSnapshot,
              quantity: it.quantity,
              stock: it.availableStock,
              thumbnailUrl: it.thumbnailUrl,
            })),
          }));

          const result: SyncResult = {
            groups: mapped,
            grandTotal: res.data.grandSubtotal,
            totalCount: res.data.totalItemsCount,
          };
          lastSyncResult = result;
          lastSyncTimestamp = Date.now();
          saveStoredCart(mapped);
          return result;
        }
      } catch {
        // Fallback to local
      }

      const local = getStoredCart();
      const fallbackResult: SyncResult = {
        groups: local,
        grandTotal: null,
        totalCount: null,
      };
      return fallbackResult;
    })();

    try {
      const res = await inFlightSync;
      setCartGroups(res.groups);
      setBackendGrandTotal(res.grandTotal);
      setBackendTotalCount(res.totalCount);
      setIsInitialized(true);
    } finally {
      inFlightSync = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncFromBackend();

    const handleSync = () => {
      syncFromBackend(true);
    };

    window.addEventListener("servio:cart-updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("servio:cart-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [syncFromBackend]);

  const findCartItemId = useCallback(
    (productId: string, variantId?: string): string | undefined => {
      for (const group of cartGroups) {
        for (const item of group.items) {
          if (item.productId === productId && (variantId ? item.variantId === variantId : true)) {
            return item.cartItemId;
          }
        }
      }
      return undefined;
    },
    [cartGroups]
  );

  const addItem = useCallback(
    async (product: ProductItem, quantity: number = 1, linkedOrderId?: string, variantId?: string) => {
      const resolvedVariantId = variantId || (product as unknown as { variantId?: string }).variantId || product.id;

      // Primary: Dispatch to canonical backend Cart API
      try {
        await cartApi.addItem({
          productId: product.id,
          variantId: resolvedVariantId,
          quantity,
          contextType: linkedOrderId ? "SERVICE_RECOMMENDATION" : "DIRECT_PURCHASE",
          contextId: linkedOrderId,
        });

        await syncFromBackend(true);
        window.dispatchEvent(new Event("servio:cart-updated"));
        return;
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string };
        // If unauthenticated, notify caller (or guest login flow)
        if (error?.status === 401 || error?.message?.includes("Unauthenticated")) {
          throw error;
        }
        throw error;
      }
    },
    [syncFromBackend]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number, variantId?: string, cartItemId?: string) => {
      const resolvedCartItemId = cartItemId || findCartItemId(productId, variantId);

      if (resolvedCartItemId) {
        try {
          await cartApi.updateItem(resolvedCartItemId, quantity);
          await syncFromBackend(true);
          window.dispatchEvent(new Event("servio:cart-updated"));
          return;
        } catch (err) {
          console.warn("Backend cart updateItem error:", err);
        }
      }

      // Local fallback if offline
      const current = getStoredCart();
      const nextGroups = current
        .map((group) => {
          const updatedItems = group.items
            .map((item) => {
              const matches = variantId
                ? item.productId === productId && item.variantId === variantId
                : item.productId === productId;
              return matches ? { ...item, quantity } : item;
            })
            .filter((item) => item.quantity > 0);

          return {
            ...group,
            items: updatedItems,
            subtotal: updatedItems.reduce((acc, it) => acc + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity, 0),
          };
        })
        .filter((group) => group.items.length > 0);

      saveStoredCart(nextGroups);
      setCartGroups(nextGroups);
      window.dispatchEvent(new Event("servio:cart-updated"));
    },
    [findCartItemId, syncFromBackend]
  );

  const removeItem = useCallback(
    async (productId: string, variantId?: string, cartItemId?: string) => {
      const resolvedCartItemId = cartItemId || findCartItemId(productId, variantId);

      if (resolvedCartItemId) {
        try {
          await cartApi.removeItem(resolvedCartItemId);
          await syncFromBackend(true);
          window.dispatchEvent(new Event("servio:cart-updated"));
          return;
        } catch (err) {
          console.warn("Backend cart removeItem error:", err);
        }
      }

      await updateQuantity(productId, 0, variantId);
    },
    [findCartItemId, syncFromBackend, updateQuantity]
  );

  const clearCart = useCallback(() => {
    saveStoredCart([]);
    setCartGroups([]);
    setBackendGrandTotal(0);
    setBackendTotalCount(0);
    window.dispatchEvent(new Event("servio:cart-updated"));
  }, []);

  const totalItemCount = useMemo(() => {
    if (backendTotalCount !== null) return backendTotalCount;
    return cartGroups.reduce((acc, group) => acc + group.items.reduce((s, it) => s + it.quantity, 0), 0);
  }, [backendTotalCount, cartGroups]);

  const grandTotal = useMemo(() => {
    if (backendGrandTotal !== null) return backendGrandTotal;
    return cartGroups.reduce((acc, g) => acc + g.subtotal, 0);
  }, [backendGrandTotal, cartGroups]);

  return {
    cartGroups,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart: syncFromBackend,
    totalItemCount,
    grandTotal,
    isEmpty: isInitialized && cartGroups.length === 0,
    isInitialized,
    isLoading,
  };
}
