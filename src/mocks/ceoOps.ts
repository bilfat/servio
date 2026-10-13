import {
  TaxonomyProposal,
  FeePolicyConfig,
  ShippingGovernancePolicy,
  ReturnGovernancePolicy,
  GuaranteeGovernancePolicy,
  AISmartDiscoveryTelemetry,
  AISafetyIncident,
} from "@/types/domain";

/**
 * INITIAL TAXONOMY PROPOSALS (Awaiting CEO Governance Approval or Historical)
 */
export const INITIAL_TAXONOMY_PROPOSALS: TaxonomyProposal[] = [
  {
    id: "tax-prop-001",
    domainId: "repair",
    domainName: "Reparasi & Servis Teknis",
    subcategoryId: "subcat-ac-inverter",
    subcategoryName: "AC Inverter & Smart HVAC Multi-Split",
    proposalType: "NEW_SUBCATEGORY",
    title: "Penambahan Subkategori Khusus AC Inverter Multi-Split & VRV System",
    description:
      "Admin Ops mengajukan spesialisasi subkategori AC Inverter untuk mengakomodasi unit gedung komersial dan residensial premium yang membutuhkan sertifikasi refrigerant R32/R410A tekanan tinggi.",
    proposedBy: "Fajar Wicaksono (Platform Operations)",
    proposedByRole: "ADMIN_OPERATIONS",
    proposedAt: "2026-09-21 11:20 WIB",
    status: "PENDING_APPROVAL",
    impactSummary: {
      affectedServicesCount: 14,
      activeProvidersCount: 8,
      estimatedGmvImpactPercent: 8.5,
      catalogCompatibilityNotes:
        "Memerlukan pembaruan skema form order dinamis untuk input tekanan manifold (PSI) dan sensor arus inverter.",
    },
    schemaChanges: {
      addedFields: ["manifold_pressure_psi", "inverter_error_code", "inverter_pcb_brand"],
      modifiedValidations: ["require_certified_refrigerant_technician: true"],
    },
  },
  {
    id: "tax-prop-002",
    domainId: "automotive",
    domainName: "Otomotif & Kendaraan Listrik",
    subcategoryId: "subcat-ev-home-charging",
    subcategoryName: "Instalasi & Servis Home Charging EV",
    proposalType: "UPDATE_REQUIREMENTS",
    title: "Pengetatan Standar K3 & Sertifikasi Teknisi Home Charger Mobil Listrik",
    description:
      "Penyesuaian syarat verifikasi sertifikat teknisi untuk instalasi Wallbox EV Charging 7.4 kW - 22 kW guna mencegah risiko overvoltage dan kegagalan grounding.",
    proposedBy: "Fajar Wicaksono (Platform Operations)",
    proposedByRole: "ADMIN_OPERATIONS",
    proposedAt: "2026-09-20 16:45 WIB",
    status: "PENDING_APPROVAL",
    impactSummary: {
      affectedServicesCount: 6,
      activeProvidersCount: 4,
      estimatedGmvImpactPercent: 4.2,
      catalogCompatibilityNotes:
        "Penyedia jasa wajib mengunggah sertifikat kompetensi instalasi kelistrikan tegangan menengah.",
    },
    schemaChanges: {
      addedFields: ["grounding_resistance_ohm", "breaker_rating_amperes"],
      modifiedValidations: ["require_sloc_certificate: true"],
    },
  },
  {
    id: "tax-prop-003",
    domainId: "cleaning",
    domainName: "Pembersihan & Sanitasi",
    subcategoryId: "subcat-facade-cleaning",
    subcategoryName: "Pembersihan Fasad Kaca Gedung Bertingkat",
    proposalType: "UPDATE_SCHEMA",
    title: "Standarisasi Formulir Inspeksi Rope Access & Asuransi Ketinggian",
    description:
      "Perubahan skema data inspeksi pra-layanan untuk pekerjaan akses tali (rope access) pada fasad kaca apartemen dan perkantoran.",
    proposedBy: "Fajar Wicaksono (Platform Operations)",
    proposedByRole: "ADMIN_OPERATIONS",
    proposedAt: "2026-09-18 09:15 WIB",
    status: "APPROVED",
    decisionNotes:
      "Disetujui oleh CEO. Keamanan dan kepatuhan K3 adalah pilar utama reputasi SERVIO.",
    decidedAt: "2026-09-19 14:00 WIB",
    decidedBy: "Michael Tanuwijaya (CEO & Founder)",
    impactSummary: {
      affectedServicesCount: 8,
      activeProvidersCount: 5,
      estimatedGmvImpactPercent: 3.1,
      catalogCompatibilityNotes: "SOP keselamatan kerja rope access level 1-3 terintegrasi ke alur booking.",
    },
  },
];

