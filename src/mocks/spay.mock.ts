import { SPayAccountSummary } from "@/types/spay";

/**
 * MOCK S-PAY DATASET — CUSTOMER
 * Focus: Refund saldo yang telah tersedia dari pembatalan / penyesuaian biaya servis.
 * Restriction: Customer TIDAK memiliki fitur Top Up, Bayar S-Pay, atau Transfer ke sesama.
 */
export const MOCK_CUSTOMER_SPAY: SPayAccountSummary = {
  ownerType: "CUSTOMER",
  ownerName: "Budi Santoso",
  accountNumber: "SPAY-CUST-8829104",
  withdrawableBalance: 250000,
  pendingRefundBalance: 75000,
  destinationAccounts: [
    {
      id: "bank-cust-01",
      bankName: "Bank Central Asia (BCA)",
      bankCode: "BCA",
      accountNumber: "•••• •••• 4521",
      accountHolder: "Budi Santoso",
      isPrimary: true,
    },
    {
      id: "bank-cust-02",
      bankName: "Bank Mandiri",
      bankCode: "MANDIRI",
      accountNumber: "•••• •••• 7820",
      accountHolder: "Budi Santoso",
      isPrimary: false,
    },
  ],
  transactions: [
    {
      id: "tx-cust-01",
      referenceNo: "SPY-REF-20261014-01",
      type: "REFUND_IN",
      direction: "IN",
      amount: 250000,
      timestamp: "14 Okt 2026, 14:30 WIB",
      status: "COMPLETED",
      title: "Dana Refund Masuk",
      description: "Pengembalian dana pembatalan order servis AC #ORD-8819",
      channel: "Escrow Refund Servio",
      notes: "Dana refund siap dicairkan ke rekening bank",
    },
    {
      id: "tx-cust-02",
      referenceNo: "SPY-WD-20261011-09",
      type: "WITHDRAWAL",
      direction: "OUT",
      amount: 100000,
      fee: 0,
      timestamp: "11 Okt 2026, 09:15 WIB",
      status: "COMPLETED",
      title: "Pencairan Dana (Tarik Dana)",
      description: "Pencairan dana refund ke rekening BCA",
      channel: "BCA •••• 4521",
      notes: "Transfer selesai melalui kliring BI-FAST",
    },
    {
      id: "tx-cust-03",
      referenceNo: "SPY-REF-20261017-03",
      type: "REFUND_PENDING",
      direction: "IN",
      amount: 75000,
      timestamp: "17 Okt 2026, 11:20 WIB",
      status: "PROCESSING",
      title: "Refund Sedang Diproses",
      description: "Penyesuaian kelebihan biaya sparepart AC #ORD-9901",
      channel: "Escrow Pending Review",
      notes: "Menunggu verifikasi audit nota teknisi",
    },
  ],
};

/**
 * MOCK S-PAY DATASET — MERCHANT ORGANIZATIONS
 * Focus: Settlement hasil penjualan suku cadang & barang.
 * Distinct per organization ID.
 */
export const MOCK_MERCHANT_SPAY_BY_ORG: Record<string, SPayAccountSummary> = {
  // Default Merchant Org ("merch-01" / "Toko Suku Cadang Sejuk Abadi")
  "merch-01": {
    ownerType: "MERCHANT",
    organizationId: "merch-01",
    organizationName: "Toko Suku Cadang Sejuk Abadi",
    ownerName: "PT Sejuk Abadi Sejahtera",
    accountNumber: "SPAY-MERCH-8821001",
    withdrawableBalance: 0,
    pendingSettlement: 0,
    reservedBalance: 0,
    financialHold: 0,
    outstandingObligation: 0,
    destinationAccounts: [
      {
        id: "bank-merch-01",
        bankName: "Bank Central Asia (BCA Bisnis)",
        bankCode: "BCA",
        accountNumber: "•••• •••• 9921",
        accountHolder: "PT Sejuk Abadi Sejahtera",
        isPrimary: true,
      },
      {
        id: "bank-merch-02",
        bankName: "Bank Mandiri (Giro)",
        bankCode: "MANDIRI",
        accountNumber: "•••• •••• 3341",
        accountHolder: "PT Sejuk Abadi Sejahtera",
        isPrimary: false,
      },
    ],
    transactions: [],
  },

  // Second Merchant Org for testing multi-org separation
  "merch-02": {
    ownerType: "MERCHANT",
    organizationId: "merch-02",
    organizationName: "Mitra Auto Part Prima",
    ownerName: "CV Auto Part Prima",
    accountNumber: "SPAY-MERCH-8822002",
    withdrawableBalance: 0,
    pendingSettlement: 0,
    reservedBalance: 0,
    financialHold: 0,
    outstandingObligation: 0,
    destinationAccounts: [
      {
        id: "bank-merch-02-a",
        bankName: "Bank Rakyat Indonesia (BRI)",
        bankCode: "BRI",
        accountNumber: "•••• •••• 1290",
        accountHolder: "CV Auto Part Prima",
        isPrimary: true,
      },
    ],
    transactions: [],
  },
};

