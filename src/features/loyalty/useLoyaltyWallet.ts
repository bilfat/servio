"use client";

import { useState } from "react";
import { LoyaltyWalletData, LoyaltyVoucher, FixedDomainId } from "@/types/domain";
import { MOCK_LOYALTY_WALLET } from "@/mocks/loyalty";

export function useLoyaltyWallet() {
  const [wallet, setWallet] = useState<LoyaltyWalletData>(MOCK_LOYALTY_WALLET);
  const [appliedVoucher, setAppliedVoucher] = useState<LoyaltyVoucher | null>(null);

  const applyVoucher = (code: string, currentTotal: number, domainId?: FixedDomainId) => {
    const voucher = wallet.vouchers.find(
      (v) => v.code.toUpperCase() === code.trim().toUpperCase()
    );

    if (!voucher) {
      return { success: false, message: "Kode voucher tidak ditemukan." };
    }

    if (currentTotal < voucher.minSpend) {
      return {
        success: false,
        message: `Minimal pembelanjaan untuk voucher ini adalah Rp ${voucher.minSpend.toLocaleString("id-ID")}.`,
      };
    }

    if (voucher.domainRestriction && domainId && voucher.domainRestriction !== domainId) {
      return {
        success: false,
        message: `Voucher ini hanya berlaku untuk kategori ${voucher.domainRestriction}.`,
      };
    }

    setAppliedVoucher(voucher);
    return {
      success: true,
      message: `Voucher berhasil digunakan! Diskon Rp ${voucher.discountAmount.toLocaleString("id-ID")}`,
      discountAmount: voucher.discountAmount,
    };
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  const redeemPoints = (points: number) => {
    if (points > wallet.pointsBalance) {
      return { success: false, message: "Poin tidak mencukupi." };
    }

    setWallet((prev) => ({
      ...prev,
      pointsBalance: prev.pointsBalance - points,
    }));

    return {
      success: true,
      discountValue: points, // 1 point = Rp 1
    };
  };

  return {
    wallet,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
    redeemPoints,
  };
}
