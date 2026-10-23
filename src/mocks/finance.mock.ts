import {
  FinanceOrderTransaction,
  PeriodFilter,
  PeriodRevenueSummary,
  ManagedFundsSummary,
  TaxAndCostSummary,
  FinancialHealthMetrics,
  ActiveFeePolicyItem,
  RevenueStreamType,
  RevenueStreamDetail,
} from "@/types/finance";

// Design Token Color Palette for the 4 Model C Revenue Streams
export const REVENUE_STREAM_COLORS: Record<RevenueStreamType, string> = {
  CUSTOMER_PRODUCT_APP_FEE: "#F43F5E",    // Coral Pink (SERVIO Secondary)
  CUSTOMER_SERVICE_APP_FEE: "#0F4C81",    // Deep Ocean Blue (SERVIO Primary)
  MERCHANT_PRODUCT_COMMISSION: "#8B5CF6", // Violet / Purple (Partner Accent)
  PROVIDER_SERVICE_COMMISSION: "#10B981", // Emerald (Service Success)
};

export const REVENUE_STREAM_LABELS: Record<RevenueStreamType, { name: string; shortName: string; description: string }> = {
  CUSTOMER_PRODUCT_APP_FEE: {
    name: "Biaya Aplikasi Customer — Produk",
    shortName: "App Fee Produk",
    description: "Biaya pemeliharaan platform yang dibebankan kepada customer saat memesan suku cadang",
  },
  CUSTOMER_SERVICE_APP_FEE: {
    name: "Biaya Aplikasi Customer — Jasa",
    shortName: "App Fee Jasa",
    description: "Biaya pemeliharaan platform yang dibebankan kepada customer saat membooking jasa servis",
  },
  MERCHANT_PRODUCT_COMMISSION: {
    name: "Komisi Merchant — Produk",
    shortName: "Komisi Merchant",
    description: "Bagi hasil komisi platform dari penjualan suku cadang oleh toko mitra",
  },
  PROVIDER_SERVICE_COMMISSION: {
    name: "Komisi Service Provider — Jasa",
    shortName: "Komisi Provider",
    description: "Bagi hasil komisi platform atas penyelesaian order servis oleh bengkel/teknisi rekanan",
  },
};