/**
 * MOCK S-PAY DATASET — SERVICE PROVIDER ORGANIZATIONS
 * Focus: Settlement hasil pengerjaan jasa yang telah selesai masa garansi.
 * Distinct per organization ID.
 */
export const MOCK_PROVIDER_SPAY_BY_ORG: Record<string, SPayAccountSummary> = {
  // Authoritative Provider Org ("0740d857-b665-4191-aaf5-d7dd3611dc1d" / "PT Servio Mandiri Teknik")
  "0740d857-b665-4191-aaf5-d7dd3611dc1d": {
    ownerType: "SERVICE_PROVIDER",
    organizationId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    organizationName: "PT Servio Mandiri Teknik",
    ownerName: "Budi Santoso",
    accountNumber: "SPAY-PROV-0740D857",
    withdrawableBalance: 100000,
    pendingSettlement: 290000,
    reservedBalance: 50000,
    financialHold: 0,
    outstandingObligation: 0,
    destinationAccounts: [
      {
        id: "01M6DH77WBK55MRSDAHGG3WD5F",
        bankName: "Bank Central Asia (BCA)",
        bankCode: "BCA",
        accountNumber: "•••• •••• 6789",
        accountHolder: "PT Servio Mandiri Teknik",
        isPrimary: true,
      },
    ],
    transactions: [],
  },
  // Default Provider Org alias ("prov-01" / "PT Servio Mandiri Teknik")
  "prov-01": {
    ownerType: "SERVICE_PROVIDER",
    organizationId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    organizationName: "PT Servio Mandiri Teknik",
    ownerName: "Budi Santoso",
    accountNumber: "SPAY-PROV-0740D857",
    withdrawableBalance: 100000,
    pendingSettlement: 290000,
    reservedBalance: 50000,
    financialHold: 0,
    outstandingObligation: 0,
    destinationAccounts: [
      {
        id: "01M6DH77WBK55MRSDAHGG3WD5F",
        bankName: "Bank Central Asia (BCA)",
        bankCode: "BCA",
        accountNumber: "•••• •••• 6789",
        accountHolder: "PT Servio Mandiri Teknik",
        isPrimary: true,
      },
    ],
    transactions: [],
  },
  // Second Provider Org ("087c97b7-2c46-4b97-ba35-1177dd72ba3a" / "Bengkel Sejuk Sentosa AC")
  "087c97b7-2c46-4b97-ba35-1177dd72ba3a": {
    ownerType: "SERVICE_PROVIDER",
    organizationId: "087c97b7-2c46-4b97-ba35-1177dd72ba3a",
    organizationName: "Bengkel Sejuk Sentosa AC",
    ownerName: "Budi Santoso",
    accountNumber: "SPAY-PROV-087C97B7",
    withdrawableBalance: 0,
    pendingSettlement: 0,
    reservedBalance: 0,
    financialHold: 0,
    outstandingObligation: 0,
    destinationAccounts: [],
    transactions: [],
  },

  // Second Provider Org for testing multi-org separation
  "prov-02": {
    ownerType: "SERVICE_PROVIDER",
    organizationId: "prov-02",
    organizationName: "Teknik Mandiri Otomotif",
    ownerName: "PT Teknik Mandiri Berkah",
    accountNumber: "SPAY-PROV-7720002",
    withdrawableBalance: 5200000,
    pendingSettlement: 1100000,
    reservedBalance: 350000,
    financialHold: 0,
    outstandingObligation: 0,
    destinationAccounts: [
      {
        id: "bank-prov-02-a",
        bankName: "Bank Mandiri",
        bankCode: "MANDIRI",
        accountNumber: "•••• •••• 6632",
        accountHolder: "PT Teknik Mandiri Berkah",
        isPrimary: true,
      },
    ],
    transactions: [
      {
        id: "tx-prov02-01",
        referenceNo: "SPY-SRV-20261018-77",
        type: "SETTLEMENT_SERVICE",
        direction: "IN",
        amount: 3200000,
        timestamp: "18 Okt 2026, 15:10 WIB",
        status: "COMPLETED",
        title: "Settlement Servis Rutin Armada",
        description: "Tune-up dan overhaul mesin kompresor",
        channel: "Escrow Servis Servio",
      },
    ],
  },
};
