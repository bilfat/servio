import {
  BookingAIAnalysis,
  SparepartRequirement,
  ProductRecommendation,
  ProviderMaterialLine,
  SparepartTimelineEvent,
  SparepartSourceType,
} from "@/types/domain";

export type WorkerTimelineStage =
  | "TERIMA"
  | "BERANGKAT"
  | "TIBA"
  | "DIAGNOSA"
  | "DIAGNOSA_HASIL"
  | "SEDANG_DIKERJAKAN"
  | "SELESAI";

export type PostDiagnosisBranch =
  | "NO_ADJUSTMENT"
  | "NO_PRICE_ADJUSTMENT"
  | "PRICE_ADJUSTMENT_CUSTOMER"
  | "PRICE_ADJUSTMENT_CUSTOMER_APPROVAL"
  | "PRICE_ADJUSTMENT_PROVIDER"
  | "PRICE_ADJUSTMENT_PROVIDER_AUTH"
  | "PROVIDER_OWNED_SPAREPART"
  | "PARTNER_MERCHANT_DIRECT"
  | "PARTNER_STORE_DIRECT"
  | "PARTNER_MERCHANT_RECOMMENDATION"
  | "PARTNER_RECOMMENDATION"
  | "PARTNER_APPROVED_WAITING_SHIPMENT"
  | "PARTNER_RECOMMENDATION_APPROVED"
  | "CUSTOMER_SELF_PURCHASE"
  | "CUSTOMER_ALREADY_OWNS"
  | "OPTIONAL_SPAREPART_REJECTED"
  | "OPTIONAL_PART_REJECTED"
  | "MANDATORY_SPAREPART_BLOCKED"
  | "MANDATORY_PART_BLOCKED"
  | "PAYMENT_FAILED_AFTER_APPROVAL"
  | "ALTERNATIVE_PRODUCT_USED";

export interface AdditionalWorkItem {
  id: string;
  title: string;
  price: number;
  isApproved?: boolean;
}

export interface WorkerJobDiagnosis {
  problemFound: string;
  assetModel?: string;
  assetDetails?: string;
  findingsSummary?: string;
  technicalFindings: string;
  workerNotes?: string;
  recommendedAction?: string;
  requiresSparepart?: boolean;
  sparepartSource?: SparepartSourceType | "NONE";
  diagnosedAt?: string;
  diagnosedBy?: string;
  originalScope?: string;
  diagnosisScope?: string;
  additionalWork?: AdditionalWorkItem[];
  customerPresence?: "PRESENT" | "ABSENT";
  attachments?: {
    type: "photo" | "measurement" | "checklist";
    title: string;
    value?: string;
  }[];
}

export interface WorkerJobPricing {
  baseServiceFee?: number;
  originalPrice?: number;
  additionalServiceFee?: number;
  additionalWorkFee?: number;
  additionalWorkItems?: AdditionalWorkItem[];
  sparepartFee?: number;
  shippingFee?: number;
  platformFee?: number;
  totalAmount: number;
  originalPaidAmount?: number;
  additionalPaymentRequired?: number;
  adjustmentReason?: string;
  notes?: string;
  providerAuthStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED" | "PENDING_AUTH" | "AUTHORIZED";
  customerApprovalStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  paymentStatus?: "NOT_REQUIRED" | "PENDING" | "PAID" | "FAILED" | "ADDITIONAL_REQUIRED" | "PAYMENT_FAILED";
  paymentState?: "NOT_REQUIRED" | "PENDING" | "PAID" | "FAILED" | "ADDITIONAL_REQUIRED" | "PAYMENT_FAILED";
  isExecutionEligible?: boolean;
  statusMessage?: string;
}

export interface WorkerJobSparepart {
  status?: string;
  partName?: string;
  materialName?: string;
  source?: SparepartSourceType | "NONE" | string;
  unitPrice?: number;
  price?: number;
  quantity?: number;
  availability?: string;
  isMandatory?: boolean;
  etaMinutes?: number;
  rejectionImpact?: string;
  notes?: string;
  merchantName?: string;
  procurementStatus?:
    | "NONE"
    | "AVAILABLE"
    | "WAITING_APPROVAL"
    | "WAITING_SHIPMENT"
    | "IN_TRANSIT"
    | "WAITING_CUSTOMER_PART"
    | "RECEIVED"
    | "USED"
    | "UNAVAILABLE";
  productOrderId?: string;
  shipmentId?: string;
  courier?: string;
  awbNumber?: string;
  eta?: string;
  statusMessage?: string;
}

export interface WorkerJobTracking {
  currentLocation?: string;
  destination?: string;
  tripStatus?: string;
  arrivalTime?: string;
  etaMinutes?: number;
  distanceKm?: number;
  driverName?: string;
  vehicleNumber?: string;
}

export interface WorkerJobNextAction {
  label: string;
  type?: string;
  targetTab?: string;
  targetSection?: string;
  disabled?: boolean;
  isExecutionBlocked?: boolean;
  disabledReason?: string;
  buttonVariant?: "primary" | "secondary" | "success" | "warning" | "danger";
}

export interface WorkerJob {
  id: string;
  orderId: string;
  workerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  address?: string;
  serviceTitle: string;
  issueDescription: string;
  scheduledTime: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  distanceKm: number;
  status: "ASSIGNED" | "DISPATCHED" | "ARRIVED" | "IN_PROGRESS" | "PROOF_SUBMITTED" | "COMPLETED" | "BLOCKED";
  timelineStage?: WorkerTimelineStage;
  branchType?: PostDiagnosisBranch;
  postDiagnosisBranch?: PostDiagnosisBranch;
  isReadyConfirmed?: boolean;
  blockedReason?: string;
  priceAdjustmentApproved?: boolean;
  customerApprovedPrice?: number;
  customerRejectionReason?: string;
  isScopeBlocked?: boolean;
  sparepartDelivered?: boolean;
  sparepartStatus?: string;
  materialUsed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  reportedIssue?: {
    reason: string;
    note: string;
    reportedAt: string;
  };
  customerNotes?: string;
  providerNotes?: string;
  aiPreparationContext?: BookingAIAnalysis;
  unitPhotoUrl?: string;
  feeWorker: number;
  sopSteps: {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    requiresPhoto?: boolean;
    photoUrl?: string;
  }[];
  usedMaterials?: {
    id: string;
    name: string;
    quantity: number;
    serialOld?: string;
    barcodeNew?: string;
    status: "USED" | "RETURNED_TO_SHOP";
    source?: SparepartSourceType;
    usedAt?: string;
    notes?: string;
  }[];
  sparepartRequirements?: SparepartRequirement[];
  productRecommendations?: ProductRecommendation[];
  providerMaterials?: ProviderMaterialLine[];
  sparepartTimeline?: SparepartTimelineEvent[];
  fallbackOutcome?: JobFallbackOutcome;
  diagnosis?: WorkerJobDiagnosis;
  pricing?: WorkerJobPricing;
  sparepart?: WorkerJobSparepart;
  sparepartSummary?: WorkerJobSparepart;
  tracking?: WorkerJobTracking;
  nextAction?: WorkerJobNextAction;
  urgencyBadge?: {
    label: string;
    variant: "warning" | "danger" | "info" | "success" | "neutral";
  };
}

export interface JobFallbackOutcome {
  type:
    | "CUSTOMER_PURCHASED_ELSEWHERE"
    | "CUSTOMER_ALREADY_OWNS"
    | "CUSTOMER_DECLINED"
    | "ALTERNATIVE_PRODUCT_USED"
    | "WAITING_CUSTOMER"
    | "PARTNER_PRODUCT_UNAVAILABLE";
  notes?: string;
  alternativeProductTitle?: string;
  recordedAt: string;
}