// ============================================================================
// 1. DETERMINISTIC MOCK ORDER TRANSACTIONS
// ============================================================================
export const MOCK_FINANCE_TRANSACTIONS: FinanceOrderTransaction[] = [
  // 1. Service: AC Maintenance Overhaul (Recognized)
  {
    id: "TRX-2026-9001",
    orderId: "ORD-SRV-2026-081",
    paymentId: "PAY-BCA-77101",
    orderType: "SERVICE",
    customerName: "Ahmad Fauzi",
    partnerName: "PT Servio Mandiri Teknik",
    partnerOrgId: "prov-01",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 450000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.12,
    partnerCommissionAmount: 54000,
    partnerSettlementAmount: 396000,
    grossAmount: 460000,
    taxAmount: 49500,
    gatewayFee: 4500,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "BCA_VA",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-18T09:30:00Z",
    recognizedAt: "2026-10-18T14:15:00Z",
    createdAt: "2026-10-18T09:15:00Z",
    notes: "Pekerjaan servis cuci & overhaul AC inverter tuntas dengan rating 5 bintang.",
  },
  // 2. Product: Kompresor AC R32 1PK (Recognized)
  {
    id: "TRX-2026-9002",
    orderId: "ORD-PRD-2026-102",
    paymentId: "PAY-QRIS-88204",
    orderType: "PRODUCT",
    customerName: "Budi Santoso",
    partnerName: "Toko Suku Cadang Sejuk Abadi",
    partnerOrgId: "merch-01",
    partnerType: "MERCHANT",
    basePrice: 1250000,
    customerAppFee: 5000,
    partnerCommissionRate: 0.05,
    partnerCommissionAmount: 62500,
    partnerSettlementAmount: 1187500,
    grossAmount: 1255000,
    taxAmount: 0,
    gatewayFee: 2500,
    gatewayFeePayer: "CUSTOMER",
    paymentStatus: "PAID",
    paymentMethod: "QRIS",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-18T10:15:00Z",
    recognizedAt: "2026-10-18T16:00:00Z",
    createdAt: "2026-10-18T10:00:00Z",
    notes: "Sparepart original diterima dengan baik oleh pembeli.",
  },
  // 3. Service: Kuras Tangki & Pipa Saluran (In Escrow — Revenue NOT recognized yet)
  {
    id: "TRX-2026-9003",
    orderId: "ORD-SRV-2026-083",
    paymentId: "PAY-MDR-99312",
    orderType: "SERVICE",
    customerName: "Dewi Lestari",
    partnerName: "Karya Sejuk Nusantara",
    partnerOrgId: "prov-02",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 320000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.10,
    partnerCommissionAmount: 32000,
    partnerSettlementAmount: 288000,
    grossAmount: 330000,
    taxAmount: 35200,
    gatewayFee: 4000,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "MANDIRI_VA",
    revenueStatus: "PENDING_COMPLETION",
    settlementStatus: "PENDING_RELEASE",
    paidAt: "2026-10-19T08:00:00Z",
    createdAt: "2026-10-19T07:45:00Z",
    notes: "Teknisi sedang dalam perjalanan ke lokasi pelanggan. Dana masih di Escrow.",
  },
  // 4. Product: Pipa Tembaga Saeki 30m (Recognized)
  {
    id: "TRX-2026-9004",
    orderId: "ORD-PRD-2026-104",
    paymentId: "PAY-BRI-11029",
    orderType: "PRODUCT",
    customerName: "Iwan Setiawan",
    partnerName: "Bintang Diesel & AC Spareparts",
    partnerOrgId: "merch-02",
    partnerType: "MERCHANT",
    basePrice: 850000,
    customerAppFee: 5000,
    partnerCommissionRate: 0.05,
    partnerCommissionAmount: 42500,
    partnerSettlementAmount: 807500,
    grossAmount: 855000,
    taxAmount: 0,
    gatewayFee: 3000,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "BRI_VA",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-17T11:20:00Z",
    recognizedAt: "2026-10-17T17:40:00Z",
    createdAt: "2026-10-17T11:00:00Z",
    notes: "Pengiriman instan selesai.",
  },
  // 5. Service: Penggantian Kapasitor & Freon R410A (Recognized)
  {
    id: "TRX-2026-9005",
    orderId: "ORD-SRV-2026-085",
    paymentId: "PAY-SPAY-33011",
    orderType: "SERVICE",
    customerName: "Siti Rahmawati",
    partnerName: "PT Servio Mandiri Teknik",
    partnerOrgId: "prov-01",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 380000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.12,
    partnerCommissionAmount: 45600,
    partnerSettlementAmount: 334400,
    grossAmount: 390000,
    taxAmount: 41800,
    gatewayFee: 0,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "SPAY_BALANCE",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-17T14:10:00Z",
    recognizedAt: "2026-10-17T18:00:00Z",
    createdAt: "2026-10-17T13:50:00Z",
    notes: "Dibayar menggunakan Saldo S-Pay customer.",
  },
  // 6. Product: Filter Udara HEPA (Cancelled / Reversed Adjustment)
  {
    id: "TRX-2026-9006",
    orderId: "ORD-PRD-2026-106",
    paymentId: "PAY-BCA-55190",
    orderType: "PRODUCT",
    customerName: "Rian Pratama",
    partnerName: "Toko Suku Cadang Sejuk Abadi",
    partnerOrgId: "merch-01",
    partnerType: "MERCHANT",
    basePrice: 200000,
    customerAppFee: 5000,
    partnerCommissionRate: 0.05,
    partnerCommissionAmount: 10000,
    partnerSettlementAmount: 190000,
    grossAmount: 205000,
    taxAmount: 0,
    gatewayFee: 2000,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "BCA_VA",
    revenueStatus: "REVERSED",
    settlementStatus: "HELD",
    paidAt: "2026-10-16T15:00:00Z",
    recognizedAt: "2026-10-16T16:00:00Z",
    createdAt: "2026-10-16T14:45:00Z",
    notes: "Pembeli membatalkan pesanan karena salah varian ukuran. Dilakukan refund dan reversal fee.",
  },
  // 7. Service: General Maintenance 3 Unit AC (Recognized)
  {
    id: "TRX-2026-9007",
    orderId: "ORD-SRV-2026-087",
    paymentId: "PAY-CC-99014",
    orderType: "SERVICE",
    customerName: "Hendro Wijaya",
    partnerName: "Karya Sejuk Nusantara",
    partnerOrgId: "prov-02",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 650000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.10,
    partnerCommissionAmount: 65000,
    partnerSettlementAmount: 585000,
    grossAmount: 660000,
    taxAmount: 71500,
    gatewayFee: 13200,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "CREDIT_CARD",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-16T09:00:00Z",
    recognizedAt: "2026-10-16T13:30:00Z",
    createdAt: "2026-10-16T08:30:00Z",
    notes: "Pelanggan korporat kantor cabang.",
  },
  // 8. Product: Thermostat Digital AC Sentral (Recognized)
  {
    id: "TRX-2026-9008",
    orderId: "ORD-PRD-2026-108",
    paymentId: "PAY-QRIS-33991",
    orderType: "PRODUCT",
    customerName: "Maya Putri",
    partnerName: "Bintang Diesel & AC Spareparts",
    partnerOrgId: "merch-02",
    partnerType: "MERCHANT",
    basePrice: 420000,
    customerAppFee: 5000,
    partnerCommissionRate: 0.05,
    partnerCommissionAmount: 21000,
    partnerSettlementAmount: 399000,
    grossAmount: 425000,
    taxAmount: 0,
    gatewayFee: 2100,
    gatewayFeePayer: "CUSTOMER",
    paymentStatus: "PAID",
    paymentMethod: "QRIS",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-15T16:20:00Z",
    recognizedAt: "2026-10-15T19:00:00Z",
    createdAt: "2026-10-15T16:00:00Z",
    notes: "Pengiriman reguler JNE.",
  },
  // 9. Service: Perbaikan Kebocoran Evaporator (Recognized)
  {
    id: "TRX-2026-9009",
    orderId: "ORD-SRV-2026-089",
    paymentId: "PAY-BCA-10294",
    orderType: "SERVICE",
    customerName: "Doni Prasetyo",
    partnerName: "PT Servio Mandiri Teknik",
    partnerOrgId: "prov-01",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 550000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.12,
    partnerCommissionAmount: 66000,
    partnerSettlementAmount: 484000,
    grossAmount: 560000,
    taxAmount: 60500,
    gatewayFee: 4500,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "BCA_VA",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-15T10:00:00Z",
    recognizedAt: "2026-10-15T15:45:00Z",
    createdAt: "2026-10-15T09:40:00Z",
    notes: "Garansi 30 hari aktif.",
  },
  // 10. Service: Bongkar Pasang AC 2 Unit (Recognized)
  {
    id: "TRX-2026-9010",
    orderId: "ORD-SRV-2026-090",
    paymentId: "PAY-MDR-22019",
    orderType: "SERVICE",
    customerName: "Fajar Nugraha",
    partnerName: "Karya Sejuk Nusantara",
    partnerOrgId: "prov-02",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 500000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.10,
    partnerCommissionAmount: 50000,
    partnerSettlementAmount: 450000,
    grossAmount: 510000,
    taxAmount: 55000,
    gatewayFee: 4000,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "MANDIRI_VA",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-14T11:00:00Z",
    recognizedAt: "2026-10-14T16:00:00Z",
    createdAt: "2026-10-14T10:30:00Z",
    notes: "Pindah rumah selesai.",
  },
  // 11. Product: Remote Universal AC & Bracket (Recognized)
  {
    id: "TRX-2026-9011",
    orderId: "ORD-PRD-2026-111",
    paymentId: "PAY-QRIS-99120",
    orderType: "PRODUCT",
    customerName: "Linda Kusuma",
    partnerName: "Toko Suku Cadang Sejuk Abadi",
    partnerOrgId: "merch-01",
    partnerType: "MERCHANT",
    basePrice: 175000,
    customerAppFee: 5000,
    partnerCommissionRate: 0.05,
    partnerCommissionAmount: 8750,
    partnerSettlementAmount: 166250,
    grossAmount: 180000,
    taxAmount: 0,
    gatewayFee: 1500,
    gatewayFeePayer: "CUSTOMER",
    paymentStatus: "PAID",
    paymentMethod: "QRIS",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-14T13:15:00Z",
    recognizedAt: "2026-10-14T15:30:00Z",
    createdAt: "2026-10-14T13:00:00Z",
    notes: "Pengiriman same-day.",
  },
  // 12. Product: Oli Kompresor Emkarate RL68H (Recognized)
  {
    id: "TRX-2026-9012",
    orderId: "ORD-PRD-2026-112",
    paymentId: "PAY-BCA-98100",
    orderType: "PRODUCT",
    customerName: "Tri Wibowo",
    partnerName: "Bintang Diesel & AC Spareparts",
    partnerOrgId: "merch-02",
    partnerType: "MERCHANT",
    basePrice: 280000,
    customerAppFee: 5000,
    partnerCommissionRate: 0.05,
    partnerCommissionAmount: 14000,
    partnerSettlementAmount: 266000,
    grossAmount: 285000,
    taxAmount: 0,
    gatewayFee: 4000,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "BCA_VA",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-13T10:00:00Z",
    recognizedAt: "2026-10-13T16:00:00Z",
    createdAt: "2026-10-13T09:40:00Z",
    notes: "Suku cadang bengkel rekanan.",
  },
  // 13. Service: Pengecekan PCB Modul Elektronik (Recognized)
  {
    id: "TRX-2026-9013",
    orderId: "ORD-SRV-2026-093",
    paymentId: "PAY-BRI-44091",
    orderType: "SERVICE",
    customerName: "Gunawan Santoso",
    partnerName: "PT Servio Mandiri Teknik",
    partnerOrgId: "prov-01",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 250000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.12,
    partnerCommissionAmount: 30000,
    partnerSettlementAmount: 220000,
    grossAmount: 260000,
    taxAmount: 27500,
    gatewayFee: 3000,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "BRI_VA",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-13T14:00:00Z",
    recognizedAt: "2026-10-13T18:00:00Z",
    createdAt: "2026-10-13T13:45:00Z",
    notes: "Solder ulang modul power supply selesai.",
  },
  // 14. Failed Transaction (Payment Expired — NO revenue)
  {
    id: "TRX-2026-9014",
    orderId: "ORD-PRD-2026-114",
    paymentId: "PAY-BCA-99441",
    orderType: "PRODUCT",
    customerName: "Rudi Haryanto",
    partnerName: "Toko Suku Cadang Sejuk Abadi",
    partnerOrgId: "merch-01",
    partnerType: "MERCHANT",
    basePrice: 600000,
    customerAppFee: 5000,
    partnerCommissionRate: 0.05,
    partnerCommissionAmount: 30000,
    partnerSettlementAmount: 570000,
    grossAmount: 605000,
    taxAmount: 0,
    gatewayFee: 0,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "EXPIRED",
    paymentMethod: "BCA_VA",
    revenueStatus: "NOT_RECOGNIZED",
    settlementStatus: "HELD",
    createdAt: "2026-10-12T11:00:00Z",
    notes: "Pelanggan tidak menyelesaikan transfer VA hingga batas 24 jam.",
  },
  // 15. Service: Pembersihan Unit Outdoor Industri (Recognized)
  {
    id: "TRX-2026-9015",
    orderId: "ORD-SRV-2026-095",
    paymentId: "PAY-MDR-88902",
    orderType: "SERVICE",
    customerName: "Wahyu Hidayat",
    partnerName: "Karya Sejuk Nusantara",
    partnerOrgId: "prov-02",
    partnerType: "SERVICE_PROVIDER",
    basePrice: 750000,
    customerAppFee: 10000,
    partnerCommissionRate: 0.10,
    partnerCommissionAmount: 75000,
    partnerSettlementAmount: 675000,
    grossAmount: 760000,
    taxAmount: 82500,
    gatewayFee: 4000,
    gatewayFeePayer: "SERVIO",
    paymentStatus: "PAID",
    paymentMethod: "MANDIRI_VA",
    revenueStatus: "RECOGNIZED",
    settlementStatus: "SETTLED",
    paidAt: "2026-10-12T08:30:00Z",
    recognizedAt: "2026-10-12T15:00:00Z",
    createdAt: "2026-10-12T08:00:00Z",
    notes: "Maintenance mingguan unit komersial.",
  },
];

