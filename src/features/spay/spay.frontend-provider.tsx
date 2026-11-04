"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { useActiveRole } from "@/context/RoleContext";
import {
  SPayOwnerType,
  SPayAccountSummary,
  SPayTransaction,
  SPayWithdrawSimulationParams,
  SPayWithdrawResult,
} from "@/types/spay";
import {
  MOCK_CUSTOMER_SPAY,
  MOCK_MERCHANT_SPAY_BY_ORG,
  MOCK_PROVIDER_SPAY_BY_ORG,
} from "@/mocks/spay.mock";
import { financeServiceApi } from "@/lib/financeServiceApi";

export interface SPayContextValue {
  ownerType: SPayOwnerType;
  summary: SPayAccountSummary;
  isBalanceVisible: boolean;
  toggleBalanceVisibility: () => void;
  isProcessingWithdraw: boolean;
  withdrawSimulation: (params: SPayWithdrawSimulationParams) => Promise<SPayWithdrawResult>;
  resetSimulationState: () => void;
  availableOrgs: { id: string; name: string }[];
  currentOrgId: string;
  switchOrganization: (orgId: string) => void;
}

const SPayContext = createContext<SPayContextValue | undefined>(undefined);

export function SPayProvider({
  children,
  forcedOwnerType,
  forcedOrgId,
}: {
  children: React.ReactNode;
  forcedOwnerType?: SPayOwnerType;
  forcedOrgId?: string;
}) {
  const { activeRole, user, isLoadingAuth } = useActiveRole();

  // Determine owner type based on explicit prop or active role context
  const resolvedOwnerType: SPayOwnerType = useMemo(() => {
    if (forcedOwnerType) return forcedOwnerType;
    if (activeRole === "MERCHANT") return "MERCHANT";
    if (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER") return "SERVICE_PROVIDER";
    return "CUSTOMER";
  }, [forcedOwnerType, activeRole]);

  // Determine organization context
  const defaultOrgId = useMemo(() => {
    if (forcedOrgId) return forcedOrgId;
    if (resolvedOwnerType === "MERCHANT") {
      return (user?.organizationId as string) || "merch-01";
    }
    if (resolvedOwnerType === "SERVICE_PROVIDER") {
      return (user?.organizationId as string) || (user?.providerId as string) || "prov-01";
    }
    return "";
  }, [forcedOrgId, resolvedOwnerType, user]);

  const [currentOrgId, setCurrentOrgId] = useState<string>(defaultOrgId);

  // Sync default org if user context shifts
  React.useEffect(() => {
    if (defaultOrgId && currentOrgId !== defaultOrgId) {
      setCurrentOrgId(defaultOrgId);
    }
  }, [defaultOrgId]);

  // In-memory datasets mapped by role and org
  const [customerData, setCustomerData] = useState<SPayAccountSummary>(MOCK_CUSTOMER_SPAY);
  const [merchantDataMap, setMerchantDataMap] = useState<Record<string, SPayAccountSummary>>(MOCK_MERCHANT_SPAY_BY_ORG);
  const [providerDataMap, setProviderDataMap] = useState<Record<string, SPayAccountSummary>>(MOCK_PROVIDER_SPAY_BY_ORG);

  // Sync with authoritative backend Finance Service
  React.useEffect(() => {
    // Only attempt to sync after authentication state is settled
    if (isLoadingAuth) return;

    let isMounted = true;
    const syncSpayBalance = () => {
      if (!isMounted) return;

      if (resolvedOwnerType === "MERCHANT" && activeRole === "MERCHANT") {
        const canonicalOrgId =
          currentOrgId && currentOrgId.includes("-") && currentOrgId.length > 20
            ? currentOrgId
            : "0c1467e7-af68-4b26-ae84-daa41d51aed0";

        financeServiceApi.merchant
          .getSpay(canonicalOrgId)
          .then((res) => {
            if (!isMounted || !res.data) return;
            const liveAcc = res.data;
            setMerchantDataMap((prev) => {
              const existing = prev[currentOrgId] || prev["merch-01"] || MOCK_MERCHANT_SPAY_BY_ORG["merch-01"];
              if (
                existing.withdrawableBalance === (liveAcc.available_idr ?? 0) &&
                existing.pendingSettlement === (liveAcc.pending_held_idr ?? 0) &&
                existing.reservedBalance === (liveAcc.withdrawal_locked_idr ?? 0)
              ) {
                return prev;
              }
              const updated: SPayAccountSummary = {
                ...existing,
                withdrawableBalance: liveAcc.available_idr ?? 0,
                pendingSettlement: liveAcc.pending_held_idr ?? 0,
                reservedBalance: liveAcc.withdrawal_locked_idr ?? 0,
              };
              return {
                ...prev,
                [currentOrgId]: updated,
                [canonicalOrgId]: updated,
                "merch-01": updated,
              };
            });
          })
          .catch((err) => {
            console.warn("SPayProvider: failed to sync merchant live balance:", err);
          });
      } else if (
        resolvedOwnerType === "SERVICE_PROVIDER" ||
        activeRole === "SERVICE_PROVIDER" ||
        (activeRole as string) === "PROVIDER"
      ) {
        const canonicalOrgId =
          currentOrgId && currentOrgId.includes("-") && currentOrgId.length > 20
            ? currentOrgId
            : "0740d857-b665-4191-aaf5-d7dd3611dc1d";

        financeServiceApi.merchant
          .getSpay(canonicalOrgId)
          .then((res) => {
            if (!isMounted || !res.data) return;
            const liveAcc = res.data;
            setProviderDataMap((prev) => {
              const existing = prev[currentOrgId] || prev["prov-01"] || MOCK_PROVIDER_SPAY_BY_ORG["prov-01"];
              if (
                existing.withdrawableBalance === (liveAcc.available_idr ?? 0) &&
                existing.pendingSettlement === (liveAcc.pending_held_idr ?? 0) &&
                existing.reservedBalance === (liveAcc.withdrawal_locked_idr ?? 0)
              ) {
                return prev;
              }
              const updated: SPayAccountSummary = {
                ...existing,
                withdrawableBalance: liveAcc.available_idr ?? 0,
                pendingSettlement: liveAcc.pending_held_idr ?? 0,
                reservedBalance: liveAcc.withdrawal_locked_idr ?? 0,
              };
              return {
                ...prev,
                [currentOrgId]: updated,
                [canonicalOrgId]: updated,
                "prov-01": updated,
              };
            });
          })
          .catch((err) => {
            console.warn("SPayProvider: failed to sync provider live balance:", err);
          });
      } else if (resolvedOwnerType === "CUSTOMER" && activeRole === "CUSTOMER") {
        financeServiceApi.customer
          .getSpay()
          .then((res) => {
            if (!isMounted || !res.data) return;
            const liveAcc = res.data;
            setCustomerData((prev) => {
              if (
                prev.withdrawableBalance === (liveAcc.available_idr ?? 0) &&
                prev.reservedBalance === (liveAcc.withdrawal_locked_idr ?? 0)
              ) {
                return prev;
              }
              return {
                ...prev,
                withdrawableBalance: liveAcc.available_idr ?? 0,
                reservedBalance: liveAcc.withdrawal_locked_idr ?? 0,
              };
            });
          })
          .catch((err) => {
            console.warn("SPayProvider: failed to sync customer live balance:", err);
          });
      }
    };

    syncSpayBalance();

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      syncSpayBalance();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [resolvedOwnerType, activeRole, currentOrgId, isLoadingAuth]);

  // Balance Visibility State
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(true);
  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceVisible((prev) => !prev);
  }, []);

  // Withdraw loading state
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState<boolean>(false);

  // Active summary resolved
  const summary: SPayAccountSummary = useMemo(() => {
    if (resolvedOwnerType === "MERCHANT") {
      return merchantDataMap[currentOrgId] || merchantDataMap["merch-01"] || MOCK_MERCHANT_SPAY_BY_ORG["merch-01"];
    }
    if (resolvedOwnerType === "SERVICE_PROVIDER") {
      return providerDataMap[currentOrgId] || providerDataMap["prov-01"] || MOCK_PROVIDER_SPAY_BY_ORG["prov-01"];
    }
    return customerData;
  }, [resolvedOwnerType, currentOrgId, merchantDataMap, providerDataMap, customerData]);

  // Available organizations for demo switcher
  const availableOrgs = useMemo(() => {
    if (resolvedOwnerType === "MERCHANT") {
      return Object.entries(merchantDataMap).map(([id, data]) => ({
        id,
        name: data.organizationName || id,
      }));
    }
    if (resolvedOwnerType === "SERVICE_PROVIDER") {
      return Object.entries(providerDataMap).map(([id, data]) => ({
        id,
        name: data.organizationName || id,
      }));
    }
    return [];
  }, [resolvedOwnerType, merchantDataMap, providerDataMap]);

  // Organization switcher
  const switchOrganization = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
  }, []);

  // Withdrawal Simulation Engine
  const withdrawSimulation = useCallback(
    async (params: SPayWithdrawSimulationParams): Promise<SPayWithdrawResult> => {
      setIsProcessingWithdraw(true);

      // Simulation latency for realistic feel
      await new Promise((res) => setTimeout(res, 750));

      const { amount, destinationAccountId, simulationResult } = params;
      const targetBank = summary.destinationAccounts.find((b) => b.id === destinationAccountId) || summary.destinationAccounts[0];

      // Validation
      if (!amount || isNaN(amount) || amount <= 0) {
        setIsProcessingWithdraw(false);
        return {
          success: false,
          status: "FAILED",
          message: "Nominal penarikan harus lebih besar dari Rp 0.",
        };
      }

      if (amount > summary.withdrawableBalance) {
        setIsProcessingWithdraw(false);
        return {
          success: false,
          status: "FAILED",
          message: `Nominal Rp ${amount.toLocaleString("id-ID")} melebihi saldo yang dapat dicairkan (Rp ${summary.withdrawableBalance.toLocaleString("id-ID")}).`,
        };
      }

      const now = new Date();
      const dateFormatted = `${now.getDate()} ${now.toLocaleString("id-ID", { month: "short" })} ${now.getFullYear()}, ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} WIB`;
      const txRandomId = `tx-wd-${Date.now()}`;
      const refRandom = `SPY-WD-${Date.now().toString().slice(-8)}`;

      if (simulationResult === "FAIL") {
        // Failed simulation: Saldo is NOT deducted
        const failedTx: SPayTransaction = {
          id: txRandomId,
          referenceNo: refRandom,
          type: "WITHDRAWAL",
          direction: "OUT",
          amount,
          fee: 0,
          timestamp: dateFormatted,
          status: "FAILED",
          title: "Pencairan Dana (Simulasi Gagal)",
          description: `Simulasi penolakan kliring bank tujuan: ${targetBank?.bankName || "Bank Rekening"}`,
          channel: `${targetBank?.bankName || "Bank"} •••• ${targetBank?.accountNumber.slice(-4) || "8888"}`,
          notes: "Simulasi Gagal: Saldo Anda tidak berkurang.",
        };

        const updateFn = (prev: SPayAccountSummary) => ({
          ...prev,
          transactions: [failedTx, ...prev.transactions],
        });

        if (resolvedOwnerType === "CUSTOMER") {
          setCustomerData(updateFn);
        } else if (resolvedOwnerType === "MERCHANT") {
          setMerchantDataMap((prev) => ({
            ...prev,
            [currentOrgId]: updateFn(prev[currentOrgId] || summary),
          }));
        } else {
          setProviderDataMap((prev) => ({
            ...prev,
            [currentOrgId]: updateFn(prev[currentOrgId] || summary),
          }));
        }

        setIsProcessingWithdraw(false);
        return {
          success: false,
          status: "FAILED",
          transaction: failedTx,
          message: "Simulasi penarikan gagal: Penolakan jaringan bank. Saldo tetap utuh.",
        };
      }

      // Successful simulation: Saldo IS deducted from withdrawableBalance
      const successTx: SPayTransaction = {
        id: txRandomId,
        referenceNo: refRandom,
        type: "WITHDRAWAL",
        direction: "OUT",
        amount,
        fee: 0,
        timestamp: dateFormatted,
        status: "COMPLETED",
        title: "Pencairan Dana (Simulasi Berhasil)",
        description: `Pencairan ke ${targetBank?.bankName || "Bank Tujuan"} (${targetBank?.accountNumber || "Rekening"})`,
        channel: `${targetBank?.bankName || "Bank"} ${targetBank?.accountNumber || ""}`,
        notes: "Simulasi pencairan selesai. Tidak ada dana nyata yang ditransfer.",
      };

      const updateSuccessFn = (prev: SPayAccountSummary) => ({
        ...prev,
        withdrawableBalance: Math.max(0, prev.withdrawableBalance - amount),
        transactions: [successTx, ...prev.transactions],
      });

      if (resolvedOwnerType === "CUSTOMER") {
        setCustomerData(updateSuccessFn);
      } else if (resolvedOwnerType === "MERCHANT") {
        setMerchantDataMap((prev) => ({
          ...prev,
          [currentOrgId]: updateSuccessFn(prev[currentOrgId] || summary),
        }));
      } else {
        setProviderDataMap((prev) => ({
          ...prev,
          [currentOrgId]: updateSuccessFn(prev[currentOrgId] || summary),
        }));
      }

      setIsProcessingWithdraw(false);
      return {
        success: true,
        status: "COMPLETED",
        transaction: successTx,
        message: "Simulasi pencairan selesai. Tidak ada dana nyata yang ditransfer.",
      };
    },
    [summary, resolvedOwnerType, currentOrgId]
  );

  // Reset simulation state back to original mock
  const resetSimulationState = useCallback(() => {
    setCustomerData(MOCK_CUSTOMER_SPAY);
    setMerchantDataMap(MOCK_MERCHANT_SPAY_BY_ORG);
    setProviderDataMap(MOCK_PROVIDER_SPAY_BY_ORG);
  }, []);

  const value: SPayContextValue = {
    ownerType: resolvedOwnerType,
    summary,
    isBalanceVisible,
    toggleBalanceVisibility,
    isProcessingWithdraw,
    withdrawSimulation,
    resetSimulationState,
    availableOrgs,
    currentOrgId,
    switchOrganization,
  };

  return <SPayContext.Provider value={value}>{children}</SPayContext.Provider>;
}

export function useSPay() {
  const context = useContext(SPayContext);
  if (!context) {
    throw new Error("useSPay must be used within an SPayProvider");
  }
  return context;
}