export const WORKER_STATUS_CONFIG: Record<
  WorkerJob["status"],
  { label: string; badgeClass: string; actionLabel: string; stepperIndex: number }
> = {
  ASSIGNED: {
    label: "Tugas Baru",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    actionLabel: "Konfirmasi Siap",
    stepperIndex: 0,
  },
  DISPATCHED: {
    label: "Menuju Lokasi",
    badgeClass: "bg-sky-50 text-[#0F4C81] border-sky-200",
    actionLabel: "Tandai Sudah Tiba",
    stepperIndex: 2,
  },
  ARRIVED: {
    label: "Tiba di Lokasi",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    actionLabel: "Mulai Diagnosis",
    stepperIndex: 3,
  },
  IN_PROGRESS: {
    label: "Sedang Dikerjakan",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    actionLabel: "Lanjutkan Pengerjaan",
    stepperIndex: 4,
  },
  PROOF_SUBMITTED: {
    label: "Menunggu Konfirmasi",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    actionLabel: "Lihat Status Konfirmasi",
    stepperIndex: 6,
  },
  COMPLETED: {
    label: "Pekerjaan Selesai",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    actionLabel: "Lihat Detail Selesai",
    stepperIndex: 7,
  },
  BLOCKED: {
    label: "Kendala Lapangan",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    actionLabel: "Hubungi Bantuan / CS",
    stepperIndex: 4,
  },
};

export interface WorkerShipmentItem {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  unitModel: string;
  type: "PICKUP_FROM_CUSTOMER" | "DELIVERY_TO_CUSTOMER";
  scheduledTime: string;
  status: "SCHEDULED" | "IN_TRANSIT" | "ARRIVED" | "HANDED_OVER";
  notes?: string;
}