// ============================================================================
// 2. ACTIVE FEE POLICIES (Model C Governance)
// ============================================================================
export const MOCK_ACTIVE_FEE_POLICIES: ActiveFeePolicyItem[] = [
  {
    id: "POL-CFEE-PRD",
    streamType: "CUSTOMER_PRODUCT_APP_FEE",
    title: "Biaya Aplikasi Customer — Belanja Produk",
    orderType: "PRODUCT",
    calculationType: "FIXED_AMOUNT",
    currentValue: 5000,
    displayValue: "Rp 5.000",
    status: "ACTIVE",
    version: "v2.0-LOCKED",
    effectiveFrom: "2026-08-01T00:00:00Z",
    appliedBy: "Michael Surya (CEO)",
    notes: "Nominal tetap per transaksi checkout suku cadang / sparepart resmi.",
  },
  {
    id: "POL-CFEE-SRV",
    streamType: "CUSTOMER_SERVICE_APP_FEE",
    title: "Biaya Aplikasi Customer — Booking Jasa",
    orderType: "SERVICE",
    calculationType: "FIXED_AMOUNT",
    currentValue: 10000,
    displayValue: "Rp 10.000",
    status: "ACTIVE",
    version: "v2.0-LOCKED",
    effectiveFrom: "2026-08-01T00:00:00Z",
    appliedBy: "Michael Surya (CEO)",
    notes: "Nominal tetap per transaksi booking teknisi & bengkel rekanan bersertifikat.",
  },
  {
    id: "POL-COMM-MERCH",
    streamType: "MERCHANT_PRODUCT_COMMISSION",
    title: "Komisi Penjualan Toko Mitra (Merchant)",
    orderType: "PRODUCT",
    calculationType: "PERCENTAGE",
    currentValue: 5.0,
    displayValue: "5.0%",
    status: "ACTIVE",
    version: "v2.0-LOCKED",
    effectiveFrom: "2026-08-01T00:00:00Z",
    appliedBy: "Michael Surya (CEO)",
    notes: "Dipotong langsung dari subtotal harga suku cadang sebelum settlement ditransfer ke toko mitra.",
  },
  {
    id: "POL-COMM-PROV",
    streamType: "PROVIDER_SERVICE_COMMISSION",
    title: "Komisi Jasa Mitra Bengkel & Teknisi (Provider)",
    orderType: "SERVICE",
    calculationType: "PERCENTAGE",
    currentValue: 10.0,
    displayValue: "10.0% – 12.0%",
    status: "ACTIVE",
    version: "v2.0-LOCKED",
    effectiveFrom: "2026-08-01T00:00:00Z",
    appliedBy: "Michael Surya (CEO)",
    notes: "Tiering komisi 10% untuk tier Silver/Gold, 12% untuk tier Platinum dengan prioritas dispatch.",
  },
];

