import { LoyaltyWalletData } from "@/types/domain";

export const MOCK_LOYALTY_WALLET: LoyaltyWalletData = {
  pointsBalance: 4250,
  tier: "GOLD",
  tierProgressPercentage: 68,
  pointsExpiringSoon: 500,
  vouchers: [
    {
      id: "vouch-servio-new",
      code: "SERVIOHEMAT",
      title: "Diskon Rp 25.000 Servis AC & Kelistrikan",
      discountAmount: 25000,
      minSpend: 100000,
      validUntil: "2026-10-31",
      domainRestriction: "repair",
    },
    {
      id: "vouch-auto-pro",
      code: "AUTOPROMO",
      title: "Potongan Rp 30.000 Ganti Oli & Tune Up Mobil",
      discountAmount: 30000,
      minSpend: 200000,
      validUntil: "2026-11-15",
      domainRestriction: "automotive",
    },
    {
      id: "vouch-all-5",
      code: "CASHBACK5",
      title: "Cashback Servio Koin 5% Semua Layanan",
      discountAmount: 15000,
      minSpend: 75000,
      validUntil: "2026-12-31",
    },
  ],
};
