"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { CartStoreGroup, ProductItem } from "@/types/domain";
import { orderBarangApi, BackendCartGrouped } from "@/lib/orderBarangApi";
import { getCookie } from "@/lib/servioApi";

const CART_STORAGE_KEY = "servio_customer_cart_v1";
const SELECTED_ITEMS_KEY = "servio_selected_cart_items_v1";

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

function getStoredSelectedItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SELECTED_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredSelectedItems(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_ITEMS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
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
const updateQuantityDebounceTimers = new Map<string, NodeJS.Timeout>();

function getActiveRoleFromCookie(): string {
  if (typeof document === "undefined") return "CUSTOMER";
  const match = document.cookie.match(/(?:^|;\s*)servio_active_role=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "CUSTOMER";
}

export function useCart() {
  const [cartGroups, setCartGroups] = useState<CartStoreGroup[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => getStoredSelectedItems());
  const [backendGrandTotal, setBackendGrandTotal] = useState<number | null>(null);
  const [backendTotalCount, setBackendTotalCount] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync from canonical backend Cart API with concurrency deduplication
  const syncFromBackend = useCallback(async (force = false) => {
    setIsLoading(true);

    // Only CUSTOMER role has a shopping cart.
    // Non-customer roles (CEO, Admin, Staff, Provider, Worker, Merchant, Supplier, etc.) do not have a cart.
    if (getActiveRoleFromCookie() !== "CUSTOMER") {
      setCartGroups([]);
      setBackendGrandTotal(null);
      setBackendTotalCount(0);
      setIsInitialized(true);
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    if (!force && lastSyncResult && now - lastSyncTimestamp < 2000) {
      setCartGroups(lastSyncResult.groups);
      setBackendGrandTotal(lastSyncResult.grandTotal);
      setBackendTotalCount(lastSyncResult.totalCount);
      const stored = getStoredSelectedItems();
      if (stored.length > 0) {
        setSelectedItemIds(stored);
      }
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
        const stored = getStoredSelectedItems();
        if (stored.length > 0) {
          setSelectedItemIds(stored);
        }
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    inFlightSync = (async (): Promise<SyncResult> => {
      try {
        const res = await orderBarangApi.customer.getCart();
        const data = (res.data as unknown as BackendCartGrouped) || res.data;
        if (data && Array.isArray(data.merchants)) {
          const localStored = getStoredCart();
          const localItemMap = new Map<string, any>();
          localStored.forEach((lg) => {
            lg.items.forEach((it) => {
              if (it.productId) localItemMap.set(it.productId, it);
              if (it.variantId) localItemMap.set(`${it.productId}_${it.variantId}`, it);
              if (it.cartItemId) localItemMap.set(it.cartItemId, it);
            });
          });

          const mapped: CartStoreGroup[] = data.merchants.map((g) => {
            const groupLocal = localStored.find((lg) => lg.merchantId === g.merchant_org_id);
            const isFallbackMerchant =
              !g.merchant_name ||
              (g.merchant_name.toLowerCase().startsWith("toko ") && g.merchant_name.length > 20);
            const resolvedMerchantName =
              !isFallbackMerchant
                ? g.merchant_name
                : groupLocal?.merchantName || "Toko Rekanan Resmi";

            return {
              merchantId: g.merchant_org_id,
              merchantName: resolvedMerchantName,
              subtotal: g.estimated_subtotal_idr,
              items: (g.items || []).map((it) => {
                const localMatch =
                  localItemMap.get(it.id) ||
                  (it.variant_id ? localItemMap.get(`${it.product_id}_${it.variant_id}`) : null) ||
                  localItemMap.get(it.product_id);

                let title = it.name ? (it.variant_name ? `${it.name} - ${it.variant_name}` : it.name) : null;
                if (!title && localMatch?.productTitle && !localMatch.productTitle.startsWith("Produk #")) {
                  title = localMatch.productTitle;
                }
                if (!title) {
                  title = "Suku Cadang / Peralatan Servis";
                }

                const resolvedImage = it.image_url || localMatch?.thumbnailUrl || undefined;

                return {
                  cartItemId: it.id,
                  productId: it.product_id,
                  variantId: it.variant_id,
                  variantName: it.variant_name || localMatch?.variantName,
                  productTitle: title,
                  merchantId: g.merchant_org_id,
                  merchantName: resolvedMerchantName,
                  unitPrice: it.unit_price_idr,
                  unitPriceSnapshot: it.unit_price_idr,
                  quantity: it.quantity,
                  stock: it.stock_qty,
                  isActive: it.is_active,
                  thumbnailUrl: resolvedImage,
                };
              }),
            };
          });

          const totalCount = data.total_items_count ?? mapped.reduce((acc, g) => acc + g.items.reduce((s, it) => s + it.quantity, 0), 0);
          const grandSubtotal = mapped.reduce((acc, g) => acc + g.subtotal, 0);

          const result: SyncResult = {
            groups: mapped,
            grandTotal: grandSubtotal,
            totalCount: totalCount,
          };
          lastSyncResult = result;
          lastSyncTimestamp = Date.now();
          saveStoredCart(mapped);
          return result;
        }
      } catch (err: any) {
        if (err?.status !== 403 && err?.status !== 401) {
          console.warn("Real order-barang cart sync failed, checking local store:", err);
        }
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

      // Extract all possible identifiers (cartItemId, productId, composite)
      const allItemIds = res.groups.flatMap((g) => [
        ...g.items.map((it) => it.cartItemId),
        ...g.items.map((it) => it.productId),
        ...g.items.map((it) => (it.variantId ? `${it.productId}_${it.variantId}` : "")),
      ]).filter(Boolean) as string[];

      const stored = getStoredSelectedItems();
      const validStored = stored.filter((id) => allItemIds.includes(id));
      if (validStored.length > 0) {
        setSelectedItemIds(validStored);
      } else if (stored.length === 0 && allItemIds.length > 0) {
        // Only select all if the user has never explicitly configured/deselected items
        const defaultIds = res.groups.flatMap((g) => g.items.map((it) => it.cartItemId || it.productId));
        setSelectedItemIds(defaultIds);
        saveStoredSelectedItems(defaultIds);
      }

      setIsInitialized(true);
    } finally {
      inFlightSync = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncFromBackend();

    const handleSync = (e?: Event) => {
      const ce = e as CustomEvent<{ totalCount?: number; count?: number; groups?: CartStoreGroup[] }>;
      if (ce?.detail && typeof ce.detail.totalCount === "number") {
        setBackendTotalCount(ce.detail.totalCount);
        if (ce.detail.totalCount === 0) {
          setCartGroups([]);
          setBackendGrandTotal(0);
        }
      } else if (ce?.detail && typeof ce.detail.count === "number") {
        setBackendTotalCount(ce.detail.count);
        if (ce.detail.count === 0) {
          setCartGroups([]);
          setBackendGrandTotal(0);
        }
      }
      syncFromBackend(true);
    };

    const handleOptimistic = (e: Event) => {
      const ce = e as CustomEvent<{ newTotalCount?: number; groups?: CartStoreGroup[]; pending?: boolean }>;
      if (ce.detail) {
        if (!ce.detail.pending && typeof ce.detail.newTotalCount === "number") {
          setBackendTotalCount(ce.detail.newTotalCount);
          if (ce.detail.newTotalCount === 0) {
            setCartGroups([]);
            setBackendGrandTotal(0);
          }
        }
        if (ce.detail.groups && Array.isArray(ce.detail.groups)) {
          setCartGroups(ce.detail.groups);
        }
      }
    };

    const handleLanded = () => {
      if (lastSyncResult && typeof lastSyncResult.totalCount === "number") {
        setBackendTotalCount(lastSyncResult.totalCount);
      }
    };

    window.addEventListener("servio:cart-updated", handleSync);
    window.addEventListener("servio:cart-optimistic-add", handleOptimistic);
    window.addEventListener("servio:cart-item-landed", handleLanded);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("servio:cart-updated", handleSync);
      window.removeEventListener("servio:cart-optimistic-add", handleOptimistic);
      window.removeEventListener("servio:cart-item-landed", handleLanded);
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

      // 1. Optimistically record and update local state IMMEDIATELY (0ms delay)
      let optimisticGroups: CartStoreGroup[] = [];
      let optimisticTotalCount = 0;

      try {
        const stored = getStoredCart();
        let targetGroup = stored.find((g) => g.merchantId === product.merchantId);
        if (!targetGroup) {
          targetGroup = {
            merchantId: product.merchantId,
            merchantName: product.merchantName || "Toko Rekanan Resmi",
            items: [],
            subtotal: 0,
          };
          stored.push(targetGroup);
        }
        const existingItem = targetGroup.items.find(
          (it) => it.productId === product.id && (resolvedVariantId ? it.variantId === resolvedVariantId : true)
        );
        if (existingItem) {
          existingItem.quantity += quantity;
          if (product.title) existingItem.productTitle = product.title;
          if (product.thumbnailUrl) existingItem.thumbnailUrl = product.thumbnailUrl;
        } else {
          targetGroup.items.push({
            productId: product.id,
            variantId: resolvedVariantId,
            productTitle: product.title || "Suku Cadang / Peralatan Servis",
            merchantId: product.merchantId,
            merchantName: product.merchantName || "Toko Rekanan Resmi",
            unitPrice: product.price,
            unitPriceSnapshot: product.price,
            quantity,
            stock: product.stock ?? 99,
            thumbnailUrl: product.thumbnailUrl,
            linkedServiceOrderId: linkedOrderId,
          });
        }
        targetGroup.subtotal = targetGroup.items.reduce(
          (acc, it) => acc + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity,
          0
        );
        saveStoredCart(stored);
        optimisticGroups = stored;
        optimisticTotalCount = stored.reduce(
          (acc, g) => acc + g.items.reduce((s, it) => s + it.quantity, 0),
          0
        );

        // Instant optimistic React state update for cart groups
        setCartGroups(stored);

        // Update module-level cache
        lastSyncResult = {
          groups: stored,
          grandTotal: stored.reduce((acc, g) => acc + g.subtotal, 0),
          totalCount: optimisticTotalCount,
        };
        lastSyncTimestamp = Date.now();

        const isFlightActive =
          typeof window !== "undefined" &&
          Boolean((window as any).__servio_cart_flight_active);

        if (isFlightActive) {
          // Defer badge count update until the clone lands at the cart icon
          const applyLandingCount = () => {
            setBackendTotalCount(optimisticTotalCount);
            window.removeEventListener("servio:cart-item-landed", applyLandingCount);
          };
          window.addEventListener("servio:cart-item-landed", applyLandingCount);
          setTimeout(applyLandingCount, 850); // Safety fallback

          window.dispatchEvent(
            new CustomEvent("servio:cart-optimistic-add", {
              detail: {
                newTotalCount: optimisticTotalCount,
                groups: stored,
                delta: quantity,
                pending: true,
              },
            })
          );
        } else {
          setBackendTotalCount(optimisticTotalCount);

          window.dispatchEvent(
            new CustomEvent("servio:cart-optimistic-add", {
              detail: {
                newTotalCount: optimisticTotalCount,
                groups: stored,
                delta: quantity,
                pending: false,
              },
            })
          );
        }
      } catch {
        // silent fail on local storage
      }

      // 2. Perform backend API sync asynchronously without blocking UI counter
      try {
        await orderBarangApi.customer.addItem({
          product_id: product.id,
          variant_id: resolvedVariantId,
          quantity,
          merchant_org_id: product.merchantId,
        });

        syncFromBackend(true).catch(() => {});
        window.dispatchEvent(new Event("servio:cart-updated"));
        return;
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string };
        if (error?.status === 401 || error?.message?.includes("Unauthenticated")) {
          throw error;
        }
        // If real backend call failed, re-sync to restore verified state
        syncFromBackend(true).catch(() => {});
        throw error;
      }
    },
    [syncFromBackend]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number, variantId?: string, cartItemId?: string) => {
      const resolvedCartItemId = cartItemId || findCartItemId(productId, variantId);

      // 1. Instant Optimistic UI Update (0ms delay)
      const current = cartGroups.length > 0 ? cartGroups : getStoredCart();
      const nextGroups = current
        .map((group) => {
          const updatedItems = group.items
            .map((item) => {
              const matches = resolvedCartItemId
                ? item.cartItemId === resolvedCartItemId
                : variantId
                ? item.productId === productId && item.variantId === variantId
                : item.productId === productId;
              return matches ? { ...item, quantity } : item;
            })
            .filter((item) => item.quantity > 0);

          return {
            ...group,
            items: updatedItems,
            subtotal: updatedItems.reduce(
              (acc, it) => acc + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity,
              0
            ),
          };
        })
        .filter((group) => group.items.length > 0);

      const newTotalCount = nextGroups.reduce(
        (acc, g) => acc + g.items.reduce((s, it) => s + it.quantity, 0),
        0
      );
      const newGrandTotal = nextGroups.reduce((acc, g) => acc + g.subtotal, 0);

      // Immediately apply to React state & localStorage
      setCartGroups(nextGroups);
      setBackendTotalCount(newTotalCount);
      setBackendGrandTotal(newGrandTotal);
      saveStoredCart(nextGroups);

      // Update module-level cache
      lastSyncResult = {
        groups: nextGroups,
        grandTotal: newGrandTotal,
        totalCount: newTotalCount,
      };
      lastSyncTimestamp = Date.now();

      // If quantity reduced to 0, clean up from selected items
      if (quantity <= 0 && resolvedCartItemId) {
        setSelectedItemIds((prev) => {
          const next = prev.filter((id) => id !== resolvedCartItemId && id !== productId);
          saveStoredSelectedItems(next);
          return next;
        });
      }

      // Broadcast to Navbar and components immediately
      window.dispatchEvent(
        new CustomEvent("servio:cart-optimistic-add", {
          detail: {
            newTotalCount: newTotalCount,
            groups: nextGroups,
            pending: false,
          },
        })
      );

      // 2. Perform backend API sync asynchronously with debouncing
      if (resolvedCartItemId) {
        if (updateQuantityDebounceTimers.has(resolvedCartItemId)) {
          clearTimeout(updateQuantityDebounceTimers.get(resolvedCartItemId)!);
          updateQuantityDebounceTimers.delete(resolvedCartItemId);
        }

        if (quantity <= 0) {
          orderBarangApi.customer.removeItem(resolvedCartItemId)
            .then(() => syncFromBackend(true).catch(() => {}))
            .catch((err) => console.warn("Backend cart removeItem error:", err));
        } else {
          const timer = setTimeout(() => {
            updateQuantityDebounceTimers.delete(resolvedCartItemId);
            orderBarangApi.customer.updateItem(resolvedCartItemId, quantity)
              .then(() => syncFromBackend(true).catch(() => {}))
              .catch((err) => {
                console.warn("Backend cart updateItem error:", err);
                syncFromBackend(true).catch(() => {});
              });
          }, 250);
          updateQuantityDebounceTimers.set(resolvedCartItemId, timer);
        }
      }
    },
    [cartGroups, findCartItemId, syncFromBackend]
  );

  const removeItem = useCallback(
    async (productId: string, variantId?: string, cartItemId?: string) => {
      const resolvedCartItemId = cartItemId || findCartItemId(productId, variantId);

      // 1. Instant Optimistic UI Removal (0ms delay)
      const current = cartGroups.length > 0 ? cartGroups : getStoredCart();
      const nextGroups = current
        .map((group) => {
          const updatedItems = group.items.filter((item) => {
            if (resolvedCartItemId && item.cartItemId) {
              return item.cartItemId !== resolvedCartItemId;
            }
            if (variantId) {
              return !(item.productId === productId && item.variantId === variantId);
            }
            return item.productId !== productId;
          });
          return {
            ...group,
            items: updatedItems,
            subtotal: updatedItems.reduce(
              (acc, it) => acc + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity,
              0
            ),
          };
        })
        .filter((group) => group.items.length > 0);

      const newTotalCount = nextGroups.reduce(
        (acc, g) => acc + g.items.reduce((s, it) => s + it.quantity, 0),
        0
      );
      const newGrandTotal = nextGroups.reduce((acc, g) => acc + g.subtotal, 0);

      setCartGroups(nextGroups);
      setBackendTotalCount(newTotalCount);
      setBackendGrandTotal(newGrandTotal);
      saveStoredCart(nextGroups);

      if (resolvedCartItemId) {
        setSelectedItemIds((prev) => {
          const next = prev.filter((id) => id !== resolvedCartItemId && id !== productId);
          saveStoredSelectedItems(next);
          return next;
        });
      }

      lastSyncResult = {
        groups: nextGroups,
        grandTotal: newGrandTotal,
        totalCount: newTotalCount,
      };
      lastSyncTimestamp = Date.now();

      window.dispatchEvent(
        new CustomEvent("servio:cart-optimistic-add", {
          detail: {
            newTotalCount: newTotalCount,
            groups: nextGroups,
            pending: false,
          },
        })
      );

      // 2. Perform backend API removal in background
      if (resolvedCartItemId) {
        if (updateQuantityDebounceTimers.has(resolvedCartItemId)) {
          clearTimeout(updateQuantityDebounceTimers.get(resolvedCartItemId)!);
          updateQuantityDebounceTimers.delete(resolvedCartItemId);
        }
        orderBarangApi.customer.removeItem(resolvedCartItemId)
          .then(() => syncFromBackend(true).catch(() => {}))
          .catch((err) => console.warn("Backend cart removeItem error:", err));
      }
    },
    [cartGroups, findCartItemId, syncFromBackend]
  );

  const clearCart = useCallback(() => {
    saveStoredCart([]);
    saveStoredSelectedItems([]);
    setCartGroups([]);
    setSelectedItemIds([]);
    setBackendGrandTotal(0);
    setBackendTotalCount(0);
    lastSyncResult = {
      groups: [],
      grandTotal: 0,
      totalCount: 0,
    };
    lastSyncTimestamp = Date.now();

    // Instant 0ms broadcast to all components and listeners
    window.dispatchEvent(
      new CustomEvent("servio:cart-optimistic-add", {
        detail: {
          newTotalCount: 0,
          groups: [],
          pending: false,
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent("servio:cart-updated", {
        detail: {
          count: 0,
          totalCount: 0,
        },
      })
    );

    syncFromBackend(true).catch(() => {});
  }, [syncFromBackend]);

  const clearCheckedOutItems = useCallback(
    (checkedOutIds?: string[]) => {
      const current = cartGroups.length > 0 ? cartGroups : getStoredCart();
      const allItemCount = current.reduce((sum, g) => sum + g.items.length, 0);

      // If no specific IDs provided or all items were selected/checked out, do full clear
      if (!checkedOutIds || checkedOutIds.length === 0 || checkedOutIds.length >= allItemCount) {
        clearCart();
        return;
      }

      // Filter out only the checked-out items
      const nextGroups = current
        .map((group) => {
          const remainingItems = group.items.filter((item) => {
            const matchesCartItemId = item.cartItemId && checkedOutIds.includes(item.cartItemId);
            const matchesProductId = item.productId && checkedOutIds.includes(item.productId);
            const matchesComposite = item.productId && item.variantId && checkedOutIds.includes(`${item.productId}_${item.variantId}`);
            return !matchesCartItemId && !matchesProductId && !matchesComposite;
          });
          return {
            ...group,
            items: remainingItems,
            subtotal: remainingItems.reduce(
              (acc, it) => acc + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity,
              0
            ),
          };
        })
        .filter((group) => group.items.length > 0);

      const newTotalCount = nextGroups.reduce(
        (acc, g) => acc + g.items.reduce((s, it) => s + it.quantity, 0),
        0
      );
      const newGrandTotal = nextGroups.reduce((acc, g) => acc + g.subtotal, 0);

      setCartGroups(nextGroups);
      setBackendTotalCount(newTotalCount);
      setBackendGrandTotal(newGrandTotal);
      saveStoredCart(nextGroups);

      // Clean selected items
      setSelectedItemIds((prev) => {
        const next = prev.filter((id) => !checkedOutIds.includes(id));
        saveStoredSelectedItems(next);
        return next;
      });

      lastSyncResult = {
        groups: nextGroups,
        grandTotal: newGrandTotal,
        totalCount: newTotalCount,
      };
      lastSyncTimestamp = Date.now();

      // Dispatch optimistic event so Navbar & BottomNav update immediately (0ms)
      window.dispatchEvent(
        new CustomEvent("servio:cart-optimistic-add", {
          detail: {
            newTotalCount: newTotalCount,
            groups: nextGroups,
            pending: false,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent("servio:cart-updated", {
          detail: {
            count: newTotalCount,
            totalCount: newTotalCount,
          },
        })
      );

      syncFromBackend(true).catch(() => {});
    },
    [cartGroups, clearCart, syncFromBackend]
  );

  // Selection handlers
  const toggleSelectItem = useCallback((cartItemId: string) => {
    setSelectedItemIds((prev) => {
      const next = prev.includes(cartItemId) ? prev.filter((id) => id !== cartItemId) : [...prev, cartItemId];
      saveStoredSelectedItems(next);
      return next;
    });
  }, []);

  const toggleSelectMerchant = useCallback(
    (merchantId: string) => {
      const group = cartGroups.find((g) => g.merchantId === merchantId);
      if (!group) return;
      const groupItemIds = group.items.map((it) => it.cartItemId || it.productId);
      const allSelectedInGroup = groupItemIds.every((id) => selectedItemIds.includes(id));

      setSelectedItemIds((prev) => {
        let next: string[];
        if (allSelectedInGroup) {
          next = prev.filter((id) => !groupItemIds.includes(id));
        } else {
          next = Array.from(new Set([...prev, ...groupItemIds]));
        }
        saveStoredSelectedItems(next);
        return next;
      });
    },
    [cartGroups, selectedItemIds]
  );

  const toggleSelectAll = useCallback(() => {
    const allItemIds = cartGroups.flatMap((g) => g.items.map((it) => it.cartItemId || it.productId));
    const allSelected = allItemIds.length > 0 && allItemIds.every((id) => selectedItemIds.includes(id));

    setSelectedItemIds(() => {
      const next = allSelected ? [] : allItemIds;
      saveStoredSelectedItems(next);
      return next;
    });
  }, [cartGroups, selectedItemIds]);

  const isMerchantSelected = useCallback(
    (merchantId: string) => {
      const group = cartGroups.find((g) => g.merchantId === merchantId);
      if (!group || group.items.length === 0) return false;
      return group.items.every((it) => selectedItemIds.includes(it.cartItemId || it.productId));
    },
    [cartGroups, selectedItemIds]
  );

  const isAllSelected = useMemo(() => {
    const allItemIds = cartGroups.flatMap((g) => g.items.map((it) => it.cartItemId || it.productId));
    return allItemIds.length > 0 && allItemIds.every((id) => selectedItemIds.includes(id));
  }, [cartGroups, selectedItemIds]);

  // Selected totals
  const selectedCount = useMemo(() => {
    return cartGroups.reduce((acc, g) => {
      return (
        acc +
        g.items.reduce((s, it) => {
          const id = it.cartItemId || it.productId;
          return selectedItemIds.includes(id) ? s + it.quantity : s;
        }, 0)
      );
    }, 0);
  }, [cartGroups, selectedItemIds]);

  const selectedGrandTotal = useMemo(() => {
    return cartGroups.reduce((acc, g) => {
      return (
        acc +
        g.items.reduce((s, it) => {
          const id = it.cartItemId || it.productId;
          return selectedItemIds.includes(id) ? s + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity : s;
        }, 0)
      );
    }, 0);
  }, [cartGroups, selectedItemIds]);

  const selectedMerchantCount = useMemo(() => {
    return cartGroups.filter((g) =>
      g.items.some((it) => selectedItemIds.includes(it.cartItemId || it.productId))
    ).length;
  }, [cartGroups, selectedItemIds]);

  const totalItemCount = useMemo(() => {
    if (typeof document !== "undefined" && getActiveRoleFromCookie() !== "CUSTOMER") {
      return 0;
    }
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
    clearCheckedOutItems,
    refreshCart: syncFromBackend,
    totalItemCount,
    grandTotal,
    selectedItemIds,
    toggleSelectItem,
    toggleSelectMerchant,
    toggleSelectAll,
    isMerchantSelected,
    isAllSelected,
    selectedCount,
    selectedGrandTotal,
    selectedMerchantCount,
    isEmpty: isInitialized && cartGroups.length === 0,
    isInitialized,
    isLoading,
  };
}