// ============================================================================
// 3. DETERMINISTIC PERIOD SUMMARIES (Calculated from MOCK_FINANCE_TRANSACTIONS)
// ============================================================================
// Calculate exact deterministic numbers per period
export function getDeterministicRevenueSummary(period: PeriodFilter): PeriodRevenueSummary {
  // Filter recognized transactions
  const recognized = MOCK_FINANCE_TRANSACTIONS.filter((t) => t.revenueStatus === "RECOGNIZED");
  
  // Calculate streams
  let customerProductFee = 0;
  let customerServiceFee = 0;
  let merchantCommission = 0;
  let providerCommission = 0;
  
  let productOrderCount = 0;
  let serviceOrderCount = 0;
  
  let productAppFeeCount = 0;
  let serviceAppFeeCount = 0;
  let merchantCommCount = 0;
  let providerCommCount = 0;

  recognized.forEach((t) => {
    if (t.orderType === "PRODUCT") {
      customerProductFee += t.customerAppFee;
      merchantCommission += t.partnerCommissionAmount;
      productOrderCount++;
      productAppFeeCount++;
      merchantCommCount++;
    } else {
      customerServiceFee += t.customerAppFee;
      providerCommission += t.partnerCommissionAmount;
      serviceOrderCount++;
      serviceAppFeeCount++;
      providerCommCount++;
    }
  });

  // Reversal adjustments (e.g. from TRX-2026-9006 which was cancelled)
  const reversalAdjustment = 15000; // Rp 5.000 app fee + Rp 10.000 merchant comm reversed

  const grossTotal = customerProductFee + customerServiceFee + merchantCommission + providerCommission;
  const netTotal = grossTotal - reversalAdjustment;

  // Multipliers based on period filter to simulate realistic aggregations
  const multiplier = period === "DAILY" ? 0.35 : period === "WEEKLY" ? 1.0 : 4.2;
  const growthRate = period === "DAILY" ? 18.4 : period === "WEEKLY" ? 14.2 : 22.8;

  const adjCustomerProductFee = Math.round(customerProductFee * multiplier);
  const adjCustomerServiceFee = Math.round(customerServiceFee * multiplier);
  const adjMerchantCommission = Math.round(merchantCommission * multiplier);
  const adjProviderCommission = Math.round(providerCommission * multiplier);
  const adjReversal = Math.round(reversalAdjustment * multiplier);
  
  const adjGross = adjCustomerProductFee + adjCustomerServiceFee + adjMerchantCommission + adjProviderCommission;
  const adjNet = adjGross - adjReversal;

  const streamDetails: Record<RevenueStreamType, RevenueStreamDetail> = {
    CUSTOMER_PRODUCT_APP_FEE: {
      streamType: "CUSTOMER_PRODUCT_APP_FEE",
      name: REVENUE_STREAM_LABELS.CUSTOMER_PRODUCT_APP_FEE.name,
      shortName: REVENUE_STREAM_LABELS.CUSTOMER_PRODUCT_APP_FEE.shortName,
      orderType: "PRODUCT",
      grossAmount: adjCustomerProductFee,
      adjustmentAmount: Math.round(5000 * multiplier),
      netAmount: adjCustomerProductFee - Math.round(5000 * multiplier),
      percentage: Math.round((adjCustomerProductFee / adjGross) * 100),
      transactionCount: Math.round(productAppFeeCount * multiplier),
      color: REVENUE_STREAM_COLORS.CUSTOMER_PRODUCT_APP_FEE,
      description: REVENUE_STREAM_LABELS.CUSTOMER_PRODUCT_APP_FEE.description,
    },
    CUSTOMER_SERVICE_APP_FEE: {
      streamType: "CUSTOMER_SERVICE_APP_FEE",
      name: REVENUE_STREAM_LABELS.CUSTOMER_SERVICE_APP_FEE.name,
      shortName: REVENUE_STREAM_LABELS.CUSTOMER_SERVICE_APP_FEE.shortName,
      orderType: "SERVICE",
      grossAmount: adjCustomerServiceFee,
      adjustmentAmount: 0,
      netAmount: adjCustomerServiceFee,
      percentage: Math.round((adjCustomerServiceFee / adjGross) * 100),
      transactionCount: Math.round(serviceAppFeeCount * multiplier),
      color: REVENUE_STREAM_COLORS.CUSTOMER_SERVICE_APP_FEE,
      description: REVENUE_STREAM_LABELS.CUSTOMER_SERVICE_APP_FEE.description,
    },
    MERCHANT_PRODUCT_COMMISSION: {
      streamType: "MERCHANT_PRODUCT_COMMISSION",
      name: REVENUE_STREAM_LABELS.MERCHANT_PRODUCT_COMMISSION.name,
      shortName: REVENUE_STREAM_LABELS.MERCHANT_PRODUCT_COMMISSION.shortName,
      orderType: "PRODUCT",
      grossAmount: adjMerchantCommission,
      adjustmentAmount: Math.round(10000 * multiplier),
      netAmount: adjMerchantCommission - Math.round(10000 * multiplier),
      percentage: Math.round((adjMerchantCommission / adjGross) * 100),
      transactionCount: Math.round(merchantCommCount * multiplier),
      color: REVENUE_STREAM_COLORS.MERCHANT_PRODUCT_COMMISSION,
      description: REVENUE_STREAM_LABELS.MERCHANT_PRODUCT_COMMISSION.description,
    },
    PROVIDER_SERVICE_COMMISSION: {
      streamType: "PROVIDER_SERVICE_COMMISSION",
      name: REVENUE_STREAM_LABELS.PROVIDER_SERVICE_COMMISSION.name,
      shortName: REVENUE_STREAM_LABELS.PROVIDER_SERVICE_COMMISSION.shortName,
      orderType: "SERVICE",
      grossAmount: adjProviderCommission,
      adjustmentAmount: 0,
      netAmount: adjProviderCommission,
      percentage: Math.round((adjProviderCommission / adjGross) * 100),
      transactionCount: Math.round(providerCommCount * multiplier),
      color: REVENUE_STREAM_COLORS.PROVIDER_SERVICE_COMMISSION,
      description: REVENUE_STREAM_LABELS.PROVIDER_SERVICE_COMMISSION.description,
    },
  };

  const productTotal = streamDetails.CUSTOMER_PRODUCT_APP_FEE.netAmount + streamDetails.MERCHANT_PRODUCT_COMMISSION.netAmount;
  const serviceTotal = streamDetails.CUSTOMER_SERVICE_APP_FEE.netAmount + streamDetails.PROVIDER_SERVICE_COMMISSION.netAmount;

  // Time Series for Bar Chart
  let timeSeries: PeriodRevenueSummary["timeSeries"] = [];

  if (period === "DAILY") {
    timeSeries = [
      { timestamp: "06:00", label: "06:00 - 09:00", totalRevenue: 125000, productRevenue: 35000, serviceRevenue: 90000 },
      { timestamp: "09:00", label: "09:00 - 12:00", totalRevenue: 285000, productRevenue: 95000, serviceRevenue: 190000 },
      { timestamp: "12:00", label: "12:00 - 15:00", totalRevenue: 195000, productRevenue: 65000, serviceRevenue: 130000 },
      { timestamp: "15:00", label: "15:00 - 18:00", totalRevenue: 340000, productRevenue: 120000, serviceRevenue: 220000 },
      { timestamp: "18:00", label: "18:00 - 21:00", totalRevenue: 165000, productRevenue: 55000, serviceRevenue: 110000 },
    ];
  } else if (period === "WEEKLY") {
    timeSeries = [
      { timestamp: "Sen", label: "Senin, 13 Okt", totalRevenue: 384000, productRevenue: 114000, serviceRevenue: 270000 },
      { timestamp: "Sel", label: "Selasa, 14 Okt", totalRevenue: 495000, productRevenue: 145000, serviceRevenue: 350000 },
      { timestamp: "Rab", label: "Rabu, 15 Okt", totalRevenue: 520000, productRevenue: 160000, serviceRevenue: 360000 },
      { timestamp: "Kam", label: "Kamis, 16 Okt", totalRevenue: 440000, productRevenue: 110000, serviceRevenue: 330000 },
      { timestamp: "Jum", label: "Jumat, 17 Okt", totalRevenue: 610000, productRevenue: 190000, serviceRevenue: 420000 },
      { timestamp: "Sab", label: "Sabtu, 18 Okt", totalRevenue: 780000, productRevenue: 260000, serviceRevenue: 520000 },
      { timestamp: "Min", label: "Minggu, 19 Okt", totalRevenue: 580000, productRevenue: 180000, serviceRevenue: 400000 },
    ];
  } else {
    timeSeries = [
      { timestamp: "M1", label: "Minggu 1 (1–7 Okt)", totalRevenue: 2650000, productRevenue: 850000, serviceRevenue: 1800000 },
      { timestamp: "M2", label: "Minggu 2 (8–14 Okt)", totalRevenue: 3120000, productRevenue: 980000, serviceRevenue: 2140000 },
      { timestamp: "M3", label: "Minggu 3 (15–21 Okt)", totalRevenue: 3810000, productRevenue: 1220000, serviceRevenue: 2590000 },
      { timestamp: "M4", label: "Minggu 4 (22–31 Okt)", totalRevenue: 4180000, productRevenue: 1350000, serviceRevenue: 2830000 },
    ];
  }

  return {
    period,
    periodLabel: period === "DAILY" ? "Hari Ini (20 Okt 2026)" : period === "WEEKLY" ? "7 Hari Terakhir (13–19 Okt 2026)" : "Bulan Berjalan (Oktober 2026)",
    startDate: period === "DAILY" ? "2026-10-20" : period === "WEEKLY" ? "2026-10-13" : "2026-10-01",
    endDate: "2026-10-20",
    totalGrossRevenue: adjGross,
    totalAdjustment: adjReversal,
    totalNetRevenue: adjNet,
    growthRateVsPreviousPeriod: growthRate,
    streams: streamDetails,
    comparison: {
      product: {
        customerAppFee: streamDetails.CUSTOMER_PRODUCT_APP_FEE.netAmount,
        merchantCommission: streamDetails.MERCHANT_PRODUCT_COMMISSION.netAmount,
        totalRevenue: productTotal,
        percentage: Math.round((productTotal / adjNet) * 100),
        orderVolume: Math.round(productOrderCount * multiplier),
      },
      service: {
        customerAppFee: streamDetails.CUSTOMER_SERVICE_APP_FEE.netAmount,
        providerCommission: streamDetails.PROVIDER_SERVICE_COMMISSION.netAmount,
        totalRevenue: serviceTotal,
        percentage: Math.round((serviceTotal / adjNet) * 100),
        orderVolume: Math.round(serviceOrderCount * multiplier),
      },
    },
    timeSeries,
  };
}