/**
 * INITIAL FEE POLICIES (Versioned Take-Rate & Platform Fee Governance)
 */
export const INITIAL_FEE_POLICIES: FeePolicyConfig[] = [
  {
    id: "fee-pol-v24",
    version: "v2.4",
    status: "CURRENT",
    effectiveDate: "2026-07-01",
    serviceTakeRatePercent: 12.5,
    productTakeRatePercent: 8.0,
    b2bTakeRatePercent: 3.5,
    platformProtectionFee: 5000,
    escrowFeePercent: 1.0,
    minServiceFee: 15000,
    maxServiceFeeCap: 2500000,
    description:
      "Kebijakan fee platform aktif tahun anggaran 2026 Q3. Menyeimbangkan margin platform dengan daya saing mitra.",
    notes: "Diterapkan sejak 1 Juli 2026 setelah pengesahan dewan eksekutif.",
    createdBy: "Michael Tanuwijaya (CEO & Founder)",
    createdAt: "2026-06-25 10:00 WIB",
    publishedBy: "Michael Tanuwijaya (CEO & Founder)",
    publishedAt: "2026-06-28 16:30 WIB",
  },
  {
    id: "fee-pol-v23",
    version: "v2.3",
    status: "ARCHIVED",
    effectiveDate: "2026-01-01",
    serviceTakeRatePercent: 14.0,
    productTakeRatePercent: 9.0,
    b2bTakeRatePercent: 4.0,
    platformProtectionFee: 4000,
    escrowFeePercent: 1.2,
    minServiceFee: 12000,
    maxServiceFeeCap: 2000000,
    description: "Kebijakan fee legacy Q1-Q2 2026. Diarsipkan setelah migrasi ke v2.4.",
    notes: "Telah digantikan oleh v2.4.",
    createdBy: "Michael Tanuwijaya (CEO & Founder)",
    createdAt: "2025-12-20 11:00 WIB",
    publishedBy: "Michael Tanuwijaya (CEO & Founder)",
    publishedAt: "2025-12-28 15:00 WIB",
  },
];

/**
 * INITIAL SHIPPING GOVERNANCE POLICY
 */
export const INITIAL_SHIPPING_POLICY: ShippingGovernancePolicy = {
  id: "gov-ship-v12",
  version: "v1.2",
  status: "CURRENT",
  effectiveDate: "2026-08-01",
  standardFulfillmentSlaHours: 24,
  expressFulfillmentSlaHours: 4,
  cargoStagingSlaHours: 48,
  carrierEscalationThresholdMinutes: 120,
  remoteAreaSurchargeAllowed: true,
  maxFreeInsuranceCap: 10000000,
  notes:
    "Kebijakan SLA pengiriman suku cadang logistik retail & kargo B2B. Mewajibkan kurir webhook responsif di bawah 120 menit.",
  updatedAt: "2026-08-01 09:00 WIB",
  updatedBy: "Michael Tanuwijaya (CEO & Founder)",
};

/**
 * INITIAL RETURN & REFUND GOVERNANCE POLICY
 */
export const INITIAL_RETURN_POLICY: ReturnGovernancePolicy = {
  id: "gov-ret-v11",
  version: "v1.1",
  status: "CURRENT",
  effectiveDate: "2026-08-01",
  retailReturnWindowDays: 7,
  b2bReturnWindowDays: 14,
  requireUnboxingVideo: true,
  inspectionSlaHours: 48,
  sellerRestockingFeePercent: 5,
  disputeEscalationWindowDays: 3,
  notes:
    "Mewajibkan bukti video unboxing tanpa jeda untuk retur fisik komponen elektronik guna memitigasi risiko fraud.",
  updatedAt: "2026-08-01 09:00 WIB",
  updatedBy: "Michael Tanuwijaya (CEO & Founder)",
};

/**
 * INITIAL GUARANTEE & WARRANTY GOVERNANCE POLICY
 */