export const MOCK_WORKER_JOBS: WorkerJob[] = [
  // ============================================================================
  // SCENARIO 1: SRV-001 (STANDARD SERVICE - NO PRICE ADJUSTMENT)
  // ============================================================================
  {
    id: "job-srv-001",
    orderId: "SRV-001",
    customerName: "Sarah Annisa",
    customerPhone: "0812-9988-1122",
    customerAddress: "Jl. Gandaria Tengah IV No. 12, Kebayoran Baru, Jakarta Selatan",
    serviceTitle: "Cuci AC Split 1 PK (Standar)",
    issueDescription: "Hembusan angin agak hangat dan filter berdebu tebal.",
    scheduledTime: "Hari ini, 09:00 - 11:00 WIB",
    distanceKm: 2.1,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "NO_ADJUSTMENT",
    feeWorker: 65000,
    customerNotes: "Kamar utama lantai 2, harap gunakan alas kaki kerja.",
    providerNotes: "Prioritaskan pemeriksaan filter dan blower indoor. AI mengindikasikan kemungkinan masalah kapasitor, namun bawa kapasitor 35uF hanya jika tersedia fisik di tas kerja. Tetap lakukan diagnosis aktual di unit.",
    aiPreparationContext: {
      summary: "Pemeriksaan sistem pendingin & sirkulasi udara indoor.",
      possibleIssues: [
        "Filter evaporator kotor / tersumbat debu tebal",
        "Kapasitor fan melemah jika putaran pelan",
        "Penurunan tekanan refrigeran ringan",
      ],
      possibleSpareparts: [
        "Kapasitor 35uF (Memungkinkan diperlukan)",
        "Refrigerant R32 (Possible)",
      ],
      confidenceExplanation:
        "Rekomendasi berdasarkan keluhan pelanggan terkait hembusan agak hangat. Belum dikonfirmasi oleh diagnosis teknisi.",
      disclaimer:
        "Rekomendasi AI bukan diagnosis final. Teknisi tetap melakukan pemeriksaan di lokasi.",
      generatedAt: "2026-09-21 08:30 WIB",
    },
    diagnosis: {
      problemFound: "Filter debu tersumbat mikro partikel & sirip evaporator tertutup lendir ringan.",
      assetModel: "Daikin Inverter 1 PK (FTKQ25SVM4)",
      technicalFindings: "Unit normal, tekanan freon R32 stabil 140 PSI. Hanya membutuhkan pembersihan high-pressure steam.",
      recommendedAction: "Steam evaporator indoor, flushing drainase, & semprot disinfektan.",
      requiresSparepart: false,
      sparepartSource: "NONE",
    },
    pricing: {
      baseServiceFee: 75000,
      totalAmount: 75000,
      providerAuthStatus: "NOT_REQUIRED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Harga tetap sesuai pesanan awal. Siap langsung dikerjakan.",
    },
    nextAction: {
      label: "Mulai Pengerjaan",
      type: "START_WORK",
    },
    sopSteps: [
      { id: "sop-1", title: "Pemeriksaan Suhu & Ampere Awal", description: "Ukur suhu hembusan sebelum dicuci", isCompleted: true, requiresPhoto: true },
      { id: "sop-2", title: "Pembersihan High-Pressure Evaporator", description: "Steam indoor dan blower keong", isCompleted: false, requiresPhoto: true },
      { id: "sop-3", title: "Flushing Pembuangan Air", description: "Pastikan pembuangan lancar", isCompleted: false },
      { id: "sop-4", title: "Uji Running Suhu Akhir", description: "Pastikan suhu < 18°C", isCompleted: false, requiresPhoto: true },
    ],
  },

  // ============================================================================
  // SCENARIO 2: SRV-002 (PRICE ADJUSTMENT - CUSTOMER APPROVAL)
  // ============================================================================
  {
    id: "job-srv-002",
    orderId: "SRV-002",
    customerName: "Bpk. Bambang Wijaya",
    customerPhone: "0813-2233-4455",
    customerAddress: "Jl. Panglima Polim V No. 8, Kebayoran Baru, Jakarta Selatan",
    serviceTitle: "Perbaikan AC Split Berisik & Kurang Dingin",
    issueDescription: "Unit indoor bergetar hebat saat dihidupkan.",
    scheduledTime: "Hari ini, 10:30 - 12:30 WIB",
    distanceKm: 3.4,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA_HASIL",
    branchType: "PRICE_ADJUSTMENT_CUSTOMER",
    feeWorker: 120000,
    customerNotes: "Ada anjing kecil di teras, gerbang tidak dikunci.",
    providerNotes: "Keluhan getaran indoor dan hembusan kurang dingin. AI menyarankan cek bearing dan kapasitor. Pastikan cek fisik kondisi bracket dan blower.",
    aiPreparationContext: {
      summary: "Pemeriksaan motor fan indoor & dudukan getaran unit.",
      possibleIssues: [
        "Bushing / bearing motor fan aus",
        "Blower keong lepas keseimbangan / baling patah",
        "Kapasitor starting motor fan melemah",
      ],
      possibleSpareparts: [
        "Bushing Karet Motor Fan (Memungkinkan diperlukan)",
        "Kapasitor 1.5uF Fan (Possible)",
        "Motor Fan Indoor (Recommended for inspection)",
      ],
      confidenceExplanation:
        "Rekomendasi dianalisis dari keluhan getaran keras unit indoor. Belum diverifikasi teknisi lapangan.",
      disclaimer:
        "Rekomendasi AI bukan diagnosis final. Teknisi tetap melakukan pemeriksaan di lokasi.",
      generatedAt: "2026-09-21 09:15 WIB",
    },
    diagnosis: {
      problemFound: "Bushing bearing fan motor indoor aus dan oblak, baling-baling menyentuh cover.",
      assetModel: "Panasonic Eco Tough 1.5 PK",
      technicalFindings: "Membutuhkan pekerjaan tambahan balancing bearing & reparasi dudukan motor indoor.",
      recommendedAction: "Reparasi motor fan + balancing bearing & peredam getaran karet.",
      requiresSparepart: false,
    },
    pricing: {
      baseServiceFee: 400000,
      additionalServiceFee: 150000,
      totalAmount: 550000,
      adjustmentReason: "Pekerjaan tambahan perbaikan balancing & bearing fan motor indoor",
      providerAuthStatus: "NOT_REQUIRED",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "Menunggu persetujuan pelanggan untuk penyesuaian biaya pengerjaan.",
    },
    urgencyBadge: {
      label: "🟡 Menunggu Persetujuan Customer",
      variant: "warning",
    },
    nextAction: {
      label: "Lihat Pengajuan Biaya",
      type: "VIEW_COST",
    },
    sopSteps: [
      { id: "sop-201", title: "Diagnosis Bunyi & Getaran", description: "Bongkar cover dan identifikasi bearing", isCompleted: true },
      { id: "sop-202", title: "Reparasi Bearing & Fan Motor", description: "Ganti bushing bearing dinamo", isCompleted: false },
      { id: "sop-203", title: "Running Test Desibel Suara", description: "Pastikan operasi hening < 35dB", isCompleted: false, requiresPhoto: true },
    ],
  },

  // ============================================================================
  // SCENARIO 3: SRV-003 (PRICE ADJUSTMENT - PROVIDER AUTHORIZATION)
  // ============================================================================
  {
    id: "job-srv-003",
    orderId: "SRV-003",
    customerName: "Ibu Ratna Susanti",
    customerPhone: "0818-4455-6677",
    customerAddress: "Jl. Tebet Barat Dalam VII No. 14, Jakarta Selatan",
    serviceTitle: "Perbaikan Instalasi Elektrikal & Kompresor",
    issueDescription: "Listrik rumah langsung trip setiap kali AC dihidupkan.",
    scheduledTime: "Hari ini, 11:00 - 13:00 WIB",
    distanceKm: 4.8,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PRICE_ADJUSTMENT_PROVIDER",
    feeWorker: 135000,
    diagnosis: {
      problemFound: "Terminal power outdoor hangus meleleh & kabel utama korsleting ke rangka.",
      assetModel: "Daikin Multi-S 2 PK",
      technicalFindings: "Pekerjaan perbaikan elektrikal total, isolasi proteksi kompresor, dan penggantian terminal block.",
      recommendedAction: "Rekabeling heavy-duty outdoor + restorasi kabel terminal kompresor.",
      requiresSparepart: false,
    },
    pricing: {
      baseServiceFee: 350000,
      additionalServiceFee: 200000,
      totalAmount: 550000,
      adjustmentReason: "Rekabeling instalasi tegangan tinggi outdoor melebihi limit mandiri teknisi",
      providerAuthStatus: "PENDING",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "Pengajuan biaya sedang ditinjau Provider sebelum diteruskan ke pelanggan.",
    },
    urgencyBadge: {
      label: "🟠 Menunggu Otorisasi Provider",
      variant: "warning",
    },
    nextAction: {
      label: "Lihat Status Otorisasi",
      type: "VIEW_STATUS",
    },
    sopSteps: [
      { id: "sop-301", title: "Uji Megger & Resistansi Isolasi", description: "Ukur kebocoran arus ke bodi", isCompleted: true },
      { id: "sop-302", title: "Rekabeling Terminal Blok", description: "Pasang kabel tahan panas", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 4: SRV-004 (PROVIDER-OWNED SPAREPART)
  // ============================================================================
  {
    id: "job-srv-004",
    orderId: "SRV-004",
    customerName: "Hendra Kurniawan",
    customerPhone: "0811-9988-2233",
    customerAddress: "Jl. Duren Tiga Raya No. 45, Pancoran, Jakarta Selatan",
    serviceTitle: "Perbaikan Kompresor AC Gagal Start",
    issueDescription: "Outdoor mendengung 5 detik lalu mati, hembusan indoor tidak dingin.",
    scheduledTime: "Hari ini, 11:30 - 13:30 WIB",
    distanceKm: 3.2,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PROVIDER_OWNED_SPAREPART",
    feeWorker: 90000,
    diagnosis: {
      problemFound: "Kapasitor starting outdoor drop ke 11uF dari spek normal 35uF.",
      assetModel: "AC Daikin Standard 1 PK",
      technicalFindings: "Kapasitor lemah menyebabkan kompresor overampere dan overload cut-off. Part tersedia di stok bengkel induk.",
      recommendedAction: "Penggantian kapasitor 35uF menggunakan material resmi bengkel.",
      requiresSparepart: true,
      sparepartSource: "PROVIDER_OWNED",
      customerPresence: "PRESENT",
      attachments: [
        { type: "photo", title: "Foto Fisik Kapasitor Melembung", value: "Bodi atas cembung" },
        { type: "measurement", title: "Ukur Kapasitansi uF", value: "11.2 uF (Spek: 35 uF)" },
        { type: "checklist", title: "Checklist Kelayakan", value: "Aman ganti di tempat" },
      ],
    },
    sparepart: {
      partName: "Kapasitor Dual Running 35+1.5uF 450VAC",
      source: "PROVIDER_OWNED",
      unitPrice: 85000,
      quantity: 1,
      isMandatory: true,
      procurementStatus: "AVAILABLE",
      statusMessage: "Material bengkel tersedia di tas kerja teknisi.",
    },
    pricing: {
      baseServiceFee: 95000,
      sparepartFee: 85000,
      totalAmount: 180000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "Material siap dipasang setelah pelanggan mengonfirmasi penambahan suku cadang bengkel.",
    },
    nextAction: {
      label: "Tambahkan ke Order",
      type: "ADD_MATERIAL",
    },
    sopSteps: [
      { id: "sop-401", title: "Cek Kapasitansi uF Multitester", description: "Buktikan nilai drop ke pelanggan", isCompleted: true },
      { id: "sop-402", title: "Pemasangan Kapasitor Baru", description: "Pasang soket kapasitor bengkel", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 4B: SRV-004B (JOB E: PROVIDER-OWNED SPAREPART - CUSTOMER ABSENT)
  // ============================================================================
  {
    id: "job-srv-004b",
    orderId: "SRV-004B",
    customerName: "Bpk. Edwin Pratama",
    customerPhone: "0812-3344-7788",
    customerAddress: "Jl. Tebet Timur Dalam No. 12, Jakarta Selatan",
    serviceTitle: "Perbaikan Kompresor AC Lemah (Pelanggan Tidak di Lokasi)",
    issueDescription: "Unit outdoor mendengung dan tidak dingin. Klien sedang bertugas di kantor.",
    scheduledTime: "Hari ini, 12:00 - 14:00 WIB",
    distanceKm: 3.5,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PROVIDER_OWNED_SPAREPART",
    feeWorker: 90000,
    customerNotes: "Pelanggan sedang tidak berada di lokasi, konfirmasi via notifikasi aplikasi.",
    diagnosis: {
      problemFound: "Kapasitor starting outdoor melepuh dan drop ke 9.5uF.",
      assetModel: "AC Daikin Standard 1.5 PK",
      technicalFindings: "Kapasitor outdoor rusak. Bengkel menyiapkan stok kapasitor resmi di tas kerja. Klien tidak ada di lokasi sehingga persetujuan diajukan secara remote.",
      recommendedAction: "Kirim pengajuan biaya penambahan suku cadang bengkel ke aplikasi klien.",
      requiresSparepart: true,
      sparepartSource: "PROVIDER_OWNED",
      customerPresence: "ABSENT",
      attachments: [
        { type: "photo", title: "Foto Label Kapasitor", value: "Daikin OEM 35uF" },
        { type: "measurement", title: "Multimeter Digital", value: "9.5 uF (Batas min 33uF)" },
      ],
    },
    sparepart: {
      partName: "Kapasitor 35uF 450VAC Resmi Bengkel",
      source: "PROVIDER_OWNED",
      unitPrice: 85000,
      quantity: 1,
      isMandatory: true,
      procurementStatus: "AVAILABLE",
      statusMessage: "Material bengkel sedia. Menunggu persetujuan remote pelanggan.",
    },
    pricing: {
      baseServiceFee: 95000,
      sparepartFee: 85000,
      totalAmount: 180000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "Menunggu persetujuan remote pelanggan sebelum material dipasang.",
    },
    urgencyBadge: {
      label: "⏳ Menunggu Persetujuan Remote",
      variant: "warning",
    },
    nextAction: {
      label: "Kirim Persetujuan Biaya",
      type: "WAIT_APPROVAL",
    },
    sopSteps: [
      { id: "sop-4b-1", title: "Ukur Kapasitansi & Foto", description: "Lampirkan bukti pengukuran digital", isCompleted: true },
      { id: "sop-4b-2", title: "Pemasangan Pasca Approval", description: "Menunggu notifikasi klien disetujui", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 5: SRV-005 (PARTNER MERCHANT - DIRECT / DEAL DI TEMPAT)
  // ============================================================================
  {
    id: "job-srv-005",
    orderId: "SRV-005",
    customerName: "Dedi Prasetyo",
    customerPhone: "0812-7788-9900",
    customerAddress: "Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan",
    serviceTitle: "Perbaikan Elektrikal AC Inverter",
    issueDescription: "AC bau gosong dan kipas outdoor mati.",
    scheduledTime: "Hari ini, 13:00 - 15:00 WIB",
    distanceKm: 1.8,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PARTNER_MERCHANT_DIRECT",
    feeWorker: 95000,
    customerNotes: "Pelanggan hadir mendampingi di lokasi servis.",
    diagnosis: {
      problemFound: "Kapasitor dual outdoor melembung dan short circuit ke ground.",
      assetModel: "AC Sharp Plasmacluster 1 PK",
      technicalFindings: "Pelanggan hadir langsung. Diperlukan pengadaan suku cadang resmi dari Toko Mitra terdekat.",
      recommendedAction: "Pengadaan instan via Toko Mitra Sejuk Sentra Part AC dengan persetujuan pelanggan di tempat.",
      requiresSparepart: true,
      sparepartSource: "PARTNER_MERCHANT",
    },
    sparepart: {
      partName: "Capacitor Dual Run 35uF Toko Mitra",
      source: "PARTNER_MERCHANT",
      merchantName: "Sejuk Sentra Part AC",
      unitPrice: 145000,
      quantity: 1,
      isMandatory: true,
      procurementStatus: "AVAILABLE",
      statusMessage: "Tersedia di Toko Mitra Sejuk Sentra Part AC (1.2 km).",
    },
    pricing: {
      baseServiceFee: 95000,
      sparepartFee: 145000,
      shippingFee: 15000,
      platformFee: 5000,
      totalAmount: 260000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "Tampilkan lembar rincian pengadaan ke pelanggan yang hadir untuk konfirmasi langsung.",
    },
    nextAction: {
      label: "Tampilkan ke Customer",
      type: "SHOW_CUSTOMER",
    },
    sopSteps: [
      { id: "sop-501", title: "Cek Fisik Komponen Melembung", description: "Tunjukkan kondisi fisik kapasitor", isCompleted: true },
      { id: "sop-502", title: "Konfirmasi & Pasang Part Mitra", description: "Pemasangan komponen setelah kurir tiba", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 6: SRV-006 (PARTNER MERCHANT - RECOMMENDATION / CUSTOMER ABSENT)
  // ============================================================================
  {
    id: "job-srv-006",
    orderId: "SRV-006",
    customerName: "Maya Indah",
    customerPhone: "0857-1122-3344",
    customerAddress: "Jl. Kebayoran Lama Raya No. 20, Jakarta Selatan",
    serviceTitle: "Perbaikan AC Bocor Freon & Kapasitor",
    issueDescription: "Pendinginan tidak maksimal dan outdoor sering mati.",
    scheduledTime: "Hari ini, 13:30 - 15:30 WIB",
    distanceKm: 2.9,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PARTNER_MERCHANT_RECOMMENDATION",
    feeWorker: 95000,
    customerNotes: "Pelanggan sedang di kantor, unit didampingi asisten rumah tangga.",
    diagnosis: {
      problemFound: "Kapasitor kompresor drop drastis ke 18uF.",
      assetModel: "AC Daikin Inverter FTKQ 1 PK",
      technicalFindings: "Pelanggan tidak ada di rumah. Rekomendasi suku cadang telah disiapkan dan dikirim ke aplikasi klien.",
      recommendedAction: "Kirim rekomendasi pengadaan suku cadang mitra ke aplikasi pelanggan.",
      requiresSparepart: true,
      sparepartSource: "PARTNER_MERCHANT",
    },
    sparepart: {
      partName: "Capacitor Daikin Original 35uF",
      source: "PARTNER_MERCHANT",
      merchantName: "Sejuk Sentra Part AC",
      unitPrice: 145000,
      quantity: 1,
      isMandatory: true,
      procurementStatus: "WAITING_APPROVAL",
      statusMessage: "Rekomendasi terkirim ke aplikasi pelanggan. Menunggu persetujuan remote.",
    },
    pricing: {
      baseServiceFee: 95000,
      sparepartFee: 145000,
      totalAmount: 240000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "CUSTOMER_PENDING: Menunggu pelanggan membuka notifikasi dan menyetujui pesanan part.",
    },
    urgencyBadge: {
      label: "⏳ Menunggu Keputusan Pelanggan",
      variant: "warning",
    },
    nextAction: {
      label: "Lihat Rekomendasi",
      type: "VIEW_RECOMMENDATION",
    },
    sopSteps: [
      { id: "sop-601", title: "Pengujian Kapasitansi & Foto", description: "Dokumentasikan angka multitester", isCompleted: true },
      { id: "sop-602", title: "Menunggu Persetujuan Part", description: "Pekerjaan ditunda sampai disetujui", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 7: SRV-007 (PARTNER RECOMMENDATION - APPROVED & SHIPMENT IN TRANSIT)
  // ============================================================================
  {
    id: "job-srv-007",
    orderId: "SRV-007",
    customerName: "Anton Gunawan",
    customerPhone: "0812-3344-5566",
    customerAddress: "Jl. Cilandak Barat No. 18, Jakarta Selatan",
    serviceTitle: "Penggantian Thermistor & Modul Fan AC",
    issueDescription: "Lampu timer AC berkedip 7 kali dan unit indoor mati proteksi.",
    scheduledTime: "Hari ini, 14:00 - 16:00 WIB",
    distanceKm: 4.1,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PARTNER_APPROVED_WAITING_SHIPMENT",
    feeWorker: 110000,
    diagnosis: {
      problemFound: "Thermistor sensor suhu pipa evaporator putus total (open circuit).",
      assetModel: "AC Gree Inverter 1.5 PK",
      technicalFindings: "Pelanggan telah menyetujui rekomendasi toko mitra. Pesanan PO-007 telah terbit dan kurir sedang menuju lokasi.",
      recommendedAction: "Menunggu kurir tiba di lokasi servis sebelum melakukan penggantian.",
      requiresSparepart: true,
      sparepartSource: "PARTNER_MERCHANT",
    },
    sparepart: {
      partName: "Thermistor Sensor Suhu Gree Inverter Asli",
      source: "PARTNER_MERCHANT",
      merchantName: "Sejuk Sentra Part AC",
      unitPrice: 110000,
      quantity: 1,
      isMandatory: true,
      procurementStatus: "IN_TRANSIT",
      productOrderId: "PO-007",
      shipmentId: "SHP-007",
      courier: "GoSend Instant Service",
      awbNumber: "GS-SPARE-771920",
      eta: "15–25 Menit lagi",
      statusMessage: "Kurir GoSend sedang dalam perjalanan membawa suku cadang dari Sejuk Sentra Part AC.",
    },
    pricing: {
      baseServiceFee: 95000,
      sparepartFee: 110000,
      shippingFee: 15000,
      platformFee: 5000,
      totalAmount: 225000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: false,
      statusMessage: "Pekerjaan tertahan sementara: Menunggu fisik suku cadang tiba di lokasi.",
    },
    urgencyBadge: {
      label: "🚚 Kurir Dalam Perjalanan (15-25 Menit)",
      variant: "info",
    },
    nextAction: {
      label: "Lihat Pengiriman",
      type: "VIEW_SHIPMENT",
    },
    sopSteps: [
      { id: "sop-701", title: "Bongkar Modul PCB Indoor", description: "Siapkan soket thermistor", isCompleted: true },
      { id: "sop-702", title: "Penerimaan Part dari Kurir", description: "Verifikasi nomor resi & segel", isCompleted: false },
      { id: "sop-703", title: "Pemasangan & Kalibrasi Suhu", description: "Pasang thermistor baru dan ukur ohm", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 8: SRV-008 (CUSTOMER SELF-PURCHASE)
  // ============================================================================
  {
    id: "job-srv-008",
    orderId: "SRV-008",
    customerName: "Bpk. Fajar Ramadhan",
    customerPhone: "0813-8899-0011",
    customerAddress: "Jl. Raya Pasar Minggu No. 55, Jakarta Selatan",
    serviceTitle: "Penggantian Kompresor AC Daikin (Beli Mandiri)",
    issueDescription: "Kompresor AC macet total, pelanggan beli sparepart sendiri.",
    scheduledTime: "Hari ini, 14:30 - 17:00 WIB",
    distanceKm: 5.2,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "CUSTOMER_SELF_PURCHASE",
    feeWorker: 180000,
    diagnosis: {
      problemFound: "Kompresor mengalami stuck rotor mekanikal.",
      assetModel: "Daikin R32 1 PK (FTV25CXV)",
      technicalFindings: "Pelanggan menolak pengadaan dari toko mitra dan memilih membeli unit kompresor sendiri di toko langganannya.",
      recommendedAction: "Menunggu penyerahan kompresor fisik dari pelanggan untuk diperiksa spesifikasinya.",
      requiresSparepart: true,
      sparepartSource: "CUSTOMER_SELF_PURCHASE",
    },
    sparepart: {
      partName: "Kompresor Daikin 1 PK R32 (Beli Mandiri)",
      source: "CUSTOMER_SELF_PURCHASE",
      procurementStatus: "WAITING_CUSTOMER_PART",
      statusMessage: "Menunggu sparepart yang dibeli Customer.",
    },
    pricing: {
      baseServiceFee: 250000,
      totalAmount: 250000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: false,
      statusMessage: "Jasa pasang telah disetujui. Pemasangan menunggu fisik barang diserahkan pelanggan.",
    },
    urgencyBadge: {
      label: "📦 Menunggu Part dari Klien",
      variant: "warning",
    },
    nextAction: {
      label: "Catat Material Diterima",
      type: "RECORD_RECEIVED",
    },
    sopSteps: [
      { id: "sop-801", title: "Pengecekan Kompresor Rusak", description: "Buktikan kompresor macet total", isCompleted: true },
      { id: "sop-802", title: "Verifikasi Kompresor Pelanggan", description: "Cek spek voltase dan oli kompresor", isCompleted: false },
      { id: "sop-803", title: "Pengelasan & Flushing Freon", description: "Las sambungan dan uji kebocoran", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 9: SRV-009 (CUSTOMER ALREADY OWNS PART)
  // ============================================================================
  {
    id: "job-srv-009",
    orderId: "SRV-009",
    customerName: "Ibu Linda Marlina",
    customerPhone: "0812-6677-8899",
    customerAddress: "Jl. Kemang Timur No. 32, Jakarta Selatan",
    serviceTitle: "Pemasangan Modul PCB AC Bawaan Sendiri",
    issueDescription: "Modul indoor rusak kena petir, pelanggan sudah punya modul cadangan.",
    scheduledTime: "Hari ini, 15:00 - 17:00 WIB",
    distanceKm: 3.6,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "CUSTOMER_ALREADY_OWNS",
    feeWorker: 110000,
    diagnosis: {
      problemFound: "IC mikrokontroler PCB indoor terbakar lonjakan voltase.",
      assetModel: "AC LG Dual Inverter 1.5 PK",
      technicalFindings: "Pelanggan sudah memiliki suku cadang modul PCB asli yang dibeli sebelumnya dan tersimpan di rumah.",
      recommendedAction: "Validasi kompatibilitas modul bawaan pelanggan dan catat pemakaian material.",
      requiresSparepart: true,
      sparepartSource: "CUSTOMER_SELF_PURCHASE",
    },
    sparepart: {
      partName: "Modul PCB Indoor LG Dual Inverter (Milik Pelanggan)",
      source: "CUSTOMER_SELF_PURCHASE",
      procurementStatus: "RECEIVED",
      statusMessage: "Suku cadang sudah berada di lokasi. Validasi fisik dan catat di lembar kerja.",
    },
    pricing: {
      baseServiceFee: 175000,
      totalAmount: 175000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Tidak ada tagihan sparepart (milik sendiri). Siap validasi dan pasang.",
    },
    nextAction: {
      label: "Validasi & Catat Pemakaian",
      type: "VALIDATE_USAGE",
    },
    sopSteps: [
      { id: "sop-901", title: "Validasi Pin & Soket Modul", description: "Pastikan kode part LG identik", isCompleted: true },
      { id: "sop-902", title: "Pemasangan & Running Test", description: "Uji swing, fan, dan sensor suhu", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 10: SRV-010 (OPTIONAL SPAREPART REJECTED - SERVICE CONTINUES)
  // ============================================================================
  {
    id: "job-srv-010",
    orderId: "SRV-010",
    customerName: "Rudi Hartono",
    customerPhone: "0815-4433-2211",
    customerAddress: "Jl. Jagakarsa Raya No. 101, Jakarta Selatan",
    serviceTitle: "Servis Rutin & Pembersihan Filter AC Cassette",
    issueDescription: "Cuci rutin dan cek bau udara hembusan.",
    scheduledTime: "Hari ini, 15:30 - 17:30 WIB",
    distanceKm: 6.0,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "OPTIONAL_SPAREPART_REJECTED",
    feeWorker: 90000,
    diagnosis: {
      problemFound: "Filter karbon deodorizing sudah jenuh dan rapuh (opsional diganti).",
      assetModel: "AC Daikin Cassette 2 PK",
      technicalFindings: "Teknisi menyarankan filter deodorizing baru, namun pelanggan menolak dan memilih mencuci filter kawat utama saja.",
      recommendedAction: "Lanjutkan pembersihan standar tanpa penggantian filter karbon.",
      requiresSparepart: false,
    },
    sparepart: {
      partName: "Filter Karbon Deodorizing AC Cassette (Opsional)",
      source: "PARTNER_MERCHANT",
      procurementStatus: "UNAVAILABLE",
      statusMessage: "Klien menolak penggantian komponen opsional ini.",
    },
    pricing: {
      baseServiceFee: 120000,
      totalAmount: 120000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Servis dapat dilanjutkan tanpa penggantian komponen ini.",
    },
    nextAction: {
      label: "Lanjutkan Pengerjaan",
      type: "CONTINUE_WORK",
    },
    sopSteps: [
      { id: "sop-1001", title: "Pembersihan Evaporator & Talang", description: "Cuci steam unit cassette", isCompleted: true },
      { id: "sop-1002", title: "Pemasangan Kembali Filter Lama", description: "Bersihkan filter nilon dan keringkan", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 11: SRV-011 (MANDATORY SPAREPART BLOCKED / SERVIS TERTAHAN)
  // ============================================================================
  {
    id: "job-srv-011",
    orderId: "SRV-011",
    customerName: "Kevin Pratama",
    customerPhone: "0819-0011-2233",
    customerAddress: "Jl. Mampang Prapatan IV No. 29, Jakarta Selatan",
    serviceTitle: "Perbaikan Kipas Blower Outdoor Patah",
    issueDescription: "Outdoor AC bergetar keras dan baling-baling patah membentur grill.",
    scheduledTime: "Hari ini, 16:00 - 18:00 WIB",
    distanceKm: 2.7,
    status: "BLOCKED",
    timelineStage: "DIAGNOSA",
    branchType: "MANDATORY_SPAREPART_BLOCKED",
    feeWorker: 100000,
    blockedReason: "Komponen wajib belum tersedia di toko mitra.",
    diagnosis: {
      problemFound: "Baling-baling kipas outdoor patah 2 bilah. Unit tidak boleh dijalankan.",
      assetModel: "AC Sharp Jetstream 1 PK",
      technicalFindings: "Komponen wajib baling-baling balancernya hancur. Toko rekanan kehabisan stok spesifikasi ini.",
      recommendedAction: "Servis tertahan sementara sampai pengadaan part khusus ditemukan.",
      requiresSparepart: true,
      sparepartSource: "PARTNER_MERCHANT",
    },
    sparepart: {
      partName: "Baling-baling Kipas Outdoor Sharp 3-Blade (Wajib)",
      source: "PARTNER_MERCHANT",
      isMandatory: true,
      procurementStatus: "UNAVAILABLE",
      statusMessage: "Komponen wajib belum tersedia di seluruh toko mitra terdekat.",
    },
    pricing: {
      baseServiceFee: 150000,
      totalAmount: 150000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "SERVIS TERTAHAN: Komponen wajib belum tersedia.",
    },
    urgencyBadge: {
      label: "⚠ SERVIS TERTAHAN (Part Wajib Kosong)",
      variant: "danger",
    },
    nextAction: {
      label: "Lihat Pengadaan",
      type: "VIEW_PROCUREMENT",
    },
    sopSteps: [
      { id: "sop-1101", title: "Dokumentasi Baling Patah", description: "Foto kondisi bilah baling patah", isCompleted: true },
      { id: "sop-1102", title: "Menunggu Pengadaan Part Wajib", description: "Pengerjaan ditunda demi keamanan motor", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 12: SRV-012 (PAYMENT FAILED AFTER APPROVAL)
  // ============================================================================
  {
    id: "job-srv-012",
    orderId: "SRV-012",
    customerName: "Denny Setiawan",
    customerPhone: "0812-9900-1122",
    customerAddress: "Jl. Pejaten Barat No. 8, Pasar Minggu, Jakarta Selatan",
    serviceTitle: "Perbaikan Pipa Refrigerant Bocor & Flaring",
    issueDescription: "Pipa tembaga outdoor retak dan oli kompresor rembes.",
    scheduledTime: "Hari ini, 16:30 - 18:30 WIB",
    distanceKm: 4.4,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PAYMENT_FAILED_AFTER_APPROVAL",
    feeWorker: 125000,
    diagnosis: {
      problemFound: "Nepel sambungan flaring outdoor retak rambut, freon habis total.",
      assetModel: "AC Daikin Inverter 1 PK",
      technicalFindings: "Perlu potong pipa, flaring baru, flushing nitrogen, vacuum, dan isi freon R32 full. Pelanggan telah menyetujui biaya.",
      recommendedAction: "Pengerjaan fisik las & isi freon menunggu konfirmasi pembayaran berhasil.",
      requiresSparepart: false,
    },
    pricing: {
      baseServiceFee: 120000,
      additionalServiceFee: 300000,
      totalAmount: 420000,
      adjustmentReason: "Flaring ulang + vacuum + pengisian freon R32 full 0.8 kg",
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "FAILED",
      isExecutionEligible: false,
      statusMessage: "Pembayaran tambahan belum berhasil. Menunggu pelanggan menyelesaikan pembayaran.",
    },
    urgencyBadge: {
      label: "❌ Pembayaran Tambahan Gagal",
      variant: "danger",
    },
    nextAction: {
      label: "Lihat Status Pembayaran",
      type: "VIEW_PAYMENT",
    },
    sopSteps: [
      { id: "sop-1201", title: "Pemeriksaan Kebocoran Gelembung", description: "Buktikan titik bocor nepel pipa", isCompleted: true },
      { id: "sop-1202", title: "Menunggu Pelunasan Tambahan", description: "Pekerjaan fisik ditahan sebelum pembayaran sah", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 18: SRV-018 (JOB N: ALTERNATIVE PRODUCT USED)
  // ============================================================================
  {
    id: "job-srv-018",
    orderId: "SRV-018",
    customerName: "Bpk. Tri Wibowo",
    customerPhone: "0812-3344-9988",
    customerAddress: "Jl. Tebet Barat Dalam IV No. 22, Jakarta Selatan",
    serviceTitle: "Penggantian Kapasitor Outdoor (Produk Alternatif Kompatibel)",
    issueDescription: "Kapasitor kompresor rusak, part orisinil pabrikan lama diskontinu.",
    scheduledTime: "Hari ini, 17:00 - 18:30 WIB",
    distanceKm: 3.1,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "ALTERNATIVE_PRODUCT_USED",
    feeWorker: 95000,
    customerNotes: "Pelanggan hadir mendampingi di lokasi servis.",
    diagnosis: {
      problemFound: "Kapasitor starting outdoor 35uF orisinil merek lama diskontinu.",
      assetModel: "AC National CS-C90KE 1 PK (Model Lama)",
      technicalFindings: "Part orisinil sudah tidak diproduksi. Teknisi merekomendasikan produk alternatif kompatibel Panasonic Matsushita 35+1.5uF 450VAC dengan toleransi spesifikasi sama.",
      recommendedAction: "Gunakan produk alternatif kompatibel yang telah disetujui pelanggan.",
      requiresSparepart: true,
      sparepartSource: "PARTNER_MERCHANT",
      customerPresence: "PRESENT",
      attachments: [
        { type: "photo", title: "Komparasi Dimensi Part", value: "Panjang & diameter identik" },
        { type: "measurement", title: "Uji Kapasitansi Alternatif", value: "35.1 uF (Presisi)" },
      ],
    },
    fallbackOutcome: {
      type: "ALTERNATIVE_PRODUCT_USED",
      alternativeProductTitle: "Kapasitor Matsushita 35+1.5uF 450VAC (Alternatif Kompatibel)",
      notes: "Part orisinil diskontinu; diganti produk alternatif dengan persetujuan pelanggan di tempat.",
      recordedAt: "17:15 WIB",
    },
    sparepart: {
      partName: "Kapasitor Matsushita 35+1.5uF (Alternatif Kompatibel)",
      source: "PARTNER_MERCHANT",
      merchantName: "Sejuk Sentra Part AC",
      unitPrice: 135000,
      quantity: 1,
      isMandatory: true,
      procurementStatus: "AVAILABLE",
      statusMessage: "Komponen alternatif kompatibel disetujui pelanggan. Sedia di kurir instan.",
    },
    pricing: {
      baseServiceFee: 95000,
      sparepartFee: 135000,
      shippingFee: 15000,
      totalAmount: 245000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Penggunaan part alternatif kompatibel telah disetujui pelanggan. Siap dipasang.",
    },
    urgencyBadge: {
      label: "✓ Part Alternatif Disetujui",
      variant: "success",
    },
    nextAction: {
      label: "Pasang Part Alternatif",
      type: "START_WORK",
    },
    sopSteps: [
      { id: "sop-1801", title: "Validasi Kompatibilitas Alternatif", description: "Bandingkan diagram kelistrikan", isCompleted: true },
      { id: "sop-1802", title: "Pemasangan Komponen Alternatif", description: "Pasang soket dan grounding", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 13: SRV-013 (STAGE: TERIMA - JOB ASSIGNED / RECEIVED)
  // ============================================================================
  {
    id: "job-srv-013",
    orderId: "SRV-013",
    customerName: "Ibu Siska Melati",
    customerPhone: "0817-6655-4433",
    customerAddress: "Jl. Fatmawati Raya No. 10, Cilandak, Jakarta Selatan",
    serviceTitle: "Cuci AC Split 2 Unit (0.5 - 1 PK)",
    issueDescription: "Pencucian rutin berkala, mohon bawa selang steam panjang.",
    scheduledTime: "Hari ini, 13:00 - 15:00 WIB",
    distanceKm: 2.5,
    status: "ASSIGNED",
    timelineStage: "TERIMA",
    feeWorker: 120000,
    customerNotes: "Rumah cat krem, parkir motor aman di halaman dalam.",
    pricing: {
      baseServiceFee: 150000,
      totalAmount: 150000,
      providerAuthStatus: "NOT_REQUIRED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Pekerjaan baru diterima. Konfirmasi terima tugas dan bersiap berangkat.",
    },
    nextAction: {
      label: "Terima Pekerjaan",
      type: "START_TRIP",
    },
    sopSteps: [
      { id: "sop-1301", title: "Konfirmasi Penerimaan", description: "Teknisi menerima tugas dari bengkel", isCompleted: false },
      { id: "sop-1302", title: "Pemeriksaan Alat & Perlengkapan APD", description: "Pastikan steam dan terpal siap", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 14: SRV-014 (STAGE: BERANGKAT - TRAVELING)
  // ============================================================================
  {
    id: "job-srv-014",
    orderId: "SRV-014",
    customerName: "Bpk. Agus Priyono",
    customerPhone: "0813-1122-8877",
    customerAddress: "Jl. RS Fatmawati No. 75, Cilandak, Jakarta Selatan",
    serviceTitle: "Pengecekan AC Tidak Bisa Dimatikan Remote",
    issueDescription: "Unit indoor terus menyala, sensor remote tidak merespons.",
    scheduledTime: "Hari ini, 11:30 - 13:00 WIB",
    distanceKm: 3.2,
    status: "DISPATCHED",
    timelineStage: "BERANGKAT",
    feeWorker: 85000,
    tracking: {
      currentLocation: "Jl. TB Simatupang (Depan Cilandak Town Square)",
      etaMinutes: 12,
      distanceKm: 1.8,
      driverName: "Budi Santoso",
      vehicleNumber: "B 3891 SGZ",
    },
    pricing: {
      baseServiceFee: 95000,
      totalAmount: 95000,
      providerAuthStatus: "NOT_REQUIRED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Teknisi sedang dalam perjalanan menuju alamat pelanggan.",
    },
    urgencyBadge: {
      label: "🏍 Sedang Menuju Lokasi (ETA 12 Menit)",
      variant: "info",
    },
    nextAction: {
      label: "Saya Tiba",
      type: "MARK_ARRIVED",
    },
    sopSteps: [
      { id: "sop-1401", title: "Perjalanan Menuju Lokasi", description: "Navigasi rute GPS aktif", isCompleted: true },
      { id: "sop-1402", title: "Temu Ramah & Izin Pengerjaan", description: "Sapa pelanggan dan izin mulai", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 15: SRV-015 (STAGE: TIBA - ARRIVED AT LOCATION)
  // ============================================================================
  {
    id: "job-srv-015",
    orderId: "SRV-015",
    customerName: "Ibu Nadia Pramita",
    customerPhone: "0856-9900-1122",
    customerAddress: "Jl. Cipete Raya No. 15, Jakarta Selatan",
    serviceTitle: "Servis AC Bau Gosong saat Running",
    issueDescription: "Hembusan angin berbau sangit dan ada suara gemeretak halus.",
    scheduledTime: "Hari ini, 10:00 - 12:00 WIB",
    distanceKm: 1.5,
    status: "ARRIVED",
    timelineStage: "TIBA",
    feeWorker: 95000,
    pricing: {
      baseServiceFee: 95000,
      totalAmount: 95000,
      providerAuthStatus: "NOT_REQUIRED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Teknisi telah tiba di alamat pelanggan. Siap memulai inspeksi diagnosis.",
    },
    nextAction: {
      label: "Mulai Diagnosis",
      type: "START_DIAGNOSIS",
    },
    sopSteps: [
      { id: "sop-1501", title: "Check-in Lokasi Pelanggan", description: "Konfirmasi kedatangan tepat waktu", isCompleted: true },
      { id: "sop-1502", title: "Inspeksi Visual & Bau Gosong", description: "Buka cover dan cek jalur kabel", isCompleted: false },
    ],
  },

  // ============================================================================
  // SCENARIO 16: SRV-016 / job-101 (STAGE: SEDANG DIKERJAKAN - IN PROGRESS)
  // ============================================================================
  {
    id: "job-101",
    orderId: "order-normal-progress",
    customerName: "Sarah Annisa (Pengerjaan)",
    customerPhone: "0812-9988-1122",
    customerAddress: "Jl. Gandaria Tengah IV No. 12, Kebayoran Baru, Jakarta Selatan",
    serviceTitle: "Cuci & Perawatan AC Split (0.5 - 2 PK) - 2 Unit",
    issueDescription: "AC kamar utama hembusan angin terasa agak hangat dan berbau apek saat pertama kali dihidupkan.",
    scheduledTime: "Hari ini, 10:00 - 12:00 WIB",
    distanceKm: 2.4,
    status: "IN_PROGRESS",
    timelineStage: "SEDANG_DIKERJAKAN",
    customerNotes: "Rumah pagar putih, bel pintu di sebelah kiri garasi. Ada tangga lipat jika diperlukan.",
    unitPhotoUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
    feeWorker: 95000,
    diagnosis: {
      problemFound: "Filter kotor tersumbat debu mikro & sirip kondensor outdoor berdebu tebal.",
      assetModel: "Daikin Inverter 1 PK (Model FTKQ25SVM4)",
      technicalFindings: "Tekanan freon R32 stabil 140 PSI (normal). Pekerjaan berjalan lancar tanpa part rusak.",
      recommendedAction: "Pembersihan high-pressure indoor & outdoor.",
      requiresSparepart: false,
    },
    pricing: {
      baseServiceFee: 150000,
      totalAmount: 140000,
      providerAuthStatus: "NOT_REQUIRED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Pengerjaan checklist SOP sedang berlangsung aktif di lapangan.",
    },
    sopSteps: [
      { id: "sop-1", title: "Pemeriksaan Awal & Suhu Awal", description: "Uji fungsi remote dan ukur suhu hembusan sebelum dibongkar", isCompleted: true, requiresPhoto: true },
      { id: "sop-2", title: "Pembersihan Filter & Evaporator", description: "Semprot steam bertekanan dan cairan pembersih non-korosif", isCompleted: true, requiresPhoto: true },
      { id: "sop-3", title: "Flushing Saluran Drainase", description: "Pastikan pembuangan air lancar dan tidak ada lendir/lumut tersisa", isCompleted: false, requiresPhoto: false },
      { id: "sop-4", title: "Pengujian Suhu Akhir & Ampere", description: "Catat ampere kompresor dan suhu hembusan dingin (< 18°C)", isCompleted: false, requiresPhoto: true },
    ],
    usedMaterials: [
      { id: "mat-1", name: "Cairan Chemical Foam AC 500ml", quantity: 1, status: "USED", source: "PROVIDER_OWNED" },
      { id: "mat-2", name: "Plastik Talang Cuci AC (Alat)", quantity: 1, status: "RETURNED_TO_SHOP", source: "PROVIDER_OWNED" },
    ],
    nextAction: {
      label: "Upload Proof",
      type: "UPLOAD_PROOF",
    },
  },

  // ============================================================================
  // SCENARIO 17: SRV-017 / job-103 (STAGE: SELESAI - COMPLETED & PROOF SUBMITTED)
  // ============================================================================
  {
    id: "job-103",
    orderId: "order-awaiting-proof",
    customerName: "Ibu Maya Angelina",
    customerPhone: "0856-7788-9900",
    customerAddress: "Apartemen Kalibata City Tower Kemuning Lt. 8",
    serviceTitle: "Pembersihan Rutin AC Split 1 PK (Selesai)",
    issueDescription: "Cuci rutin 3 bulanan, unit indoor sedikit berisik getaran cover.",
    scheduledTime: "Hari ini, 08:00 - 09:30 WIB",
    distanceKm: 3.8,
    status: "COMPLETED",
    timelineStage: "SELESAI",
    feeWorker: 75000,
    diagnosis: {
      problemFound: "Filter debu kotor & bracket indoor renggang.",
      assetModel: "AC Daikin Flash Inverter 1 PK",
      technicalFindings: "Unit telah dibersihkan tuntas, bracket dikencangkan, suhu hembusan dingin 16.5°C.",
      recommendedAction: "Servis selesai tuntas.",
      requiresSparepart: false,
    },
    pricing: {
      baseServiceFee: 75000,
      totalAmount: 75000,
      providerAuthStatus: "NOT_REQUIRED",
      customerApprovalStatus: "APPROVED",
      paymentStatus: "PAID",
      isExecutionEligible: true,
      statusMessage: "Pekerjaan telah selesai. Berita acara dan bukti foto telah terbit.",
    },
    sopSteps: [
      { id: "sop-20", title: "Pembersihan Filter & Cover", description: "Pencucian indoor unit menyeluruh", isCompleted: true, requiresPhoto: true },
      { id: "sop-21", title: "Uji Hembusan & Getaran", description: "Kencangkan baut bracket indoor", isCompleted: true, requiresPhoto: true },
    ],
    nextAction: {
      label: "Lihat Detail Selesai",
      type: "VIEW_COMPLETED",
    },
  },

  // Retain job-102 alias for backward compatibility
  {
    id: "job-102",
    orderId: "order-pending-tebet",
    customerName: "Bpk. Rahmat Santoso",
    customerPhone: "0813-1122-3344",
    customerAddress: "Jl. Tebet Barat V No. 18, Jakarta Selatan",
    serviceTitle: "Perbaikan Kompresor & Cek Kebocoran Freon",
    issueDescription: "Outdoor mati total, MCB trip saat AC dinyalakan.",
    scheduledTime: "Hari ini, 14:00 - 16:00 WIB",
    distanceKm: 5.1,
    status: "ARRIVED",
    timelineStage: "DIAGNOSA",
    branchType: "PROVIDER_OWNED_SPAREPART",
    feeWorker: 125000,
    diagnosis: {
      problemFound: "Kapasitor starting kompresor rusak drop ke 14uF.",
      assetModel: "AC Daikin Standard 1 PK",
      technicalFindings: "Kapasitor kompresor rusak, perlu penggantian 35uF.",
      recommendedAction: "Ganti kapasitor baru.",
      requiresSparepart: true,
      sparepartSource: "PROVIDER_OWNED",
    },
    pricing: {
      baseServiceFee: 125000,
      sparepartFee: 85000,
      totalAmount: 210000,
      providerAuthStatus: "APPROVED",
      customerApprovalStatus: "PENDING",
      paymentStatus: "PENDING",
      isExecutionEligible: false,
      statusMessage: "Menunggu persetujuan pelanggan untuk penambahan part.",
    },
    sopSteps: [
      { id: "sop-10", title: "Pemeriksaan Arus Listrik", description: "Cek tegangan masuk terminal kompresor", isCompleted: true },
      { id: "sop-11", title: "Pengujian Kapasitor", description: "Ukur kapasitas mikrofarad kapasitor", isCompleted: true },
    ],
  },
];

export const MOCK_SHIPMENTS: WorkerShipmentItem[] = [
  {
    id: "shp-101",
    orderId: "ord-ws-801",
    customerName: "Diana Maharani",
    customerPhone: "0812-4455-6677",
    customerAddress: "Jl. Panglima Polim IX No. 4, Kebayoran Baru",
    unitModel: "Indoor Unit AC Daikin Urusara 7 (Reparasi PCB Modul)",
    type: "PICKUP_FROM_CUSTOMER",
    scheduledTime: "Hari ini, 16:00 - 17:00 WIB",
    status: "SCHEDULED",
    notes: "Bawa bubble wrap tebal dan kardus pengaman khusus dari bengkel.",
  },
  {
    id: "shp-102",
    orderId: "ord-ws-802",
    customerName: "PT Sentosa Mandiri",
    customerPhone: "0821-3344-5566",
    customerAddress: "Ruko Gandaria Niaga Blok B-12",
    unitModel: "Kompresor AC Cassette 3 PK (Selesai Gulung Dinamo)",
    type: "DELIVERY_TO_CUSTOMER",
    scheduledTime: "Besok, 09:30 - 11:00 WIB",
    status: "SCHEDULED",
    notes: "Minta tanda tangan penanggung jawab teknisi kantor di tanda terima.",
  },
];

export const INITIAL_WORKER_JOBS = MOCK_WORKER_JOBS;
export const INITIAL_SHIPMENTS = MOCK_SHIPMENTS;