// ============================================================================
// 4. MANAGED FUNDS & LIABILITIES (Strictly Separated from Revenue!)
// ============================================================================
export const MOCK_MANAGED_FUNDS: ManagedFundsSummary = {
  gmvTotal: 48920000,                         // Total Nilai Transaksi Order (GMV)
  confirmedPaymentsTotal: 47250000,           // Pembayaran sukses terkonfirmasi
  pendingPaymentsTotal: 1670000,              // Pembayaran pending webhook
  activeEscrowBalance: 14850000,              // Dana penampung aktif sebelum order complete
  merchantSettlementBalance: 12450000,        // Hak settlement Merchant siap ditarik
  providerSettlementBalance: 16820000,        // Hak settlement Service Provider siap ditarik
  spayCustomerRefundBalance: 1850000,         // Saldo refund di S-Pay customer
  unfundedRefundLiability: 0,                 // Seluruh kewajiban refund 100% terdanai
  totalWithdrawnToBank: 32600000,             // Dana yang telah dicairkan ke bank mitra
  pendingWithdrawalBatch: 3450000,            // Antrean pencairan siap batch disbursement
};

// ============================================================================
// 5. TAXES & TRANSACTION PROCESSING COSTS
// ============================================================================
export const MOCK_TAX_AND_COSTS: TaxAndCostSummary = {
  recordedPPN: 346500,                        // PPN 11% tercatat
  recordedPPh23: 112000,                      // PPh 23 tercatat
  taxComplianceStatus: "COMPLIANT",
  gatewayFeesServioExpense: 148000,           // Biaya gateway ditanggung platform
  gatewayFeesUserPaid: 45000,                 // Biaya gateway dibebankan ke user (convenience fee)
  payoutFeesServioExpense: 37500,             // Biaya BI-FAST Rp 2.500 x 15 transfer mitra ditanggung SERVIO
  totalServioProcessingCost: 185500,          // Total beban processing SERVIO
  netPlatformContribution: 3624500,           // Net Revenue - Total Servio Processing Cost
};

// ============================================================================
// 6. FINANCIAL HEALTH & RECONCILIATION SUMMARY
// ============================================================================
export const MOCK_FINANCIAL_HEALTH: FinancialHealthMetrics = {
  outstandingSettlementAmount: 29270000,      // Hak settlement belum ditarik mitra (Merchant + Provider)
  outstandingRefundCount: 2,                  // 2 antrean audit CS
  outstandingRefundAmount: 275000,
  pendingPayoutBatchCount: 4,                 // 4 pencairan siap dikirim ke BI-FAST
  pendingPayoutBatchAmount: 3450000,
  reconciliationMatchCount: 148,
  reconciliationDiscrepancyCount: 1,          // 1 perbedaan saldo gateway vs bank
  reconciliationDiscrepancyAmount: 4500,      // Selisih pembulatan admin bank
  reconciliationMatchRate: 99.3,
};