export const INITIAL_GUARANTEE_POLICY: GuaranteeGovernancePolicy = {
  id: "gov-guar-v20",
  version: "v2.0",
  status: "CURRENT",
  effectiveDate: "2026-08-01",
  workmanshipWarrantyDays: 30,
  sparepartWarrantyDays: 90,
  autoRefundThreshold: 150000,
  reServiceMaxAttempts: 2,
  customerSatisfactionCoveragePercent: 100,
  notes:
    "Jaminan garansi pengerjaan 30 hari standar emas SERVIO. Klaim berulang hingga 2x pengerjaan ulang gratis sebelum eskalasi ganti rugi escrow.",
  updatedAt: "2026-08-01 09:00 WIB",
  updatedBy: "Michael Tanuwijaya (CEO & Founder)",
};

/**
 * INITIAL AI SMART DISCOVERY TELEMETRY & METRICS
 */
export const INITIAL_AI_TELEMETRY: AISmartDiscoveryTelemetry = {
  totalDiscoverySessions: 1842,
  recommendationAcceptanceRate: 76.4,
  clickThroughRate: 61.8,
  conversionRate: 34.2,
  averageLatencyMs: 380,
  ruleFallbackRate: 4.1,
  userSatisfactionScore: 4.85,
  lastUpdated: "2026-09-21 23:45 WIB",
  architectureLayers: [
    {
      name: "Gemini 2.5 Intent Engine",
      description: "Natural language symptom understanding & conversational query parsing",
      status: "HEALTHY",
      latencyMs: 195,
    },
    {
      name: "Servio Ranking ML",
      description: "Provider scoring based on distance, verified skill tags, and rating",
      status: "HEALTHY",
      latencyMs: 95,
    },
    {
      name: "Deterministic Business Rules",
      description: "Hard safety constraints, inventory stock checks, and pricing validation",
      status: "HEALTHY",
      latencyMs: 35,
    },
    {
      name: "CentralDomainStore Grounding",
      description: "Authoritative single-source-of-truth database lookup",
      status: "HEALTHY",
      latencyMs: 55,
    },
  ],
};

/**
 * INITIAL AI SAFETY INCIDENTS & GUARDRAIL LOGS
 */
export const INITIAL_AI_INCIDENTS: AISafetyIncident[] = [
  {
    id: "ai-inc-101",
    timestamp: "2026-09-21 17:30 WIB",
    severity: "HIGH",
    type: "HIGH_VOLTAGE_CERT_BYPASS",
    description:
      "Pengguna meminta perbaikan trafo panel distribusi listrik 380V. Model LLM awalnya hendak merekomendasikan teknisi listrik domestik.",
    promptSummary: "Panel MCB 3 phase pabrik meledak butuh teknisi sekarang",
    blockedBy: "HARD_RULES",
    status: "RESOLVED",
    mitigationAction:
      "Hard constraint memblokir otomatis dan membelokkan order ke Penyedia Bersertifikat AK3 Listrik Tegangan Menengah.",
    resolvedAt: "2026-09-21 17:31 WIB",
    resolvedBy: "Automated Safety Guardrail & Michael Tanuwijaya",
  },
  {
    id: "ai-inc-102",
    timestamp: "2026-09-21 14:15 WIB",
    severity: "MEDIUM",
    type: "PRICE_INVENTION_ATTEMPT",
    description:
      "Rekomendasi mencoba menyebut estimasi biaya di luar rentang harga base price katalog taksonomi yang terdaftar.",
    promptSummary: "Bisa dapat diskon servis AC inverter jadi 30 ribu?",
    blockedBy: "CATALOG_CONSTRAINT",
    status: "RESOLVED",
    mitigationAction:
      "Aturan deterministik menolak angka buatan dan menampilkan rentang harga resmi platform (Rp 75.000 - Rp 150.000).",
    resolvedAt: "2026-09-21 14:16 WIB",
    resolvedBy: "Automated Catalog Grounding Rule",
  },
  {
    id: "ai-inc-103",
    timestamp: "2026-09-20 20:05 WIB",
    severity: "LOW",
    type: "OUT_OF_STOCK_RECOMMENDATION",
    description:
      "Model menyarankan suku cadang kompresor yang stok fisiknya di merchant terdekat = 0.",
    promptSummary: "Rekomendasi kompresor Daikin 1 PK untuk AC kamar",
    blockedBy: "HARD_RULES",
    status: "RESOLVED",
    mitigationAction:
      "Sistem filtering inventaris 5-bucket memfilter item out-of-stock sebelum ditampilkan ke pelanggan.",
    resolvedAt: "2026-09-20 20:06 WIB",
    resolvedBy: "Inventory 5-Bucket Filter Layer",
  },
];
