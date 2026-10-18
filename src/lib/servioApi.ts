/**
 * SERVIO STANDALONE FRONTEND API & DOMAIN MOCK PROVIDER
 * Pure Frontend Architecture - Completely free of backend & external database dependencies.
 * Powered by persistent in-memory mocks and Central Domain Repository.
 */

import { MOCK_SERVICES } from "@/mocks/services";
import { MOCK_PRODUCTS } from "@/mocks/products";
import { MOCK_ORDERS } from "@/mocks/orders";
import { MOCK_WORKERS } from "@/mocks/workers";
import { MOCK_WARRANTIES } from "@/mocks/warranties";
import { domainRepository } from "@/lib/repository/domainRepository";

export interface ApiResponse<T = unknown> {
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  matchedMerchants?: import("@/types/domain").ApiShopProfile[];
  shopProfile?: import("@/types/domain").ApiShopProfile;
  recommendations?: import("@/types/domain").ApiProduct[];
  count?: number;
  success?: boolean;
  code?: string;
}

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export const MOCK_BRANDS: import("@/types/domain").ApiBrand[] = [
  {
    id: "brand-daikin",
    name: "Daikin Genuine",
    slug: "daikin-genuine",
    logo_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=120&auto=format&fit=crop&q=80",
    logoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=120&auto=format&fit=crop&q=80",
    description: "Suku cadang pendingin udara dan kompresor resmi pabrikan Daikin Industries.",
    status: "ACTIVE",
    product_count: 2,
    productCount: 2,
    created_at: "2026-01-10T08:00:00Z",
    createdAt: "2026-01-10T08:00:00Z",
  },
  {
    id: "brand-panasonic",
    name: "Panasonic",
    slug: "panasonic",
    logo_url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=120&auto=format&fit=crop&q=80",
    logoUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=120&auto=format&fit=crop&q=80",
    description: "Komponen elektronik, filter udara, dan sparepart AC inverter.",
    status: "ACTIVE",
    product_count: 1,
    productCount: 1,
    created_at: "2026-01-15T09:30:00Z",
    createdAt: "2026-01-15T09:30:00Z",
  },
  {
    id: "brand-inaba",
    name: "Inaba Denko",
    slug: "inaba-denko",
    logo_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&auto=format&fit=crop&q=80",
    logoUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&auto=format&fit=crop&q=80",
    description: "Pipa tembaga dan insulasi pendingin berkualitas tinggi standar Jepang.",
    status: "ACTIVE",
    product_count: 1,
    productCount: 1,
    created_at: "2026-01-20T10:00:00Z",
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "brand-motul",
    name: "Motul",
    slug: "motul",
    logo_url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=120&auto=format&fit=crop&q=80",
    logoUrl: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=120&auto=format&fit=crop&q=80",
    description: "Pelumas mesin sintetis dan cairan fluida performa tinggi otomotif.",
    status: "ACTIVE",
    product_count: 1,
    productCount: 1,
    created_at: "2026-02-01T11:00:00Z",
    createdAt: "2026-02-01T11:00:00Z",
  },
  {
    id: "brand-brembo",
    name: "Brembo",
    slug: "brembo",
    logo_url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=120&auto=format&fit=crop&q=80",
    logoUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=120&auto=format&fit=crop&q=80",
    description: "Sistem pengereman performa tinggi, cakram, dan brake pad keramik.",
    status: "ACTIVE",
    product_count: 1,
    productCount: 1,
    created_at: "2026-02-10T14:15:00Z",
    createdAt: "2026-02-10T14:15:00Z",
  },
  {
    id: "brand-bosch",
    name: "Bosch",
    slug: "bosch",
    logo_url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=120&auto=format&fit=crop&q=80",
    logoUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=120&auto=format&fit=crop&q=80",
    description: "Perkakas listrik profesional, sensor, dan suku cadang otomotif terkemuka.",
    status: "ACTIVE",
    product_count: 0,
    productCount: 0,
    created_at: "2026-02-15T15:00:00Z",
    createdAt: "2026-02-15T15:00:00Z",
  },
];

function setCookie(name: string, value: string, maxAge = 604800) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

// ============================================================================
// STANDALONE CANONICAL USER PROFILES FOR ALL 9 ROLES
// ============================================================================
const MOCK_USERS_BY_ROLE: Record<string, any> = {
  CEO_PRODUCT_OWNER: {
    id: "8a7fdac8-cfcb-430e-b142-e630b171879b",
    fullName: "Michael Surya",
    email: "ceo@servio.id",
    phone: "+62 811-9988-771",
    role: "CEO_PRODUCT_OWNER",
    status: "ACTIVE",
    employeeId: "CEO-001",
    department: "Executive Office",
    permissions: ["*"],
    readiness: "READY",
    isOperationalReady: true,
    staffOnboardingStatus: "COMPLETED",
    activeRole: {
      assignmentId: "22545111-1c5d-479e-b896-86c54039ff80",
      code: "CEO_PRODUCT_OWNER",
      scopeType: "PLATFORM",
    },
    roles: [
      { assignmentId: "22545111-1c5d-479e-b896-86c54039ff80", code: "CEO_PRODUCT_OWNER", name: "Chief Executive Officer", scopeType: "PLATFORM", status: "ACTIVE" },
      { assignmentId: "4bc23467-ad37-483f-84fc-e382001b2009", code: "ADMIN_OPERATIONS", name: "Admin Operations", scopeType: "PLATFORM", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  ADMIN_OPERATIONS: {
    id: "8480d446-5855-4cb1-9488-01879e2da2cf",
    fullName: "Siti Rahmawati",
    email: "admin@servio.id",
    phone: "+62 812-1122-334",
    role: "ADMIN_OPERATIONS",
    status: "ACTIVE",
    employeeId: "ADM-001",
    department: "Operations & Verification",
    permissions: ["*"],
    readiness: "READY",
    isOperationalReady: true,
    staffOnboardingStatus: "COMPLETED",
    activeRole: {
      assignmentId: "4bc23467-ad37-483f-84fc-e382001b2009",
      code: "ADMIN_OPERATIONS",
      scopeType: "PLATFORM",
    },
    roles: [
      { assignmentId: "4bc23467-ad37-483f-84fc-e382001b2009", code: "ADMIN_OPERATIONS", name: "Admin Operations", scopeType: "PLATFORM", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  CUSTOMER: {
    id: "3bc92b94-627d-48c4-9e01-187ce79981ee",
    fullName: "Ahmad Fauzi",
    email: "customer@servio.id",
    phone: "+62 812-3456-7890",
    role: "CUSTOMER",
    status: "ACTIVE",
    permissions: [
      "service.booking.create", "service.order.view", "order.create", "cart.manage",
      "payment.create", "warranty.claim", "review.create", "chat.send"
    ],
    activeRole: {
      assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986",
      code: "CUSTOMER",
      scopeType: "OWN",
    },
    roles: [
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    nik: "3174051208880001",
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  SERVICE_PROVIDER: {
    id: "8ecc27f5-d30e-401e-89d5-aceec765a19a",
    fullName: "Budi Santoso",
    email: "provider@servio.id",
    phone: "+62 813-2233-445",
    role: "SERVICE_PROVIDER",
    status: "ACTIVE",
    organizationId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    organizationName: "PT Servio Mandiri Teknik",
    providerId: "prov-bintang-teknik",
    businessProfile: {
      businessData: {
        legalName: "PT Servio Mandiri Teknik",
        brandName: "Bintang Teknik Mandiri",
        businessType: "SERVICE_PROVIDER",
        status: "VERIFIED",
        registrationNumber: "REG-2026-0001",
      },
    },
    permissions: ["*"],
    activeRole: {
      assignmentId: "212af925-d100-45ba-a5e4-7df0c120b820",
      code: "SERVICE_PROVIDER",
      scopeType: "ORGANIZATION",
      scopeId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    },
    roles: [
      { assignmentId: "212af925-d100-45ba-a5e4-7df0c120b820", code: "SERVICE_PROVIDER", name: "Workshop Owner", scopeType: "ORGANIZATION", scopeId: "0740d857-b665-4191-aaf5-d7dd3611dc1d", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  MERCHANT: {
    id: "9b91e456-594e-4d0b-b793-f69dd855ccc3",
    fullName: "Ko Hendra",
    email: "merchant@servio.id",
    phone: "+62 817-4455-667",
    role: "MERCHANT",
    status: "ACTIVE",
    organizationId: "2290a88d-7a24-4677-b940-5823cdd68c1d",
    organizationName: "Sinar AC & Sparepart Glodok",
    merchantId: "merch-sentra-teknik",
    businessProfile: {
      businessData: {
        legalName: "CV Sinar Sentra Abadi",
        brandName: "Sentra Teknik Sparepart",
        businessType: "MERCHANT",
        status: "VERIFIED",
        registrationNumber: "REG-2026-0002",
      },
    },
    permissions: ["*"],
    activeRole: {
      assignmentId: "1029143e-1d76-4fab-b86e-bb1709a47b2b",
      code: "MERCHANT",
      scopeType: "ORGANIZATION",
      scopeId: "2290a88d-7a24-4677-b940-5823cdd68c1d",
    },
    roles: [
      { assignmentId: "1029143e-1d76-4fab-b86e-bb1709a47b2b", code: "MERCHANT", name: "Merchant Retailer", scopeType: "ORGANIZATION", scopeId: "2290a88d-7a24-4677-b940-5823cdd68c1d", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  SUPPLIER: {
    id: "bfd84265-cd10-4b32-9ec2-a858039f3e83",
    fullName: "Suryanto Wijaya",
    email: "supplier@servio.id",
    phone: "+62 818-5566-778",
    role: "SUPPLIER",
    status: "ACTIVE",
    organizationId: "4a5e9ad0-b06e-4434-ad8c-e87e755472bd",
    organizationName: "PT Nusantara Parts Prima",
    supplierId: "sup-001",
    businessProfile: {
      businessData: {
        legalName: "PT Nusantara Parts Prima",
        brandName: "Nusantara Parts Distributor",
        businessType: "SUPPLIER",
        status: "VERIFIED",
        registrationNumber: "REG-2026-0003",
      },
    },
    permissions: ["*"],
    activeRole: {
      assignmentId: "6dd06d71-ec3c-4f03-bf3b-6d718aaa1d7a",
      code: "SUPPLIER",
      scopeType: "ORGANIZATION",
      scopeId: "4a5e9ad0-b06e-4434-ad8c-e87e755472bd",
    },
    roles: [
      { assignmentId: "6dd06d71-ec3c-4f03-bf3b-6d718aaa1d7a", code: "SUPPLIER", name: "Principal Supplier", scopeType: "ORGANIZATION", scopeId: "4a5e9ad0-b06e-4434-ad8c-e87e755472bd", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  WORKER_TECHNICIAN: {
    id: "00d4c5e5-f912-451f-afe5-54f34d481e0f",
    fullName: "Bambang Sudirman",
    email: "worker@servio.id",
    phone: "+62 819-6677-889",
    role: "WORKER_TECHNICIAN",
    status: "ACTIVE",
    employeeId: "WRK-001",
    organizationId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    organizationName: "PT Servio Mandiri Teknik",
    providerId: "prov-bintang-teknik",
    workerProfile: {
      providerId: "prov-bintang-teknik",
      providerName: "PT Servio Mandiri Teknik",
      specialization: "AC & HVAC Specialist",
      status: "ACTIVE",
    },
    permissions: ["*"],
    activeRole: {
      assignmentId: "0bf0d288-6a87-4b1d-b19c-b5b3391f9600",
      code: "WORKER_TECHNICIAN",
      scopeType: "ASSIGNED",
    },
    roles: [
      { assignmentId: "0bf0d288-6a87-4b1d-b19c-b5b3391f9600", code: "WORKER_TECHNICIAN", name: "Senior Technician", scopeType: "ASSIGNED", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  CUSTOMER_SUPPORT: {
    id: "8a7fdac8-cfcb-430e-b142-e630b171879b",
    fullName: "Rina Oktaviani",
    email: "support@servio.id",
    phone: "+62 812-7788-990",
    role: "CUSTOMER_SUPPORT",
    status: "ACTIVE",
    employeeId: "CS-001",
    department: "Customer Care & Mediation",
    permissions: ["*"],
    readiness: "READY",
    isOperationalReady: true,
    staffOnboardingStatus: "COMPLETED",
    activeRole: {
      assignmentId: "40e1699c-63d9-4673-99cf-9c46db8e9ecf",
      code: "CUSTOMER_SUPPORT",
      scopeType: "PLATFORM",
    },
    roles: [
      { assignmentId: "40e1699c-63d9-4673-99cf-9c46db8e9ecf", code: "CUSTOMER_SUPPORT", name: "Mediation Officer", scopeType: "PLATFORM", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  FINANCE_PAYMENT_OPS: {
    id: "6c56abab-fb6c-4735-9d58-cd1b0ed10617",
    fullName: "Hendrik Wijaya",
    email: "finance@servio.id",
    phone: "+62 813-8899-001",
    role: "FINANCE_PAYMENT_OPS",
    status: "ACTIVE",
    employeeId: "FIN-001",
    department: "Finance & Escrow",
    permissions: ["*"],
    readiness: "READY",
    isOperationalReady: true,
    staffOnboardingStatus: "COMPLETED",
    activeRole: {
      assignmentId: "75e55bf3-02f4-45a3-be63-f1e56e31ae73",
      code: "FINANCE_PAYMENT_OPS",
      scopeType: "PLATFORM",
    },
    roles: [
      { assignmentId: "75e55bf3-02f4-45a3-be63-f1e56e31ae73", code: "FINANCE_PAYMENT_OPS", name: "Finance Specialist", scopeType: "PLATFORM", status: "ACTIVE" },
      { assignmentId: "031772ea-9657-49bd-82f2-f57c65b0d986", code: "CUSTOMER", name: "Customer", scopeType: "OWN", status: "ACTIVE" },
    ],
    avatar: "/brand/logo.png",
    profile: { avatar: "/brand/logo.png" },
    personalProfile: { avatar: "/brand/logo.png" },
    emailVerified: true,
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
};

function resolveUserByEmail(email: string) {
  const norm = (email || "").toLowerCase().trim();
  if (norm.includes("ceo")) return MOCK_USERS_BY_ROLE.CEO_PRODUCT_OWNER;
  if (norm.includes("admin")) return MOCK_USERS_BY_ROLE.ADMIN_OPERATIONS;
  if (norm.includes("provider")) return MOCK_USERS_BY_ROLE.SERVICE_PROVIDER;
  if (norm.includes("merchant")) return MOCK_USERS_BY_ROLE.MERCHANT;
  if (norm.includes("supplier")) return MOCK_USERS_BY_ROLE.SUPPLIER;
  if (norm.includes("worker")) return MOCK_USERS_BY_ROLE.WORKER_TECHNICIAN;
  if (norm.includes("support")) return MOCK_USERS_BY_ROLE.CUSTOMER_SUPPORT;
  if (norm.includes("finance")) return MOCK_USERS_BY_ROLE.FINANCE_PAYMENT_OPS;
  return MOCK_USERS_BY_ROLE.CUSTOMER;
}

const MOCK_SHOPS: import("@/types/domain").ApiShopProfile[] = [
  {
    id: "merch-sentra-teknik",
    name: "Sentra Teknik Sparepart",
    organizationCode: "CV Sinar Sentra Abadi",
    status: "VERIFIED",
    city: "Jakarta Barat",
    rating: 4.9,
    reviewCount: 204,
    productCount: 18,
    verified: true,
    warrantyOffer: "Garansi Toko Resmi 6 Bulan",
    description: "Pusat penyedia komponen dan suku cadang pendingin terlengkap Glodok.",
  },
  {
    id: "merch-jaya-motor",
    name: "Jaya Pendingin Glodok",
    organizationCode: "UD Jaya Pendingin",
    status: "VERIFIED",
    city: "Jakarta Barat",
    rating: 4.8,
    reviewCount: 92,
    productCount: 12,
    verified: true,
    warrantyOffer: "Garansi Toko 3 Bulan",
    description: "Distributor aneka kapasitor, dinamo fan, dan aksesoris kelistrikan AC.",
  },
];

const MOCK_PRODUCT_CATEGORIES = [
  { _id: "cat-ac-parts", categoryId: "cat-ac-parts", name: "Sparepart AC & Pendingin", description: "Kompresor, filter, pipa, freon", isActive: true },
  { _id: "cat-tools", categoryId: "cat-tools", name: "Peralatan & Perkakas Servis", description: "Tang, pompa steam, manifold gauge", isActive: true },
  { _id: "cat-elec", categoryId: "cat-elec", name: "Komponen Elektrik & Sensor", description: "Kapasitor, PCB, relay, kabel", isActive: true },
  { _id: "cat-fluid", categoryId: "cat-fluid", name: "Refrigerant & Bahan Kimia", description: "Gas freon R32, R410A, cleaner coil", isActive: true },
];

const MOCK_ADDRESSES = [
  {
    id: "addr-01",
    title: "Rumah Utama",
    recipientName: "Ahmad Fauzi",
    phoneNumber: "0812-3456-7890",
    fullAddress: "Jl. Sudirman No. 45, Kebayoran Baru, Jakarta Selatan",
    city: "Jakarta Selatan",
    district: "Kebayoran Baru",
    postalCode: "12190",
    isPrimary: true,
  },
  {
    id: "addr-02",
    title: "Kantor",
    recipientName: "Ahmad Fauzi",
    phoneNumber: "0812-3456-7890",
    fullAddress: "Gedung BEI Tower 2 Lt. 14, SCBD, Jakarta Selatan",
    city: "Jakarta Selatan",
    district: "Kebayoran Baru",
    postalCode: "12190",
    isPrimary: false,
  },
];

const INITIAL_ONBOARDING_TASKS = [
  {
    id: "task-01",
    code: "ACCOUNT_ACCEPTANCE",
    title: "Persetujuan Pembuatan Akun & Kode Etik",
    description: "Membaca dan menyetujui kode etik kerja internal dan kebijakan kerahasiaan platform SERVIO.",
    required: true,
    status: "COMPLETED" as const,
    completedAt: "2026-01-02T10:00:00Z",
  },
  {
    id: "task-02",
    code: "PROFILE_COMPLETION",
    title: "Kelengkapan Profil & Data Pribadi",
    description: "Melengkapi nama tampilan, avatar, bio, jenis kelamin, dan tanggal lahir staf.",
    required: true,
    status: "COMPLETED" as const,
    completedAt: "2026-01-02T10:30:00Z",
  },
  {
    id: "task-03",
    code: "EMPLOYMENT_CONFIRMATION",
    title: "Konfirmasi Penempatan & Jabatan Kerja",
    description: "Memverifikasi surat penugasan kerja, departemen, dan manajer operasional.",
    required: true,
    status: "COMPLETED" as const,
    completedAt: "2026-01-02T11:00:00Z",
  },
  {
    id: "task-04",
    code: "REQUIRED_VERIFICATION",
    title: "Verifikasi Identitas Resmi (E-KTP) & Kontak Darurat",
    description: "Mengunggah kartu tanda penduduk dan informasi kontak darurat keluarga.",
    required: true,
    status: "COMPLETED" as const,
    completedAt: "2026-01-02T11:30:00Z",
  },
  {
    id: "task-05",
    code: "POLICY_ACKNOWLEDGEMENT",
    title: "Penandatanganan Pakta Integritas & Kebijakan Data",
    description: "Menyetujui SOP perlindungan data pribadi dan anti-fraud operasional.",
    required: true,
    status: "COMPLETED" as const,
    completedAt: "2026-01-02T12:00:00Z",
  },
  {
    id: "task-06",
    code: "ACCESS_CONFIRMATION",
    title: "Konfirmasi Hak Akses Operasional & Perangkat Kerja",
    description: "Menyetujui pembagian token akses sistem dan perangkat kerja operasional.",
    required: true,
    status: "COMPLETED" as const,
    completedAt: "2026-01-02T12:30:00Z",
  },
];

const mockOnboardingState: any = {
  id: "onb-me-01",
  userId: "usr-adm-01",
  employmentId: "emp-adm-01",
  status: "COMPLETED",
  progress: 100,
  startedAt: "2026-01-02T09:00:00Z",
  completedAt: "2026-01-02T12:30:00Z",
  tasks: [...INITIAL_ONBOARDING_TASKS],
  employment: {
    id: "emp-adm-01",
    employeeId: "ADM-001",
    department: "Operations & Verification",
    position: "Senior Operations Specialist",
    employmentType: "FULL_TIME",
    startDate: "2026-01-01",
    status: "ACTIVE",
  },
  profile: {
    id: "prof-adm-01",
    displayName: "Siti Rahmawati",
    bio: "Staf Operasional SERVIO - Penanganan Layanan & Verifikasi.",
    avatar: "/brand/logo.png",
    gender: "FEMALE",
    dateOfBirth: "1995-08-17",
  },
  user: {
    id: "usr-adm-01",
    fullName: "Siti Rahmawati",
    email: "admin@servio.id",
    nik: "3171012304980005",
    ktpFilePath: "/brand/logo.png",
    emergencyContact: {
      name: "Budi Santoso",
      phone: "+62 812-9988-7766",
    },
  },
  readiness: {
    ready: true,
    status: "READY",
    reason: "Seluruh persyaratan akun, keanggotaan, peran, pekerjaan, dan onboarding telah terpenuhi.",
    checks: {
      accountActive: true,
      membershipActive: true,
      roleAssignmentValid: true,
      employmentActive: true,
      onboardingCompleted: true,
    },
  },
};

const MOCK_INTERNAL_ACCOUNTS: any[] = [
  {
    id: "usr-adm-01",
    fullName: "Siti Rahmawati",
    email: "admin@servio.id",
    phone: "+62 812-1122-334",
    employeeId: "ADM-001",
    role: { code: "ADMIN_OPERATIONS", name: "Admin Operations" },
    department: "Operations & Verification",
    position: "Senior Operations Specialist",
    employmentType: "FULL_TIME",
    startDate: "2026-01-01",
    accountStatus: "ACTIVE",
    employmentStatus: "ACTIVE",
    onboardingStatus: "COMPLETED",
    readiness: "READY",
    readinessReason: "Seluruh berkas dan tugas onboarding telah lengkap.",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "usr-fin-01",
    fullName: "Hendrik Wijaya",
    email: "finance@servio.id",
    phone: "+62 813-8899-001",
    employeeId: "FIN-001",
    role: { code: "FINANCE_PAYMENT_OPS", name: "Finance & Escrow" },
    department: "Finance & Escrow",
    position: "Finance Operations Lead",
    employmentType: "FULL_TIME",
    startDate: "2026-01-01",
    accountStatus: "ACTIVE",
    employmentStatus: "ACTIVE",
    onboardingStatus: "COMPLETED",
    readiness: "READY",
    readinessReason: "Kesiapan operasional aktif.",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "usr-cs-01",
    fullName: "Rina Oktaviani",
    email: "support@servio.id",
    phone: "+62 812-7788-990",
    employeeId: "CS-001",
    role: { code: "CUSTOMER_SUPPORT", name: "Customer Support" },
    department: "Customer Care & Mediation",
    position: "Customer Care Specialist",
    employmentType: "FULL_TIME",
    startDate: "2026-01-01",
    accountStatus: "ACTIVE",
    employmentStatus: "ACTIVE",
    onboardingStatus: "COMPLETED",
    readiness: "READY",
    readinessReason: "Kesiapan operasional aktif.",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const MOCK_SUPPLIER_PRODUCTS: any[] = [
  {
    supplierProductId: "sp-01",
    supplierOrganizationId: "org-supplier-01",
    productId: "prod-01",
    variantId: "var-prod-01",
    supplierProductCode: "SUP-DAIKIN-1PK",
    supplierProductName: "Kompresor AC Daikin 1 PK R32 Asli",
    supplierDescription: "Kompresor rotary resmi Daikin untuk unit pendingin residential 1 PK.",
    status: "ACTIVE",
    product: {
      productId: "prod-01",
      name: "Kompresor Daikin 1 PK Original",
      description: "Kompresor AC Daikin asli dengan efisiensi tinggi",
      minPrice: 1350000,
      maxPrice: 1350000,
      priceDisplay: "Rp 1.350.000",
      priceRangeFormatted: "Rp 1.350.000",
      totalStock: 15,
      variantCount: 1,
      variants: [
        {
          variantId: "var-prod-01",
          sku: "DKN-CMP-1PK",
          variantName: "1 PK Standar",
          price: 1350000,
          stock: 15,
          status: "PUBLISHED",
        },
      ],
      media: [{ url: "/brand/logo.png" }],
      status: "PUBLISHED",
    },
    variant: {
      variantId: "var-prod-01",
      sku: "DKN-CMP-1PK",
      variantName: "1 PK Standar",
      price: 1350000,
      stock: 15,
      status: "PUBLISHED",
    },
    createdAt: "2026-01-05T00:00:00Z",
  },
  {
    supplierProductId: "sp-02",
    supplierOrganizationId: "org-supplier-01",
    productId: "prod-02",
    variantId: "var-prod-02",
    supplierProductCode: "SUP-FREON-R32-3KG",
    supplierProductName: "Refrigerant Freon R32 Tabung 3 Kg Murni",
    supplierDescription: "Gas pendingin freon ramah lingkungan bersertifikasi SNI.",
    status: "ACTIVE",
    product: {
      productId: "prod-02",
      name: "Freon R32 Tabung 3 Kg Kemasan Asli",
      description: "Freon R32 murni kemasan kaleng 3kg",
      minPrice: 285000,
      maxPrice: 285000,
      priceDisplay: "Rp 285.000",
      priceRangeFormatted: "Rp 285.000",
      totalStock: 50,
      variantCount: 1,
      variants: [
        {
          variantId: "var-prod-02",
          sku: "FRN-R32-3KG",
          variantName: "Tabung 3kg",
          price: 285000,
          stock: 50,
          status: "PUBLISHED",
        },
      ],
      media: [{ url: "/brand/logo.png" }],
      status: "PUBLISHED",
    },
    variant: {
      variantId: "var-prod-02",
      sku: "FRN-R32-3KG",
      variantName: "Tabung 3kg",
      price: 285000,
      stock: 50,
      status: "PUBLISHED",
    },
    createdAt: "2026-01-06T00:00:00Z",
  },
  {
    supplierProductId: "sp-03",
    supplierOrganizationId: "org-supplier-01",
    productId: "prod-03",
    variantId: "var-prod-03",
    supplierProductCode: "SUP-CAP-35UF-450V",
    supplierProductName: "Kapasitor AC 35 uF 450V Aluminium Heavy Duty",
    supplierDescription: "Kapasitor starting motor kompresor anti-ledak standar industri.",
    status: "ACTIVE",
    product: {
      productId: "prod-03",
      name: "Kapasitor AC 35 uF 450V",
      description: "Kapasitor berkualitas tinggi tahan panas hingga 85C",
      minPrice: 65000,
      maxPrice: 65000,
      priceDisplay: "Rp 65.000",
      priceRangeFormatted: "Rp 65.000",
      totalStock: 100,
      variantCount: 1,
      variants: [
        {
          variantId: "var-prod-03",
          sku: "CAP-35UF",
          variantName: "35 uF",
          price: 65000,
          stock: 100,
          status: "PUBLISHED",
        },
      ],
      media: [{ url: "/brand/logo.png" }],
      status: "PUBLISHED",
    },
    variant: {
      variantId: "var-prod-03",
      sku: "CAP-35UF",
      variantName: "35 uF",
      price: 65000,
      stock: 100,
      status: "PUBLISHED",
    },
    createdAt: "2026-01-07T00:00:00Z",
  },
];

function mapServiceToCatalog(s: any): any {
  return {
    id: s.id,
    name: s.title,
    title: s.title,
    description: s.fullDescription || s.shortDescription || "",
    shortDescription: s.shortDescription || "",
    providerId: s.providerId,
    providerName: s.providerName,
    isVerifiedProvider: s.isVerifiedProvider ?? true,
    categoryId: s.domainId || "repair",
    categoryName: (s.domainId || "repair").toUpperCase(),
    categoryCode: (s.domainId || "repair").toUpperCase(),
    subcategoryId: s.subcategoryId || "general",
    subcategoryName: (s.subcategoryId || "Umum").replace("-", " "),
    subcategoryCode: (s.subcategoryId || "general").toUpperCase(),
    priceMin: s.basePrice || 50000,
    priceMax: s.basePrice || 100000,
    basePrice: s.basePrice || 50000,
    pricingModel: s.pricingModel || "ESTIMATED_RANGE",
    surveyFee: 0,
    serviceMethods: ["HOME_SERVICE"],
    serviceModes: s.serviceModes || ["HOME_SERVICE"],
    status: "ACTIVE",
    warrantyConfig: {
      warrantyEnabled: true,
      durationDays: s.warrantyDays || 30,
    },
    warrantyDays: s.warrantyDays || 30,
    rating: s.rating || 4.9,
    reviewCount: s.reviewCount || 40,
    thumbnailUrl: "/brand/logo.png",
    createdAt: "2026-01-01T00:00:00Z",
  };
}

function mapProductToApi(p: any): any {
  return {
    productId: p.id,
    _id: p.id,
    merchantOrganizationId: p.merchantId || "merch-sentra-teknik",
    merchantName: p.merchantName || "Sentra Teknik Sparepart",
    categoryId: p.categoryId || "080142ee-0a66-434a-988e-8bc29a8f05fd",
    categoryName: p.categoryName || p.category || "Sparepart AC & Pendingin",
    subcategoryId: p.subcategoryId || "850cb3fa-56ba-42e5-9812-f9d5ae42dfb3",
    subcategoryName: p.subcategoryName || "Gas Refrigerant & Freon",
    name: p.title,
    brandName: p.brandName || p.compatibilityTags?.[0] || "Original",
    description: p.description || "",
    media: [{ url: `/products/${p.id}.jpg` }],
    status: "PUBLISHED",
    minPrice: p.price,
    maxPrice: p.price,
    priceDisplay: `Rp ${(p.price || 0).toLocaleString("id-ID")}`,
    priceRangeFormatted: `Rp ${(p.price || 0).toLocaleString("id-ID")}`,
    totalStock: p.stock || 20,
    variantCount: 1,
    variants: [
      {
        _id: `var-${p.id}`,
        variantId: `var-${p.id}`,
        productId: p.id,
        merchantOrganizationId: p.merchantId || "merch-sentra-teknik",
        sku: p.sku || `SKU-${p.id}`,
        variantName: "Standar",
        price: p.price,
        stock: p.stock || 20,
        status: "PUBLISHED",
      },
    ],
    warrantyPolicy: {
      durationMonths: p.warrantyMonths || 6,
      durationDays: (p.warrantyMonths || 6) * 30,
      type: "Toko & Distributor",
    },
    warrantyDays: (p.warrantyMonths || 6) * 30,
    merchant: {
      id: p.merchantId || "merch-sentra-teknik",
      name: p.merchantName || "Sentra Teknik Sparepart",
      brandName: p.merchantName || "Sentra Teknik Sparepart",
    },
    createdAt: "2026-01-01T00:00:00Z",
  };
}

const IDENTITY_SERVICE_ROOT =
  typeof window !== "undefined"
    ? ""
    : (process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL || "http://127.0.0.1:8001");
const IDENTITY_BASE_URL =
  typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_IDENTITY_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8001/api/v1");

const CATEGORY_SERVICE_ROOT =
  typeof window !== "undefined"
    ? ""
    : (process.env.NEXT_PUBLIC_CATEGORY_SERVICE_URL || "http://127.0.0.1:8002");
const CATEGORY_BASE_URL =
  typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_CATEGORY_API_URL || "http://127.0.0.1:8002/api/v1");

let csrfPromise: Promise<void> | null = null;

async function ensureSanctumCsrf(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  const existingXsrf = getCookie("XSRF-TOKEN");
  if (!force && existingXsrf) return;

  if (csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    try {
      await fetch(`${IDENTITY_SERVICE_ROOT}/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
      });
    } catch (e) {
      console.warn("Peringatan: Gagal memuat Sanctum CSRF cookie:", e);
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
}

function isCategoryRoute(path: string): boolean {
  const p = path.replace(/^\/api\/v1/, "");
  return (
    p.startsWith("/category-masters") ||
    p.startsWith("/categories") ||
    p.startsWith("/subcategories") ||
    p.startsWith("/category-requests") ||
    p.startsWith("/category-audit")
  );
}

function isIdentityRoute(path: string): boolean {
  const p = path.replace(/^\/api\/v1/, "");
  return (
    p.startsWith("/auth") ||
    p.startsWith("/otp") ||
    p.startsWith("/identity") ||
    p.startsWith("/customer/nik") ||
    p.startsWith("/business-registrations") ||
    p.startsWith("/registration-document-requirements") ||
    p.startsWith("/registration-applications") ||
    p.startsWith("/business/applications") ||
    p.startsWith("/ceo/identity") ||
    p.startsWith("/ceo/staff") ||
    p.startsWith("/admin/business") ||
    p.startsWith("/admin/profiles/change-requests") ||
    p.startsWith("/admin/users") ||
    p.startsWith("/internal/team") ||
    p.startsWith("/internal/accounts") ||
    p.startsWith("/staff/onboarding") ||
    p.startsWith("/provider/workers") ||
    p.startsWith("/provider/worker-invitations") ||
    p.startsWith("/invitations") ||
    p.startsWith("/organizations") ||
    p.startsWith("/profiles") ||
    p.startsWith("/me/profile") ||
    p.startsWith("/roles/me") ||
    p.startsWith("/permissions/me") ||
    p.startsWith("/audit/identity")
  );
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || "GET").toUpperCase();
  const rawPath = endpoint.replace(/^\/api\/v1/, "");
  const [pathname, queryString] = rawPath.split("?");
  const query = new URLSearchParams(queryString || "");

  // =========================================================================
  // REAL BACKEND INTEGRATION: Modul 01 Identity & Access Service
  // =========================================================================
  if (isIdentityRoute(pathname)) {
    try {
      // Map compatibility aliases
      let resolvedEndpoint = endpoint;
      if (pathname.includes("/password/forgot")) {
        resolvedEndpoint = "/auth/forgot-password";
      } else if (pathname === "/customer/nik") {
        resolvedEndpoint = "/identity/customer/nik";
      } else if (pathname === "/me/profile") {
        resolvedEndpoint = "/profiles/me";
      } else if (pathname === "/business-registrations/requirements") {
        resolvedEndpoint = `/registration-document-requirements${queryString ? `?${queryString}` : ""}`;
      } else if (pathname.startsWith("/business-registrations/applications")) {
        const sub = pathname.replace("/business-registrations/applications", "");
        resolvedEndpoint = `/registration-applications${sub}${queryString ? `?${queryString}` : ""}`;
      } else if (pathname === "/internal/team") {
        resolvedEndpoint = "/internal/accounts";
      } else if (pathname === "/internal/team/invite") {
        resolvedEndpoint = "/internal/accounts";
      } else if (pathname.startsWith("/internal/team/") && pathname.endsWith("/status")) {
        const memberId = pathname.split("/")[3];
        resolvedEndpoint = `/internal/accounts/${memberId}/status`;
      } else if (pathname.startsWith("/internal/team/")) {
        const memberId = pathname.split("/")[3];
        resolvedEndpoint = `/internal/accounts/${memberId}`;
      } else if (pathname === "/auth/roles/switch") {
        resolvedEndpoint = "/auth/context";
      }

      // Ensure Sanctum CSRF cookie for mutating browser requests (force fresh on login)
      if (typeof window !== "undefined" && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        await ensureSanctumCsrf(pathname === "/auth/login");
      }

      // Prepare request headers
      const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      };

      const xsrfToken = getCookie("XSRF-TOKEN");
      if (xsrfToken) {
        headers["X-XSRF-TOKEN"] = xsrfToken;
      }

      const bearerToken = getCookie("servio_token");
      if (bearerToken && bearerToken.startsWith("servio_")) {
        headers["Authorization"] = `Bearer ${bearerToken}`;
      }

      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((val, key) => {
            headers[key] = val;
          });
        } else if (Array.isArray(options.headers)) {
          options.headers.forEach(([k, v]) => {
            headers[k] = v;
          });
        } else {
          Object.assign(headers, options.headers);
        }
      }

      if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      const cleanPath = resolvedEndpoint.startsWith("/api/v1") ? resolvedEndpoint.slice(7) : resolvedEndpoint;
      const targetUrl = `${IDENTITY_BASE_URL.replace(/\/+$/, "")}/${cleanPath.replace(/^\/+/, "")}`;

      const res = await fetch(targetUrl, {
        ...options,
        headers,
        credentials: "include",
      });

      const contentType = res.headers.get("content-type") || "";
      let json: any = null;
      if (contentType.includes("application/json")) {
        json = await res.json();
      } else {
        const text = await res.text();
        try {
          json = JSON.parse(text);
        } catch {
          json = { message: text };
        }
      }

      // Special case: /auth/me unauthenticated (401) should safely return null data
      if (res.status === 401 && (pathname === "/auth/me" || pathname === "/me")) {
        return { data: null as any };
      }

      // If 419 CSRF mismatch, refresh CSRF and retry once
      if (res.status === 419 && !(options as any)._isRetry) {
        await ensureSanctumCsrf(true);
        return apiFetch<T>(endpoint, { ...options, _isRetry: true } as any);
      }

      if (!res.ok) {
        const err: any = new Error(
          json?.message || `Request ke Identity Service gagal dengan kode status ${res.status}.`
        );
        err.status = res.status;
        err.code = json?.code;
        err.errors = json?.error?.field_errors || json?.errors;
        throw err;
      }

      // Synchronize client authentication cookies on success
      if (pathname === "/auth/login") {
        const userData = json?.data?.user || json?.data;
        const activeRole =
          json?.data?.activeRole?.code ||
          json?.data?.role ||
          userData?.role ||
          "CUSTOMER";
        const sessionToken =
          json?.data?.token || json?.data?.session?.id || `servio-session-${Date.now()}`;

        setCookie("servio_token", sessionToken);
        setCookie("servio_session", sessionToken);
        setCookie("servio_guest", "0");
        setCookie("servio_active_role", activeRole);
      } else if (pathname === "/auth/logout") {
        setCookie("servio_token", "", 0);
        setCookie("servio_session", "", 0);
        setCookie("servio_active_role", "", 0);
        setCookie("servio_guest", "1");
      } else if (pathname === "/auth/context" || pathname === "/auth/roles/switch") {
        const activeRole = json?.data?.activeRole?.code || json?.data?.role;
        if (activeRole) {
          setCookie("servio_active_role", activeRole);
          setCookie("servio_guest", "0");
        }
      }

      return {
        success: json?.success ?? true,
        message: json?.message,
        data: json?.data !== undefined ? json.data : json,
        count: json?.count,
        ...json,
      };
    } catch (err) {
      // Re-throw genuine API business errors (validation 422, auth 401, etc.)
      if ((err as any)?.status) {
        throw err;
      }
      console.warn("Identity Service network failure, fallback to mock provider:", err);
    }
  }

  // =========================================================================
  // REAL BACKEND INTEGRATION: Modul 02 Category Management Service
  // =========================================================================
  if (isCategoryRoute(pathname)) {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      };

      const gatewayKey = process.env.NEXT_PUBLIC_CATEGORY_GATEWAY_KEY || "servio_local_gateway_key_2026";
      headers["X-Gateway-Key"] = gatewayKey;

      const activeRoleCookie = getCookie("servio_active_role");
      const activeRole = activeRoleCookie || "CUSTOMER";

      const currentUser = MOCK_USERS_BY_ROLE[activeRole] || MOCK_USERS_BY_ROLE["CUSTOMER"];
      if (currentUser?.id) {
        headers["X-Actor-User-Id"] = currentUser.id;
        headers["X-Actor-Role"] = activeRole;
        if (currentUser.activeRole?.assignmentId) {
          headers["X-Actor-Role-Assignment-Id"] = currentUser.activeRole.assignmentId;
        }
        if (currentUser.organizationId) {
          headers["X-Actor-Org-Id"] = currentUser.organizationId;
        }
      }

      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        if (!headers["Idempotency-Key"]) {
          headers["Idempotency-Key"] = `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
      }

      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((val, key) => {
            headers[key] = val;
          });
        } else if (Array.isArray(options.headers)) {
          options.headers.forEach(([k, v]) => {
            headers[k] = v;
          });
        } else {
          Object.assign(headers, options.headers);
        }
      }

      if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      const cleanPath = endpoint.startsWith("/api/v1") ? endpoint.slice(7) : endpoint;
      const targetUrl = `${CATEGORY_BASE_URL.replace(/\/+$/, "")}/${cleanPath.replace(/^\/+/, "")}`;

      const res = await fetch(targetUrl, {
        ...options,
        headers,
        credentials: "include",
      });

      const contentType = res.headers.get("content-type") || "";
      let json: any = null;
      if (contentType.includes("application/json")) {
        json = await res.json();
      } else {
        const text = await res.text();
        try {
          json = JSON.parse(text);
        } catch {
          json = { message: text };
        }
      }

      if (!res.ok) {
        const err: any = new Error(
          json?.message || `Request ke Category Service gagal dengan kode status ${res.status}.`
        );
        err.status = res.status;
        err.code = json?.code;
        err.errors = json?.error?.field_errors || json?.errors;
        throw err;
      }

      return {
        success: json?.success ?? true,
        message: json?.message,
        data: json?.data !== undefined ? json.data : json,
        count: json?.count,
        meta: json?.meta,
        ...json,
      };
    } catch (err) {
      if ((err as any)?.status) {
        throw err;
      }
      console.warn("Category Service network failure:", err);
      throw err;
    }
  }

  // Small delay to simulate smooth asynchronous operations for mock fallback
  await new Promise((r) => setTimeout(r, 20));

  let bodyData: any = {};
  if (options.body) {
    if (typeof options.body === "string") {
      try {
        bodyData = JSON.parse(options.body);
      } catch {
        bodyData = {};
      }
    } else if (options.body instanceof FormData) {
      bodyData = Object.fromEntries(options.body.entries());
    }
  }

  // 1. AUTHENTICATION HANDLERS (Fallback)
  if (pathname === "/auth/login") {
    const user = resolveUserByEmail(bodyData.email || "");
    const token = `servio-token-${user.role}-${Date.now()}`;
    setCookie("servio_token", token);
    setCookie("servio_session", token);
    setCookie("servio_guest", "0");
    setCookie("servio_active_role", user.role);

    return {
      message: "Login berhasil",
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          status: user.status,
          role: user.role,
        },
      } as any,
    };
  }

  if (pathname === "/auth/me" || pathname === "/me") {
    const guest = getCookie("servio_guest");
    const activeRole = getCookie("servio_active_role");
    const token = getCookie("servio_token") || getCookie("servio_session");

    if (guest === "1" || (!activeRole && !token)) {
      return { data: null as any };
    }

    const roleKey = activeRole || "CUSTOMER";
    const user = MOCK_USERS_BY_ROLE[roleKey] || MOCK_USERS_BY_ROLE.CUSTOMER;
    return { data: user as any };
  }

  if (pathname === "/auth/roles/switch" || pathname.startsWith("/auth/roles/switch") || pathname.includes("switch-context")) {
    const requestedCode = bodyData.roleCode || bodyData.code || pathname.split("/").pop();
    const targetRole = MOCK_USERS_BY_ROLE[requestedCode] ? requestedCode : "CUSTOMER";
    setCookie("servio_active_role", targetRole);
    setCookie("servio_guest", "0");

    const user = MOCK_USERS_BY_ROLE[targetRole];
    return {
      message: "Role context switched",
      data: {
        activeRole: user.activeRole,
        permissions: user.permissions,
        user,
      } as any,
    };
  }

  if (pathname === "/auth/logout") {
    setCookie("servio_token", "", 0);
    setCookie("servio_session", "", 0);
    setCookie("servio_active_role", "", 0);
    setCookie("servio_guest", "1");
    return { message: "Logout berhasil", data: true as any };
  }

  if (pathname.startsWith("/auth/register")) {
    const user = MOCK_USERS_BY_ROLE.CUSTOMER;
    return {
      message: "Pendaftaran berhasil",
      data: {
        user,
        verification: { id: "ver-" + Date.now() },
      } as any,
    };
  }

  if (pathname.includes("/password/forgot")) {
    return {
      message: "Instruksi reset password telah dikirim ke email.",
      data: { token: "mock-reset-tok-" + Date.now(), email: bodyData.email } as any,
    };
  }

  if (pathname.includes("/password/reset")) {
    return {
      message: "Password berhasil diubah. Silakan masuk kembali.",
      data: true as any,
    };
  }

  // 2. SERVICES & CATALOG HANDLERS
  if (pathname.startsWith("/services/catalog")) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 3) {
      const id = parts[2];
      const match = MOCK_SERVICES.find((s) => s.id === id) || MOCK_SERVICES[0];
      return { data: mapServiceToCatalog(match) as any };
    }
    return {
      data: MOCK_SERVICES.map(mapServiceToCatalog) as any,
      count: MOCK_SERVICES.length,
    };
  }

  if (pathname.startsWith("/provider/services")) {
    const parts = pathname.split("/").filter(Boolean);
    if (method === "POST") {
      const newService = {
        id: "srv-" + Date.now(),
        providerId: bodyData.providerId || "usr-prov-001",
        providerName: bodyData.providerName || "PT Servio Mandiri Teknik",
        categoryId: bodyData.categoryId,
        categoryName: bodyData.categoryName,
        subcategoryId: bodyData.subcategoryId,
        subcategoryName: bodyData.subcategoryName,
        name: bodyData.name,
        title: bodyData.name,
        description: bodyData.description || "",
        shortDescription: bodyData.description || "",
        fullDescription: bodyData.description || "",
        priceMin: Number(bodyData.priceMin) || 75000,
        priceMax: Number(bodyData.priceMax) || 150000,
        basePrice: Number(bodyData.priceMin) || 75000,
        surveyFee: Number(bodyData.surveyFee) || 0,
        serviceMethods: bodyData.serviceMethods || ["HOME_SERVICE"],
        status: bodyData.status || "ACTIVE",
        availability: bodyData.availability || "AVAILABLE",
        warrantyConfig: bodyData.warrantyConfig || { warrantyEnabled: true, durationDays: 30 },
        warrantyDays: bodyData.warrantyConfig?.durationDays || 30,
        rating: 5.0,
        reviewCount: 0,
        isVerifiedProvider: true,
        createdAt: new Date().toISOString(),
      };
      MOCK_SERVICES.unshift(newService as any);
      return { message: "Layanan berhasil ditambahkan", data: newService as any };
    }
    if (parts.length >= 3 && method === "GET") {
      const id = parts[2];
      const match = MOCK_SERVICES.find((s) => s.id === id) || MOCK_SERVICES[0];
      return { data: mapServiceToCatalog(match) as any };
    }
    return {
      data: MOCK_SERVICES.map(mapServiceToCatalog) as any,
      count: MOCK_SERVICES.length,
    };
  }

  // 3. PRODUCTS & SHOPS HANDLERS
  if (pathname.includes("/compatibilities")) {
    return { data: [] as any };
  }

  if (pathname.startsWith("/products")) {
    const parts = pathname.split("/").filter(Boolean);

    // POST /products (Create product)
    if (method === "POST" && parts.length === 1) {
      const newProd: any = {
        id: "prod-" + Date.now(),
        title: bodyData.name || "Produk Baru",
        category: bodyData.categoryName || "Sparepart AC & Pendingin",
        categoryId: bodyData.categoryId || "080142ee-0a66-434a-988e-8bc29a8f05fd",
        categoryName: bodyData.categoryName || "Sparepart AC & Pendingin",
        subcategoryId: bodyData.subcategoryId || "850cb3fa-56ba-42e5-9812-f9d5ae42dfb3",
        subcategoryName: bodyData.subcategoryName || "Gas Refrigerant & Freon",
        price: bodyData.variants?.[0]?.price || 100000,
        stock: bodyData.variants?.[0]?.stock || 10,
        merchantId: "merch-sentra-teknik",
        merchantName: "Sentra Teknik Sparepart",
        compatibilityTags: bodyData.brandName ? [bodyData.brandName] : [],
        brandName: bodyData.brandName,
        description: bodyData.description || "",
        specifications: {},
        isOriginal: true,
        warrantyMonths: bodyData.warrantyPolicy?.durationMonths || 6,
        warrantyPolicy: bodyData.warrantyPolicy,
        variants: bodyData.variants || [
          { name: "Varian Standard", price: bodyData.variants?.[0]?.price || 100000, stock: bodyData.variants?.[0]?.stock || 10 },
        ],
        status: "ACTIVE",
      };
      MOCK_PRODUCTS.unshift(newProd);
      return { message: "Produk berhasil ditambahkan", data: mapProductToApi(newProd) as any };
    }

    // PATCH /products/{id} (Update product)
    if (method === "PATCH" && parts.length >= 2) {
      const id = parts[1];
      const match = MOCK_PRODUCTS.find((p) => p.id === id);
      if (match) {
        if (bodyData.name) match.title = bodyData.name;
        if (bodyData.categoryId) (match as any).categoryId = bodyData.categoryId;
        if (bodyData.categoryName) {
          match.category = bodyData.categoryName;
          (match as any).categoryName = bodyData.categoryName;
        }
        if (bodyData.subcategoryId) (match as any).subcategoryId = bodyData.subcategoryId;
        if (bodyData.subcategoryName) (match as any).subcategoryName = bodyData.subcategoryName;
        if (bodyData.brandName) {
          (match as any).brandName = bodyData.brandName;
          match.compatibilityTags = [bodyData.brandName];
        }
        if (bodyData.description) match.description = bodyData.description;
        if (bodyData.warrantyPolicy) (match as any).warrantyPolicy = bodyData.warrantyPolicy;
        return { message: "Produk berhasil diperbarui", data: mapProductToApi(match) as any };
      }
    }

    // DELETE /products/{id}
    if (method === "DELETE" && parts.length >= 2) {
      const id = parts[1];
      const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
      if (idx !== -1) {
        MOCK_PRODUCTS.splice(idx, 1);
        return { message: "Produk berhasil dihapus" } as any;
      }
    }

    if (parts.length >= 2 && parts[1] !== "search") {
      const id = parts[1];
      const match = MOCK_PRODUCTS.find((p) => p.id === id) || MOCK_PRODUCTS[0];
      return { data: mapProductToApi(match) as any };
    }

    let prods = MOCK_PRODUCTS;
    const cat = query.get("categoryId");
    const subcat = query.get("subcategoryId");
    const search = query.get("search");
    if (cat && cat !== "ALL") {
      prods = prods.filter((p) => (p as any).categoryId === cat || p.category?.toLowerCase().includes(cat.toLowerCase()));
    }
    if (subcat && subcat !== "ALL") {
      prods = prods.filter((p) => (p as any).subcategoryId === subcat || (p as any).subcategoryName?.toLowerCase().includes(subcat.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      prods = prods.filter((p) => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    const mapped = prods.map(mapProductToApi);
    return {
      data: mapped as any,
      matchedMerchants: MOCK_SHOPS,
      recommendations: MOCK_PRODUCTS.slice(0, 4).map(mapProductToApi),
      count: mapped.length,
    };
  }

  if (pathname.startsWith("/product-categories")) {
    return { data: MOCK_PRODUCT_CATEGORIES as any };
  }

  if (pathname.startsWith("/brands")) {
    const parts = pathname.split("/").filter(Boolean);

    // POST /brands
    if (method === "POST" && parts.length === 1) {
      const name = (bodyData.name || "").trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const newBrand: any = {
        id: "brand-" + Date.now(),
        name,
        slug,
        logo_url: bodyData.logo_url || bodyData.logoUrl || "",
        logoUrl: bodyData.logo_url || bodyData.logoUrl || "",
        description: bodyData.description || "",
        status: bodyData.status || "ACTIVE",
        product_count: 0,
        productCount: 0,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      MOCK_BRANDS.unshift(newBrand);
      return { message: "Merek berhasil ditambahkan", data: newBrand as any };
    }

    // PATCH /brands/{id}
    if (method === "PATCH" && parts.length >= 2) {
      const id = parts[1];
      const match = MOCK_BRANDS.find((b) => b.id === id);
      if (match) {
        if (bodyData.name) {
          match.name = bodyData.name.trim();
          match.slug = bodyData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
        }
        if (bodyData.logo_url !== undefined) {
          match.logo_url = bodyData.logo_url;
          match.logoUrl = bodyData.logo_url;
        }
        if (bodyData.logoUrl !== undefined) {
          match.logo_url = bodyData.logoUrl;
          match.logoUrl = bodyData.logoUrl;
        }
        if (bodyData.description !== undefined) match.description = bodyData.description;
        if (bodyData.status) match.status = bodyData.status;
        return { message: "Merek berhasil diperbarui", data: match as any };
      }
    }

    // DELETE /brands/{id}
    if (method === "DELETE" && parts.length >= 2) {
      const id = parts[1];
      const idx = MOCK_BRANDS.findIndex((b) => b.id === id);
      if (idx !== -1) {
        MOCK_BRANDS.splice(idx, 1);
        return { message: "Merek berhasil dihapus" } as any;
      }
    }

    let result = MOCK_BRANDS;
    const status = query.get("status");
    const search = query.get("search");
    if (status && status !== "ALL") {
      result = result.filter((b) => b.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q));
    }

    const brandsWithCount = result.map((b) => {
      const pCount = MOCK_PRODUCTS.filter(
        (p) => (p.brandName || "").trim().toLowerCase() === b.name.trim().toLowerCase()
      ).length;
      return {
        ...b,
        product_count: pCount,
        productCount: pCount,
      };
    });

    return { data: brandsWithCount as any, count: brandsWithCount.length };
  }

  if (pathname.startsWith("/shops")) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const id = parts[1];
      const shop = MOCK_SHOPS.find((s) => s.id === id || s.organizationCode === id) || MOCK_SHOPS[0];
      return { data: shop as any };
    }
    return { data: MOCK_SHOPS as any };
  }

  // 4. CART HANDLERS
  if (pathname.startsWith("/cart")) {
    return {
      data: {
        cartId: "cart-standalone",
        groups: [],
        grandTotal: 0,
        totalCount: 0,
      } as any,
    };
  }

  // 5. ORDERS (SERVICE ORDERS & PRODUCT ORDERS)
  if (pathname.startsWith("/service-orders")) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && method === "GET") {
      const id = parts[1];
      const order = domainRepository.getOrder(id) || MOCK_ORDERS[0];
      return { data: order as any };
    }
    if (method === "POST") {
      const newOrder = {
        id: "SRV-ORD-" + Date.now(),
        orderNumber: "SRV-ORD-" + Date.now(),
        status: "DRAFT",
        pricing: { totalAmount: 150000 },
        createdAt: new Date().toISOString(),
        ...bodyData,
      };
      return { message: "Pesanan berhasil dibuat", data: newOrder as any };
    }
    return { data: (domainRepository.orders || MOCK_ORDERS) as any };
  }

  if (pathname.startsWith("/product-orders")) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && method === "GET") {
      return { data: (domainRepository.merchantOrders?.[0] || MOCK_ORDERS[0]) as any };
    }
    if (method === "POST") {
      const newProdOrder = {
        id: "PRD-ORD-" + Date.now(),
        orderNumber: "PRD-ORD-" + Date.now(),
        status: "AWAITING_PAYMENT",
        totalAmount: bodyData.totalAmount || 250000,
        createdAt: new Date().toISOString(),
        ...bodyData,
      };
      return { message: "Pesanan produk berhasil dibuat", data: newProdOrder as any };
    }
    return { data: (domainRepository.merchantOrders || []) as any };
  }

  // 6. WARRANTIES HANDLERS
  if (pathname.startsWith("/warranties") || pathname.startsWith("/provider/warranty")) {
    const parts = pathname.split("/").filter(Boolean);
    if (pathname.includes("/claim") && method === "POST") {
      return { message: "Klaim garansi berhasil diajukan", data: { id: "CLM-" + Date.now(), claimId: "CLM-" + Date.now(), status: "SUBMITTED" } as any };
    }
    if (parts.length >= 2 && method === "GET") {
      const id = parts[1];
      const w: any = domainRepository.getWarranty(id) || (domainRepository.warranties || [])[0];
      if (w) {
        return {
          data: {
            ...w,
            id: w.id || id,
            warrantyId: w.warrantyId || w.id || id,
            productName: w.productName || w.serviceTitle || "Komponen Servis & Suku Cadang",
            variantName: w.variantName || "Original Part",
            orderId: w.orderId || "ORD-2026-8901",
            startAt: w.startAt || w.startDate || "2026-01-01",
            endAt: w.endAt || w.endDate || "2026-07-01",
            durationMonths: w.durationMonths || 6,
          } as any,
        };
      }
      return { data: w as any };
    }
    const list = (domainRepository.warranties || []).map((w: any, idx: number) => ({
      ...w,
      id: w.id || `WAR-2026-${String(idx + 1).padStart(3, "0")}`,
      warrantyId: w.warrantyId || w.id || `WAR-2026-${String(idx + 1).padStart(3, "0")}`,
      productName: w.productName || w.serviceTitle || "Komponen Servis & Suku Cadang",
      variantName: w.variantName || "Original Part",
      orderId: w.orderId || "ORD-2026-8901",
      startAt: w.startAt || "2026-01-01",
      endAt: w.endAt || "2026-07-01",
      durationMonths: w.durationMonths || 6,
    }));
    return { data: list as any };
  }

  // 7. RETURNS & REFUNDS HANDLERS
  if (pathname.startsWith("/returns")) {
    return { data: (domainRepository.returns || []) as any };
  }

  if (pathname.startsWith("/refunds")) {
    return { data: (domainRepository.refunds || []) as any };
  }

  // 8. PROFILE & ADDRESSES HANDLERS
  if (pathname === "/me/profile") {
    const activeRole = getCookie("servio_active_role") || "CUSTOMER";
    const user = MOCK_USERS_BY_ROLE[activeRole] || MOCK_USERS_BY_ROLE.CUSTOMER;
    return { data: user as any };
  }

  if (pathname.startsWith("/me/addresses")) {
    return { data: MOCK_ADDRESSES as any };
  }

  // 9. WORKERS & ORGANIZATIONS
  if (pathname.startsWith("/provider/workers")) {
    return { data: MOCK_WORKERS as any };
  }

  if (pathname.startsWith("/organizations")) {
    return {
      data: {
        id: "org-01",
        name: "PT Servio Mandiri Teknik",
        type: "SERVICE_PROVIDER",
        status: "VERIFIED",
      } as any,
    };
  }

  // 10. ROLE ASSIGNMENTS & NOTIFICATIONS
  if (pathname.startsWith("/role-assignments")) {
    const activeRole = getCookie("servio_active_role") || "CUSTOMER";
    const user = MOCK_USERS_BY_ROLE[activeRole] || MOCK_USERS_BY_ROLE.CUSTOMER;
    return { data: user.roles as any };
  }

  if (pathname.startsWith("/notifications")) {
    return { data: [] as any };
  }

  // 11. TAXONOMY & GOVERNANCE
  if (pathname.startsWith("/taxonomy")) {
    return {
      data: [
        { id: "cat-ac", name: "Servis AC & Pendingin", code: "AC", status: "ACTIVE" },
        { id: "cat-elec", name: "Elektronik Rumah Tangga", code: "ELEC", status: "ACTIVE" },
        { id: "cat-plumb", name: "Pipa & Sanitasi", code: "PLUMB", status: "ACTIVE" },
      ] as any,
    };
  }

  if (pathname.startsWith("/governance") || pathname.startsWith("/policies") || pathname.startsWith("/platform-policies")) {
    return { data: [] as any };
  }

  if (pathname.startsWith("/payment-configuration")) {
    return {
      data: {
        escrowHoldDays: 3,
        platformFeePercent: 2.5,
        guaranteeProtectionDays: 30,
      } as any,
    };
  }

  // 12. INTERNAL ACCOUNTS & ONBOARDING
  if (pathname.includes("/onboarding/tasks/")) {
    const parts = pathname.split("/");
    const taskId = parts[parts.length - 1];
    const task = mockOnboardingState.tasks.find((t: any) => t.id === taskId);
    if (task) {
      task.status = "COMPLETED";
      task.completedAt = new Date().toISOString();
      if (bodyData.payload) {
        task.metadata = { ...(task.metadata || {}), ...bodyData.payload };
      }
    }
    const completedCount = mockOnboardingState.tasks.filter((t: any) => t.status === "COMPLETED").length;
    mockOnboardingState.progress = Math.round((completedCount / mockOnboardingState.tasks.length) * 100);
    if (mockOnboardingState.progress === 100) {
      mockOnboardingState.status = "COMPLETED";
      if (mockOnboardingState.readiness) {
        mockOnboardingState.readiness.ready = true;
        mockOnboardingState.readiness.status = "READY";
        mockOnboardingState.readiness.checks.onboardingCompleted = true;
      }
    }
    return { data: mockOnboardingState as any };
  }

  if (pathname.includes("/onboarding/complete")) {
    mockOnboardingState.tasks.forEach((t: any) => {
      t.status = "COMPLETED";
      t.completedAt = t.completedAt || new Date().toISOString();
    });
    mockOnboardingState.progress = 100;
    mockOnboardingState.status = "COMPLETED";
    if (mockOnboardingState.readiness) {
      mockOnboardingState.readiness.ready = true;
      mockOnboardingState.readiness.status = "READY";
      mockOnboardingState.readiness.checks.onboardingCompleted = true;
    }
    return { data: mockOnboardingState as any };
  }

  if (pathname.endsWith("/onboarding") || pathname.includes("/onboarding")) {
    return { data: mockOnboardingState as any };
  }

  if (pathname.startsWith("/internal/accounts")) {
    const parts = pathname.split("/").filter(Boolean); // ['internal', 'accounts', ...]
    if (parts.length === 2) {
      if (method === "POST") {
        const newAcc = {
          id: `usr-int-${Date.now()}`,
          fullName: bodyData.fullName || "Staf Baru",
          email: bodyData.email || "staff@servio.id",
          phone: bodyData.phone || "+62 812-0000-0000",
          employeeId: bodyData.employeeId || `EMP-${Date.now()}`,
          role: { code: bodyData.roleCode || "ADMIN_OPERATIONS", name: bodyData.roleCode || "Admin Operations" },
          department: bodyData.department || "Operations",
          position: bodyData.position || "Staff",
          employmentType: bodyData.employmentType || "FULL_TIME",
          startDate: bodyData.startDate || new Date().toISOString().split("T")[0],
          accountStatus: "ACTIVE",
          employmentStatus: "ACTIVE",
          onboardingStatus: "IN_PROGRESS",
          readiness: "NOT_READY",
          createdAt: new Date().toISOString(),
        };
        MOCK_INTERNAL_ACCOUNTS.push(newAcc);
        return {
          data: {
            account: newAcc,
            invitationToken: "tok-inv-" + Date.now(),
            invitationUrl: "http://localhost:3000/auth/login",
          } as any,
        };
      }

      // GET /internal/accounts
      return {
        data: {
          stats: {
            totalStaff: MOCK_INTERNAL_ACCOUNTS.length,
            adminOperations: MOCK_INTERNAL_ACCOUNTS.filter((a: any) => a.role.code === "ADMIN_OPERATIONS").length,
            financeOperations: MOCK_INTERNAL_ACCOUNTS.filter((a: any) => a.role.code === "FINANCE_PAYMENT_OPS").length,
            customerSupport: MOCK_INTERNAL_ACCOUNTS.filter((a: any) => a.role.code === "CUSTOMER_SUPPORT").length,
            operationalReady: MOCK_INTERNAL_ACCOUNTS.filter((a: any) => a.readiness === "READY").length,
            onboardingActive: MOCK_INTERNAL_ACCOUNTS.filter((a: any) => a.onboardingStatus === "IN_PROGRESS").length,
          },
          accounts: MOCK_INTERNAL_ACCOUNTS,
        } as any,
      };
    }

    if (parts.length >= 3) {
      const id = parts[2];
      const acc = MOCK_INTERNAL_ACCOUNTS.find((a: any) => a.id === id) || MOCK_INTERNAL_ACCOUNTS[0];

      if (pathname.includes("/employment/suspend")) {
        acc.employmentStatus = "SUSPENDED";
        return { data: { id: acc.id, status: "SUSPENDED" } as any };
      }
      if (pathname.includes("/employment/offboard")) {
        acc.employmentStatus = "OFFBOARDED";
        return { data: { id: acc.id, status: "OFFBOARDED" } as any };
      }
      if (pathname.includes("/employment") && method === "PATCH") {
        acc.department = bodyData.department || acc.department;
        acc.position = bodyData.position || acc.position;
        acc.employmentType = bodyData.employmentType || acc.employmentType;
        return { message: "Employment updated", data: { id: acc.id, department: acc.department } as any };
      }
      if (method === "DELETE") {
        const idx = MOCK_INTERNAL_ACCOUNTS.findIndex((a: any) => a.id === id);
        if (idx !== -1) MOCK_INTERNAL_ACCOUNTS.splice(idx, 1);
        return { message: "Akun berhasil dihapus", data: true as any };
      }

      const detail = {
        identity: {
          id: acc.id,
          fullName: acc.fullName,
          email: acc.email,
          phone: acc.phone,
          status: acc.accountStatus,
          createdAt: acc.createdAt,
          nik: "3171012304980005",
          ktpFilePath: "/brand/logo.png",
          emergencyContact: { name: "Budi Santoso", phone: "+62 812-9988-7766" },
        },
        profile: {
          displayName: acc.fullName,
          bio: "Staf Operasional SERVIO.",
          avatar: "/brand/logo.png",
          gender: "FEMALE",
          dateOfBirth: "1995-08-17",
        },
        role: { code: acc.role.code, name: acc.role.name, assignmentId: "asgn-01", assignmentStatus: "ACTIVE" },
        membership: { id: "mem-01", organizationId: "org-01", membershipType: "INTERNAL", status: "ACTIVE" },
        employment: {
          id: "emp-01",
          employeeId: acc.employeeId,
          department: acc.department,
          position: acc.position,
          employmentType: acc.employmentType,
          startDate: acc.startDate,
          status: acc.employmentStatus,
        },
        onboarding: mockOnboardingState,
        readiness: mockOnboardingState.readiness || {
          ready: true,
          status: "READY",
          reason: "Kesiapan operasional aktif.",
          checks: {
            accountActive: true,
            membershipActive: true,
            roleAssignmentValid: true,
            employmentActive: true,
            onboardingCompleted: true,
          },
        },
      };

      return { data: detail as any };
    }
  }

  // 13. SUPPLIER PRODUCTS HANDLERS
  if (pathname.startsWith("/supplier/products")) {
    const parts = pathname.split("/").filter(Boolean); // ['supplier', 'products', ...]
    if (parts.length === 2) {
      if (method === "POST") {
        const prod = MOCK_PRODUCTS.find((p) => p.id === bodyData.productId) || MOCK_PRODUCTS[0];
        const newSp = {
          supplierProductId: `sp-${Date.now()}`,
          supplierOrganizationId: "org-supplier-01",
          productId: bodyData.productId || prod.id,
          variantId: bodyData.variantId || `var-${prod.id}`,
          supplierProductCode: bodyData.supplierProductCode || `SUP-${Date.now()}`,
          supplierProductName: bodyData.supplierProductName || prod.title,
          supplierDescription: bodyData.supplierDescription || "",
          status: bodyData.status || "ACTIVE",
          product: mapProductToApi(prod),
          variant: {
            variantId: bodyData.variantId || `var-${prod.id}`,
            sku: bodyData.supplierProductCode || `SKU-${prod.id}`,
            variantName: "Standar",
            price: prod.price,
            stock: prod.stock || 20,
            status: "PUBLISHED",
          },
          createdAt: new Date().toISOString(),
        };
        MOCK_SUPPLIER_PRODUCTS.unshift(newSp);
        return { data: newSp as any };
      }

      // GET /supplier/products
      const statusParam = query.get("status");
      let list = MOCK_SUPPLIER_PRODUCTS;
      if (statusParam && statusParam !== "ALL") {
        list = list.filter((sp) => sp.status === statusParam);
      }
      return { data: list as any };
    }

    if (parts.length >= 3) {
      const id = parts[2];
      const sp = MOCK_SUPPLIER_PRODUCTS.find((p) => p.supplierProductId === id) || MOCK_SUPPLIER_PRODUCTS[0];

      if (pathname.endsWith("/activate")) {
        sp.status = "ACTIVE";
        return { data: sp as any };
      }
      if (pathname.endsWith("/deactivate")) {
        sp.status = "INACTIVE";
        return { data: sp as any };
      }
      if (pathname.endsWith("/archive")) {
        sp.status = "ARCHIVED";
        return { data: sp as any };
      }
      if (method === "PATCH") {
        Object.assign(sp, bodyData);
        return { data: sp as any };
      }

      return { data: sp as any };
    }
  }

  // 14. FALLBACK DEFAULT
  return {
    message: "Operasi berhasil (Frontend Standalone)",
    data: {} as any,
  };
}

/* =========================================================================
   AUTH SERVICE CALLS
   ========================================================================= */

export const authApi = {
  // Register Customer (Section 5)
  async registerCustomer(formData: FormData) {
    return apiFetch<{
      user: {
        id: string;
        fullName: string;
        email: string;
        phone: string;
        status: string;
        role: string;
      };
      verification: {
        id: string;
        type: string;
        destination: string;
        debugOtp?: string;
      };
    }>("/auth/register", {
      method: "POST",
      body: formData,
    });
  },

  // Register User / Business Applicant (Section 5)
  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    registration_type?: string;
  }) {
    return apiFetch<{
      user: {
        id: string;
        fullName: string;
        email: string;
        phone: string;
        status: string;
        role: string;
      };
      verification: {
        id: string;
        type: string;
        destination: string;
        debugOtp?: string;
      };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Login (Section 17 & 18)
  async login(email: string, password: string) {
    return apiFetch<{
      user: {
        id: string;
        fullName: string;
        email: string;
        phone: string;
        status: string;
        role: string;
        employeeId?: string;
        department?: string;
      };
      token?: string;
      expiresAt: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // Current authenticated user (Section 19 & Level 02 Section 14)
  async me() {
    return apiFetch<{
      id: string;
      fullName: string;
      email: string;
      phone: string;
      status: string;
      role: string;
      employeeId?: string;
      department?: string;
      nik?: string;
      ktpFilePath?: string;
      emailVerified: boolean;
      phoneVerified: boolean;
      createdAt?: string;
      providerId?: string;
      workerProfile?: Record<string, unknown>;
      businessProfile?: {
        id?: string;
        registrationNumber?: string;
        status?: string;
        applicantType?: string;
        picData?: {
          fullName?: string;
          nik?: string;
          position?: string;
          phone?: string;
          email?: string;
        };
        businessData?: {
          legalName?: string;
          brandName?: string;
          businessType?: string;
          nib?: string;
          npwp?: string;
          email?: string;
          phone?: string;
          address?: string;
          province?: string;
          city?: string;
          district?: string;
          postalCode?: string;
        };
        specializedData?: Record<string, unknown>;
      };
      documents?: Array<{
        id: string;
        documentType: string;
        fileName: string;
        filePath: string;
        fileSize?: number;
        status: string;
        version: number;
      }>;
      roles?: Array<{
        assignmentId: string;
        code: string;
        name?: string;
        scopeType: string;
        scopeId?: string | null;
        status: string;
      }>;
      activeRole?: {
        assignmentId: string;
        code: string;
        scopeType: string;
        scopeId?: string | null;
        status?: string;
      };
      permissions?: string[];
      user?: Record<string, unknown>;
      profile?: ApiPersonalProfile;
      personalProfile?: ApiPersonalProfile;
      activeOrganization?: ApiOrganization | null;
      activeMembership?: ApiMembership | null;
    }>("/auth/me");
  },

  // Switch Active Role Context (Level 02 Section 32)
  async switchContext(roleAssignmentId: string) {
    return apiFetch<{
      roles?: Array<{
        assignmentId: string;
        code: string;
        scopeType: string;
        scopeId?: string | null;
        status: string;
      }>;
      activeRole?: {
        assignmentId: string;
        code: string;
        scopeType: string;
        scopeId?: string | null;
      };
      permissions?: string[];
    }>("/auth/context", {
      method: "PATCH",
      body: JSON.stringify({
        role_assignment_id: roleAssignmentId,
        roleAssignmentId,
      }),
    });
  },

  // Logout (Section 20)
  async logout() {
    return apiFetch("/auth/logout", { method: "POST" });
  },

  // Logout all sessions (Section 21)
  async logoutAll() {
    return apiFetch("/auth/logout-all", { method: "POST" });
  },

  // Send OTP (Section 22)
  async sendVerification(type: "EMAIL_VERIFICATION" | "PHONE_VERIFICATION" | string = "EMAIL_VERIFICATION", identifier?: string) {
    return apiFetch<{
      id: string;
      challenge_id?: string;
      type: string;
      destination?: string;
      masked_destination?: string;
      debugOtp?: string;
    }>("/auth/verification/send", {
      method: "POST",
      body: JSON.stringify({
        purpose: type === "EMAIL_VERIFICATION" || type === "PHONE_VERIFICATION" ? "ACCOUNT_VERIFICATION" : type,
        type,
        identifier,
      }),
    });
  },

  // Verify OTP (Section 22)
  async verifyCode(
    code: string,
    type: "EMAIL_VERIFICATION" | "PHONE_VERIFICATION" | string = "EMAIL_VERIFICATION",
    identifier?: string,
    challengeId?: string
  ) {
    if (challengeId) {
      return apiFetch<{
        verified: boolean;
        next_step: string;
      }>(`/otp/challenges/${challengeId}/verify`, {
        method: "POST",
        body: JSON.stringify({ code, otp: code, identifier }),
      });
    }
    return apiFetch("/auth/verification/verify", {
      method: "POST",
      body: JSON.stringify({
        code,
        otp: code,
        purpose: type === "EMAIL_VERIFICATION" || type === "PHONE_VERIFICATION" ? "ACCOUNT_VERIFICATION" : type,
        type,
        identifier,
      }),
    });
  },

  // Resend OTP Code
  async resendOtp(email: string, challengeId?: string) {
    if (challengeId) {
      return apiFetch<{
        challenge_id?: string;
        expires_at?: string;
        delivery_state?: string;
      }>(`/otp/challenges/${challengeId}/resend`, { method: "POST" });
    }
    return apiFetch<{
      challenge_id?: string;
      expires_at?: string;
      delivery_state?: string;
    }>("/otp/challenges", {
      method: "POST",
      body: JSON.stringify({
        purpose: "ACCOUNT_VERIFICATION",
        identifier: email,
        channel: "EMAIL",
      }),
    });
  },

  // Forgot Password (Section 23)
  async forgotPassword(email: string) {
    return apiFetch<{ token?: string; email?: string; challenge_id?: string }>("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Verify OTP for Password Reset
  async verifyPasswordResetOtp(email: string, code: string, challengeId?: string) {
    return apiFetch<{ reset_grant?: string; status?: string }>("/auth/password/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code, challenge_id: challengeId }),
    });
  },

  // Reset Password (Section 23)
  async resetPassword(token: string, password: string, password_confirmation: string) {
    return apiFetch("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, password, password_confirmation }),
    });
  },

  // Preview Invitation Token (Section 08.2 W06 / S07)
  async previewInvitation(token: string) {
    const cleanToken = token.includes("token=") ? token.split("token=")[1].split("&")[0] : token;
    return apiFetch<{
      kind: string;
      organization_name: string;
      entity_name?: string;
      entity_label?: string;
      worker_name?: string;
      recipient_name?: string;
      masked_recipient: string;
      target_role: string;
      role_name?: string;
      role_label?: string;
      expires_at: string;
    }>(`/invitations/${encodeURIComponent(cleanToken.trim())}/preview`);
  },

  // Complete Staff & Worker Invitation (Section 26 & Section 08.2 W07)
  async completeInvitation(token: string, password: string, password_confirmation: string, additionalData?: Record<string, unknown>) {
    const cleanToken = token.includes("token=") ? token.split("token=")[1].split("&")[0] : token;
    return apiFetch<{
      kind?: string;
      user_id?: string;
      membership_id?: string;
      redirect_url?: string;
    }>("/auth/invitation/complete", {
      method: "POST",
      body: JSON.stringify({
        token: cleanToken.trim(),
        password,
        password_confirmation,
        ...(additionalData || {}),
      }),
    });
  },

  // Submit Customer NIK Format-Only (CR-01 & CR-02 V11)
  async submitCustomerNik(nik: string) {
    return apiFetch<{
      nik_masked: string;
      nik_format_status: string;
      nik_locked: boolean;
      next_step: string;
    }>("/identity/customer/nik", {
      method: "POST",
      body: JSON.stringify({ nik }),
    });
  },

  // Submit Employee KYC (V04)
  async submitEmployeeKyc(data: FormData | { nik?: string; employee_identity?: string; legal_name?: string; document_ids?: string[] }) {
    if (typeof FormData !== "undefined" && data instanceof FormData) {
      if (!data.has("kind")) data.append("kind", "EMPLOYEE_KYC");
      return apiFetch<{
        request_id: string;
        status: string;
        submitted_at: string;
      }>("/identity/verifications", {
        method: "POST",
        body: data,
      });
    }
    return apiFetch<{
      request_id: string;
      status: string;
      submitted_at: string;
    }>("/identity/verifications", {
      method: "POST",
      body: JSON.stringify({
        kind: "EMPLOYEE_KYC",
        ...data,
      }),
    });
  },

  // Get My Identity Verifications (V05)
  async getMyVerifications() {
    return apiFetch<Array<{
      id: string;
      status: string;
      lock_version: number;
      created_at: string;
      reviewed_at?: string;
    }>>("/identity/verifications/me");
  },

  // Change Password (A16)
  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirmation: string) {
    return apiFetch<{ user_id?: string; message: string }>("/auth/password/change", {
      method: "POST",
      body: JSON.stringify({
        current_password: oldPassword,
        new_password: newPassword,
        confirm_password: newPasswordConfirmation,
      }),
    });
  },

  // Active Device Sessions (A12)
  async getSessions() {
    const res = await apiFetch<any>("/auth/sessions");
    if (res.data && Array.isArray((res.data as any).items)) {
      return {
        ...res,
        data: (res.data as any).items as Array<{
          id: string;
          device_name?: string;
          created_ip?: string;
          last_seen_at?: string;
          created_at?: string;
          current?: boolean;
        }>,
      };
    }
    return res as ApiResponse<Array<{
      id: string;
      device_name?: string;
      created_ip?: string;
      last_seen_at?: string;
      created_at?: string;
      current?: boolean;
    }>>;
  },

  // Revoke Specific Session (A13)
  async revokeSession(sessionId: string) {
    return apiFetch(`/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  // Google OAuth Account Linking (A05-A07)
  async googleLinkStart() {
    return apiFetch<{ redirect_url?: string }>("/auth/google/link/start", {
      method: "POST",
    });
  },

  async googleUnlink() {
    return apiFetch<{ message: string }>("/auth/google/link", {
      method: "DELETE",
    });
  },
};

/* =========================================================================
   REGISTRATION SERVICES
   ========================================================================= */

export interface DocumentRequirement {
  id: string;
  applicantType: string;
  documentType: string;
  label: string;
  description: string;
  required: boolean;
  allowedExtensions: string[];
  maxFileSizeMB: number;
}

export interface ApplicationDocument {
  id: string;
  documentId?: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  version: number;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "REPLACEMENT_REQUIRED" | "REVISION_REQUIRED" | "PENDING";
  verification_status?: string;
  reviewNote?: string;
  uploadedAt: string;
  is_deleted_for_revision?: boolean;
  is_empty?: boolean;
}

export interface RegistrationApplicationData {
  id: string;
  registrationNumber: string;
  userId: string;
  applicantType: "SERVICE_PROVIDER" | "MERCHANT" | "SUPPLIER";
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED" | "RESUBMITTED";
  picData: {
    fullName?: string;
    nik?: string;
    position?: string;
    phone?: string;
    email?: string;
  };
  businessData: {
    legalName?: string;
    brandName?: string;
    businessType?: string;
    nib?: string;
    npwp?: string;
    email?: string;
    phone?: string;
    address?: string;
    province?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  };
  specializedData: Record<string, unknown>;
  documents: ApplicationDocument[];
  user?: {
    fullName: string;
    email: string;
    phone: string;
    status: string;
  };
  reviewNote?: string;
  review_note?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt?: string;
  revisionDocTypes?: string[];
  requiredChanges?: string[];
  required_changes?: string[];
  revisionNo?: number;
  lockVersion?: number;
}

export const registrationApi = {
  // Get applicant's own applications (for profile & status)
  async myApplications() {
    return apiFetch<any>("/registration-applications");
  },

  // Fetch dynamic requirements (Section 10 & 40)
  async getDocumentRequirements(applicantType?: string) {
    const q = applicantType ? `?applicantType=${applicantType}` : "";
    return apiFetch<DocumentRequirement[]>(`/registration-document-requirements${q}`);
  },

  // Create Business Application (Section 6-9 & 40)
  async createApplication(data: {
    applicantType: "SERVICE_PROVIDER" | "MERCHANT" | "SUPPLIER";
    account: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      password_confirmation: string;
    };
    picData?: Record<string, unknown>;
    businessData?: Record<string, unknown>;
    specializedData?: Record<string, unknown>;
  }) {
    return apiFetch<{
      application: RegistrationApplicationData;
      user: {
        id: string;
        fullName: string;
        email: string;
        status: string;
        role: string;
      };
      token?: string;
    }>("/registration-applications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get Application Detail (Section 40)
  async getApplication(id: string) {
    return apiFetch<RegistrationApplicationData>(`/registration-applications/${id}`);
  },

  // Update Application (Section 40)
  async updateApplication(id: string, data: Partial<RegistrationApplicationData>) {
    return apiFetch<RegistrationApplicationData>(`/registration-applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Submit Application (Section 11 & 40)
  async submitApplication(id: string) {
    return apiFetch<RegistrationApplicationData>(`/registration-applications/${id}/submit`, {
      method: "POST",
    });
  },

  // Resubmit Application Revision (POST /registration-applications/{id}/resubmit)
  async resubmitApplication(id: string, notes?: string) {
    return apiFetch<RegistrationApplicationData>(`/registration-applications/${id}/resubmit`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  // Upload Document (Section 16 & 40)
  async uploadDocument(applicationId: string, documentType: string, file: File) {
    const form = new FormData();
    form.append("documentType", documentType);
    form.append("file", file);

    return apiFetch<ApplicationDocument>(`/registration-applications/${applicationId}/documents`, {
      method: "POST",
      body: form,
    });
  },

  // Delete Document
  async deleteDocument(applicationId: string, documentId: string) {
    return apiFetch(`/registration-applications/${applicationId}/documents/${documentId}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================================
   ADMIN & CEO MONITORING / REVIEW CALLS
   ========================================================================= */

export const opsApi = {
  // Admin & CEO list applications (Section 14 & 15)
  async getApplications(filters: { status?: string; applicantType?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.applicantType) params.set("applicantType", filters.applicantType);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await apiFetch<any>(`/registration-applications${qs}`);
    if (res.data && !Array.isArray(res.data) && Array.isArray((res.data as any).items)) {
      return {
        ...res,
        data: (res.data as any).items as RegistrationApplicationData[],
      };
    }
    return res as ApiResponse<RegistrationApplicationData[]>;
  },

  // Get single application
  async getApplication(applicationId: string) {
    return apiFetch<RegistrationApplicationData>(`/registration-applications/${applicationId}`);
  },

  // Admin Review Application (Section 15)
  async reviewApplication(
    applicationId: string,
    action: "APPROVE" | "REJECT" | "REQUEST_REVISION",
    reviewNote?: string,
    revisionDocTypes?: string[]
  ) {
    return apiFetch<RegistrationApplicationData>(`/registration-applications/${applicationId}/review`, {
      method: "POST",
      body: JSON.stringify({
        action,
        decision: action,
        reviewNote,
        reason: reviewNote,
        revisionDocTypes,
        required_changes: revisionDocTypes,
      }),
    });
  },

  // Admin Review Document (Section 16)
  async reviewDocument(
    applicationId: string,
    documentId: string,
    status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "REPLACEMENT_REQUIRED",
    reviewNote?: string
  ) {
    return apiFetch(`/registration-applications/${applicationId}/documents/${documentId}/review`, {
      method: "POST",
      body: JSON.stringify({ status, reviewNote }),
    });
  },

  // CEO Monitoring Stats (Section 14)
  async getCeoMonitoringStats() {
    return apiFetch<{
      totalApplications: number;
      underReview: number;
      approved: number;
      revisionRequired: number;
      rejected: number;
    }>("/registration-applications-monitoring/stats");
  },

  // CEO Internal Team & Access (Section 25)
  async getInternalTeam() {
    return apiFetch<{
      stats: {
        adminOperations: number;
        financeOperations: number;
        customerSupport: number;
        totalStaff: number;
      };
      members: Array<{
        id: string;
        name: string;
        employeeId: string;
        role: string;
        email: string;
        phone: string;
        department: string;
        status: string;
        password?: string;
        createdAt?: string;
      }>;
    }>("/internal/team");
  },

  // CEO Add Staff Account (Section 25 & 26)
  async inviteStaff(data: {
    fullName: string;
    employeeId: string;
    email: string;
    phone?: string;
    role: "ADMIN_OPERATIONS" | "FINANCE_PAYMENT_OPS" | "CUSTOMER_SUPPORT";
    department?: string;
  }) {
    return apiFetch<{
      user: {
        id: string;
        fullName: string;
        email: string;
        role: string;
        employeeId: string;
        status: string;
      };
      invitationToken: string;
      invitationUrl: string;
    }>("/internal/team/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update Internal Staff Status (ACTIVE or SUSPENDED) (CEO)
  async updateStaffStatus(memberId: string, status: "ACTIVE" | "SUSPENDED") {
    return apiFetch<{ message: string; data: { id: string; name: string; status: string } }>(
      `/internal/team/${memberId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );
  },

  // Delete Registration Application (Admin)
  async deleteApplication(applicationId: string) {
    return apiFetch<{ message: string }>(`/registration-applications/${applicationId}`, {
      method: "DELETE",
    });
  },

  // Delete Internal Staff Account (CEO)
  async deleteStaff(memberId: string) {
    return apiFetch<{ message: string }>(`/internal/team/${memberId}`, {
      method: "DELETE",
    });
  },

  // CR-02 CEO-Exclusive Employee KYC Queue (V08)
  async getCeoVerifications() {
    const res = await apiFetch<any>("/ceo/identity/verifications");
    if (res.data && !Array.isArray(res.data) && Array.isArray((res.data as any).items)) {
      return {
        ...res,
        data: (res.data as any).items,
      };
    }
    return res;
  },

  // CR-02 CEO-Exclusive Employee KYC Decision (V09)
  async ceoKycDecision(
    id: string,
    decision: "VERIFY" | "REJECT" | "APPROVE" | "REQUEST_REVISION",
    reason?: string,
    lockVersion?: number
  ) {
    return apiFetch<{
      id: string;
      status: string;
      reviewed_by: string;
      reviewed_at: string;
    }>(`/ceo/identity/verifications/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        reason,
        lock_version: lockVersion,
      }),
    });
  },

  // Admin User Governance (S15, S16, S13, S14)
  async adminListUsers(params: { role?: string; status?: string; search?: string; page?: number } = {}) {
    const q = new URLSearchParams();
    if (params.role) q.set("role", params.role);
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await apiFetch<any>(`/admin/users${qs}`);
    if (res.data && Array.isArray((res.data as any).items)) {
      return {
        ...res,
        data: (res.data as any).items as Array<{
          user_id: string;
          name: string;
          email_masked?: string;
          status: string;
          roles: string[];
        }>,
      };
    }
    return res as ApiResponse<Array<{
      user_id: string;
      name: string;
      email_masked?: string;
      status: string;
      roles: string[];
    }>>;
  },

  async adminGetUser(id: string) {
    return apiFetch<any>(`/admin/users/${id}`);
  },

  async adminSuspendUser(id: string, reason: string) {
    return apiFetch<{ message: string; data?: any }>(`/admin/users/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async adminReactivateUser(id: string) {
    return apiFetch<{ message: string; data?: any }>(`/admin/users/${id}/reactivate`, {
      method: "POST",
    });
  },

  // Admin Sensitive Profile Change Review (P12, P13)
  async adminListChangeRequests() {
    const res = await apiFetch<any>("/admin/profiles/change-requests");
    if (res.data && Array.isArray((res.data as any).items)) {
      return {
        ...res,
        data: (res.data as any).items,
      };
    }
    return res;
  },

  async adminDecisionChangeRequest(id: string, decision: "APPROVE" | "REJECT", reason?: string) {
    return apiFetch<any>(`/admin/profiles/change-requests/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    });
  },
};

export interface ApiWorker {
  id: string;
  fullName: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  employeeId?: string;
  workerCode?: string;
  providerId?: string;
  providerName?: string;
  position?: string;
  skills: string[];
  specialization: string[];
  serviceDomain?: string;
  experienceYears?: number;
  availability?: {
    workingDays: string[];
    workingHours: string;
  };
  isOnline: boolean;
  rating: number;
  completedJobs: number;
  vehicleNumber?: string;
  capabilities: string[];
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

export const providerApi = {
  // Get all technicians belonging to provider (Section 5)
  async getWorkers() {
    const res = await apiFetch<any>("/provider/workers");
    const rawData = res.data;
    const items = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.workers)
          ? rawData.workers
          : [];
    return {
      ...res,
      data: items as ApiWorker[],
    };
  },

  // Invite Worker (Section 08.2 W03: POST /provider/worker-invitations)
  async inviteWorker(data: {
    fullName: string;
    email: string;
    phone: string;
    organization_id?: string;
    employeeId?: string;
  }) {
    return apiFetch<ApiWorker>("/provider/worker-invitations", {
      method: "POST",
      body: JSON.stringify({
        recipient_email: data.email,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        organization_id: data.organization_id,
        employeeId: data.employeeId,
      }),
    });
  },

  // Create new technician account and send invitation (Section 6 & 7 / Section 08.2 W03)
  async createWorker(data: {
    fullName: string;
    email: string;
    phone: string;
    employeeId?: string;
    position?: string;
    skills?: string[] | string;
    specialization?: string[] | string;
    serviceDomain?: string;
    experienceYears?: number;
    workingDays?: string[];
    workingHours?: string;
    vehicleNumber?: string;
    masterServiceIds?: string[];
    capabilities?: string[];
    organization_id?: string;
  }) {
    return apiFetch<ApiWorker>("/provider/worker-invitations", {
      method: "POST",
      body: JSON.stringify({
        recipient_email: data.email,
        ...data,
      }),
    });
  },

  // Get technician detail
  async getWorker(id: string) {
    return apiFetch<ApiWorker>(`/provider/workers/${id}`);
  },

  // Update technician profile or status
  async updateWorker(
    id: string,
    data: Partial<{
      position: string;
      skills: string[];
      specialization: string[];
      serviceDomain: string;
      experienceYears: number;
      availability: { workingDays: string[]; workingHours: string };
      isOnline: boolean;
      vehicleNumber: string;
      masterServiceIds: string[];
      capabilities: unknown[];
      status: string;
    }>
  ) {
    return apiFetch<ApiWorker>(`/provider/workers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Deactivate technician (W08)
  async deactivateWorker(id: string) {
    return apiFetch<{ message: string; data?: any }>(`/provider/workers/${id}/deactivate`, {
      method: "POST",
    });
  },
};

/* =========================================================================
   CANONICAL PROVIDER MASTER SERVICE API (Level 05 Section 25 & 28)
   ========================================================================= */

export interface ApiProviderMasterService {
  id: string;
  _id?: string;
  providerId: string;
  providerName: string;
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  subcategoryId: string;
  subcategoryName: string;
  subcategoryCode: string;
  name: string;
  normalizedName?: string;
  description?: string;
  priceMin: number;
  priceMax: number;
  surveyFee?: number;
  serviceMethods: string[];
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  availability?: "AVAILABLE" | "UNAVAILABLE";
  warrantyConfig?: {
    warrantyEnabled: boolean;
    durationDays: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const providerServiceApi = {
  // GET /api/v1/provider/services
  async list(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await apiFetch<any>(`/provider/services${qs}`);
    const rawData = res.data;
    const items = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.services)
          ? rawData.services
          : [];
    return {
      ...res,
      data: items as ApiProviderMasterService[],
    };
  },

  // GET /api/v1/provider/services/{id}
  async get(id: string) {
    return apiFetch<ApiProviderMasterService>(`/provider/services/${id}`);
  },

  // POST /api/v1/provider/services
  async create(data: {
    categoryId: string;
    categoryName?: string;
    subcategoryId: string;
    subcategoryName?: string;
    name: string;
    description?: string;
    priceMin: number;
    priceMax: number;
    surveyFee?: number;
    serviceMethods?: string[];
    status?: "ACTIVE" | "INACTIVE" | "DRAFT";
    availability?: "AVAILABLE" | "UNAVAILABLE";
    warrantyConfig?: { warrantyEnabled: boolean; durationDays: number };
  }) {
    return apiFetch<{ message: string; data: ApiProviderMasterService }>("/provider/services", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/v1/provider/services/{id}
  async update(
    id: string,
    data: Partial<{
      categoryId: string;
      subcategoryId: string;
      name: string;
      description: string;
      priceMin: number;
      priceMax: number;
      surveyFee: number;
      serviceMethods: string[];
      status: "ACTIVE" | "INACTIVE" | "DRAFT";
      availability: "AVAILABLE" | "UNAVAILABLE";
      warrantyConfig: { warrantyEnabled: boolean; durationDays: number };
    }>
  ) {
    return apiFetch<{ message: string; data: ApiProviderMasterService }>(`/provider/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export interface ApiCatalogService {
  id: string;
  name: string;
  title: string;
  description: string;
  shortDescription: string;
  providerId: string;
  providerName: string;
  isVerifiedProvider: boolean;
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  subcategoryId: string;
  subcategoryName: string;
  subcategoryCode: string;
  priceMin: number;
  priceMax: number;
  basePrice: number;
  pricingModel: string;
  surveyFee: number;
  serviceMethods: string[];
  serviceModes: string[];
  status: string;
  availability?: "AVAILABLE" | "UNAVAILABLE";
  warrantyConfig: {
    warrantyEnabled: boolean;
    durationDays: number;
  };
  warrantyDays: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl?: string | null;
  createdAt?: string | null;
}

export const publicCatalogApi = {
  // GET /api/v1/services/catalog
  async getCatalog(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<ApiCatalogService[]>(`/services/catalog${qs}`);
  },

  // GET /api/v1/services/catalog/{id}
  async getDetail(id: string) {
    return apiFetch<ApiCatalogService>(`/services/catalog/${id}`);
  },
};

/* =========================================================================
   ROLE ASSIGNMENT & SCOPE API (Level 02 Section 36)
   ========================================================================= */

export interface ApiRoleAssignment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  roleId: string;
  roleCode: string;
  roleName?: string;
  scopeType: string;
  scopeId?: string | null;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "EXPIRED" | "REVOKED";
  active: boolean;
  assignedBy?: string | null;
  assignedAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string | null;
}

export const roleAssignmentApi = {
  // List role assignments
  async list(userId?: string) {
    const q = userId ? `?userId=${userId}` : "";
    return apiFetch<ApiRoleAssignment[]>(`/role-assignments${q}`);
  },

  // Assign role to user
  async create(data: {
    userId: string;
    role: string;
    scopeType?: string;
    scopeId?: string;
    startsAt?: string;
    endsAt?: string;
  }) {
    return apiFetch<{
      message: string;
      data: {
        id: string;
        userId: string;
        roleCode: string;
        scopeType: string;
        status: string;
        active: boolean;
      };
    }>("/role-assignments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Lifecycle state transition
  async updateStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REVOKED") {
    return apiFetch<{
      message: string;
      data: {
        id: string;
        status: string;
        active: boolean;
        revokedAt?: string | null;
      };
    }>(`/role-assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

/* =========================================================================
   CANONICAL SERVICE ORDERS & RESOURCE AUTHORIZATION API (Level 02 Section 37)
   ========================================================================= */

export interface ApiServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  providerId?: string;
  workerId?: string;
  serviceName: string;
  serviceCategory?: string;
  state: "REQUESTED" | "ACCEPTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETION_PENDING" | "COMPLETED" | "DISPUTED";
  totalAmount?: number;
  notes?: string;
  completedAt?: string;
  createdAt?: string;
}

export const serviceOrderApi = {
  // List orders (filtered by active role & scope on backend)
  async list() {
    return apiFetch<ApiServiceOrder[]>("/service-orders");
  },

  // Create booking (Customer)
  async create(data: {
    providerMasterServiceId?: string;
    serviceName?: string;
    serviceCategory?: string;
    categoryId?: string;
    subcategoryId?: string;
    providerId?: string;
    totalAmount?: number;
    notes?: string;
    address?: { street: string; city: string; notes?: string };
    scheduledDate?: string;
    scheduledTimeSlot?: string;
  }) {
    return apiFetch<{ message: string; data: ApiServiceOrder }>("/service-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get order detail (Resource authorized)
  async get(id: string) {
    return apiFetch<ApiServiceOrder>(`/service-orders/${id}`);
  },

  // Provider accept
  async accept(id: string) {
    return apiFetch<{ message: string; data: ApiServiceOrder }>(`/service-orders/${id}/accept`, {
      method: "POST",
    });
  },

  // Provider assign worker
  async assign(id: string, workerId: string) {
    return apiFetch<{ message: string; data: ApiServiceOrder }>(`/service-orders/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ workerId }),
    });
  },

  // Customer confirm completion (Business state guarded: COMPLETION_PENDING)
  async confirmCompletion(id: string) {
    return apiFetch<{ message: string; data: ApiServiceOrder }>(`/service-orders/${id}/confirm-completion`, {
      method: "POST",
    });
  },
};

/* =========================================================================
   LEVEL 03 - PROFILE, ORGANIZATION, MEMBERSHIP & PARTNERSHIPS
   ========================================================================= */

export interface ApiPersonalProfile {
  id: string;
  userId: string;
  displayName: string;
  fullName: string;
  avatar?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  preferences?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiAddress {
  id: string;
  ownerType: "USER" | "ORGANIZATION";
  ownerId: string;
  label: string;
  recipientName?: string;
  phone?: string;
  addressLine: string;
  province?: string;
  city: string;
  district?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  status: string;
  createdAt?: string;
}

export interface ApiContact {
  id: string;
  organizationId: string;
  type: "EMAIL" | "PHONE" | "WHATSAPP";
  label: string;
  value: string;
  isPrimary: boolean;
  status: string;
  verifiedAt?: string | null;
}

export interface ApiMembership {
  id: string;
  userId: string;
  organizationId: string;
  membershipType: "OWNER" | "MANAGER" | "STAFF" | "WORKER" | "MEMBER";
  status: "INVITED" | "PENDING" | "ACTIVE" | "SUSPENDED" | "REMOVED";
  joinedAt?: string | null;
  endedAt?: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    role?: string;
    employeeId?: string;
  } | null;
}

export interface ApiOrganization {
  id: string;
  organizationCode: string;
  name: string;
  type: "SERVICE_PROVIDER" | "MERCHANT" | "SUPPLIER";
  status: string;
  ownerUserId: string;
  profile?: {
    id?: string;
    organizationId?: string;
    legalName?: string;
    brandName?: string;
    description?: string;
    businessType?: string;
    registrationNumber?: string;
    taxInformation?: Record<string, unknown>;
    website?: string;
    logo?: string;
    verificationStatus?: string;
  } | null;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiPartnership {
  id: string;
  organizationAId: string;
  organizationBId: string;
  organizationPairKey: string;
  partnershipType: string;
  status: "REQUESTED" | "ACCEPTED" | "REJECTED" | "SUSPENDED" | "TERMINATED";
  initiatedByUserId?: string;
  approvedByUserId?: string;
  requestedAt?: string;
  approvedAt?: string | null;
  endedAt?: string | null;
  metadata?: Record<string, unknown>;
  organizationA?: {
    id: string;
    name: string;
    type: string;
    organizationCode: string;
  } | null;
  organizationB?: {
    id: string;
    name: string;
    type: string;
    organizationCode: string;
  } | null;
}

export const profileApi = {
  async getProfile() {
    return apiFetch<ApiPersonalProfile>("/me/profile");
  },

  async updateProfile(data: Partial<ApiPersonalProfile>) {
    return apiFetch<{ message: string; data: ApiPersonalProfile }>("/me/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async getAddresses() {
    return apiFetch<ApiAddress[]>("/me/addresses");
  },

  async createAddress(data: {
    label: string;
    recipientName?: string;
    phone?: string;
    addressLine: string;
    province?: string;
    city: string;
    district?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    return apiFetch<{ message: string; data: ApiAddress }>("/me/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAddress(addressId: string, data: Partial<ApiAddress>) {
    return apiFetch<{ message: string; data: ApiAddress }>(`/me/addresses/${addressId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteAddress(addressId: string) {
    return apiFetch<{ message: string }>(`/me/addresses/${addressId}`, {
      method: "DELETE",
    });
  },

  // Upload User Personal Avatar (P11)
  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ photo_url?: string; avatar_url?: string; message: string }>("/profiles/me/avatar", {
      method: "POST",
      body: formData,
    });
  },

  // Request Sensitive Business Legal Field Change (P03 - NIB / NPWP only)
  async requestSensitiveChange(data: {
    target_type?: "USER" | "ORGANIZATION";
    target_id?: string;
    fields: Record<string, string>;
    reason: string;
  }) {
    return apiFetch<{ id: string; status: string }>("/profiles/change-requests", {
      method: "POST",
      body: JSON.stringify({
        target_type: data.target_type || "ORGANIZATION",
        target_id: data.target_id || "org-self",
        fields: data.fields,
        reason: data.reason,
      }),
    });
  },

  // Get Detail of Sensitive Change Request (P04)
  async getChangeRequest(id: string) {
    return apiFetch<any>(`/profiles/change-requests/${id}`);
  },
};

export const organizationApi = {
  async getOrganization(id: string) {
    return apiFetch<ApiOrganization>(`/organizations/${id}`);
  },

  async updateOrganization(id: string, data: {
    name?: string;
    legalName?: string;
    brandName?: string;
    description?: string;
    businessType?: string;
    registrationNumber?: string;
    taxInformation?: Record<string, unknown>;
    website?: string;
    logo?: string;
    address?: any;
    business_email?: string;
    business_phone?: string;
    operational_status?: string;
    operationalStatus?: string;
    operational_hours?: any;
    operationalHours?: any;
    service_area?: any;
    serviceArea?: any;
    competencies?: any;
  }) {
    return apiFetch<{ message: string; data: ApiOrganization }>(`/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async updateOperationalStatus(id: string, status: "ONLINE_ACCEPTING" | "BUSY_DELAYED" | "TEMPORARY_CLOSED" | string) {
    return apiFetch<{ message: string; data: any }>(`/organizations/${id}/operational-status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async getAddresses(orgId: string) {
    return apiFetch<ApiAddress[]>(`/organizations/${orgId}/addresses`);
  },

  async createAddress(orgId: string, data: {
    label: string;
    recipientName?: string;
    phone?: string;
    addressLine: string;
    province?: string;
    city: string;
    district?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    return apiFetch<{ message: string; data: ApiAddress }>(`/organizations/${orgId}/addresses`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAddress(orgId: string, addressId: string, data: Partial<ApiAddress>) {
    return apiFetch<{ message: string; data: ApiAddress }>(`/organizations/${orgId}/addresses/${addressId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteAddress(orgId: string, addressId: string) {
    return apiFetch<{ message: string }>(`/organizations/${orgId}/addresses/${addressId}`, {
      method: "DELETE",
    });
  },

  async getContacts(orgId: string) {
    return apiFetch<ApiContact[]>(`/organizations/${orgId}/contacts`);
  },

  async createContact(orgId: string, data: {
    type: "EMAIL" | "PHONE" | "WHATSAPP";
    label?: string;
    value: string;
    isPrimary?: boolean;
  }) {
    return apiFetch<{ message: string; data: ApiContact }>(`/organizations/${orgId}/contacts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateContact(orgId: string, contactId: string, data: Partial<ApiContact>) {
    return apiFetch<{ message: string; data: ApiContact }>(`/organizations/${orgId}/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteContact(orgId: string, contactId: string) {
    return apiFetch<{ message: string }>(`/organizations/${orgId}/contacts/${contactId}`, {
      method: "DELETE",
    });
  },

  async getMembers(orgId: string) {
    return apiFetch<ApiMembership[]>(`/organizations/${orgId}/members`);
  },

  async inviteMember(orgId: string, data: {
    email: string;
    fullName?: string;
    phone?: string;
    membershipType?: string;
  }) {
    return apiFetch<{ message: string; data: { membership: ApiMembership; invitationUrl?: string } }>(
      `/organizations/${orgId}/members/invitations`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  async updateMember(orgId: string, membershipId: string, data: {
    status?: "ACTIVE" | "SUSPENDED" | "REMOVED";
    membershipType?: string;
  }) {
    return apiFetch<{ message: string; data: ApiMembership }>(
      `/organizations/${orgId}/members/${membershipId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },

  // Level 08: Organization Coverage
  async getCoverage(orgId: string) {
    return apiFetch<{
      coverageRadiusKm: number | null;
      serviceAreas: Array<{ type: string; code: string; name: string }>;
      status: "COVERED" | "NOT_CONFIGURED" | string;
    }>(`/organizations/${orgId}/coverage`);
  },

  async updateCoverage(orgId: string, data: {
    coverageRadiusKm?: number;
    serviceAreas?: Array<{ type: string; code: string; name: string } | string>;
  }) {
    return apiFetch<{
      message: string;
      data: {
        coverageRadiusKm: number | null;
        serviceAreas: Array<{ type: string; code: string; name: string }>;
      };
    }>(`/organizations/${orgId}/coverage`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Level 08: Organization Availability
  async getAvailability(orgId: string) {
    return apiFetch<{
      status: "AVAILABLE" | "UNAVAILABLE";
      updatedAt?: string;
      updatedBy?: string;
    }>(`/organizations/${orgId}/availability`);
  },

  async updateAvailability(orgId: string, status: "AVAILABLE" | "UNAVAILABLE") {
    return apiFetch<{
      message: string;
      data: {
        status: "AVAILABLE" | "UNAVAILABLE";
        updatedAt: string;
        updatedBy?: string;
      };
    }>(`/organizations/${orgId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // Level 08: Organization Schedule
  async getSchedule(orgId: string) {
    return apiFetch<{
      ownerType: string;
      ownerId: string;
      timezone: string;
      weeklyHours: Array<{
        day: string;
        isOpen: boolean;
        windows: Array<{ start: string; end: string }>;
      }>;
      exceptions: Array<{
        date: string;
        isOpen: boolean;
        windows: Array<{ start: string; end: string }>;
        reason?: string;
      }>;
    }>(`/organizations/${orgId}/schedule`);
  },

  async updateSchedule(orgId: string, data: {
    timezone?: string;
    weeklyHours?: Array<{
      day: string;
      isOpen: boolean;
      windows: Array<{ start: string; end: string }>;
    }>;
    exceptions?: Array<{
      date: string;
      isOpen: boolean;
      windows: Array<{ start: string; end: string }>;
      reason?: string;
    }>;
  }) {
    return apiFetch<{
      message: string;
      data: any;
    }>(`/organizations/${orgId}/schedule`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export const partnershipApi = {
  async getPartnerships(filters?: { status?: string; partnershipType?: string }) {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.partnershipType) params.set("partnershipType", filters.partnershipType);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<ApiPartnership[]>(`/partnerships${qs}`);
  },

  async requestPartnership(data: {
    targetOrganizationId: string;
    organizationAId?: string;
    partnershipType?: string;
    scope?: string;
    notes?: string;
    productCategories?: string[];
  }) {
    return apiFetch<{ message: string; data: ApiPartnership }>("/partnerships", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updatePartnership(id: string, data: {
    status: "ACCEPTED" | "REJECTED" | "SUSPENDED" | "TERMINATED";
    notes?: string;
  }) {
    return apiFetch<{ message: string; data: ApiPartnership }>(`/partnerships/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

/* =========================================================================
   LEVEL 04 - INTERNAL ACCOUNT & ONBOARDING
   ========================================================================= */

export interface InternalEmployment {
  id: string;
  employeeId: string;
  department: string;
  position: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" | string;
  startDate?: string | null;
  endDate?: string | null;
  managerUserId?: string | null;
  status: "PENDING_START" | "ACTIVE" | "SUSPENDED" | "OFFBOARDED";
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface OnboardingTask {
  id: string;
  code: string;
  title: string;
  description: string;
  required: boolean;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "WAIVED" | "BLOCKED";
  completedAt?: string | null;
  metadata?: Record<string, any>;
}

export interface OperationalReadiness {
  ready: boolean;
  status: "READY" | "NOT_READY";
  reason: string;
  checks: {
    accountActive: boolean;
    membershipActive: boolean;
    roleAssignmentValid: boolean;
    employmentActive: boolean;
    onboardingCompleted: boolean;
  };
}

export interface InternalOnboarding {
  id: string;
  userId: string;
  employmentId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "CANCELLED";
  progress: number;
  startedAt?: string | null;
  completedAt?: string | null;
  blockedReason?: string | null;
  tasks: OnboardingTask[];
  employment?: {
    id?: string;
    employeeId?: string;
    department?: string;
    position?: string;
    employmentType?: string;
    startDate?: string | null;
    status?: string;
  } | null;
  profile?: {
    id?: string;
    displayName?: string;
    bio?: string;
    avatar?: string;
    gender?: string;
    dateOfBirth?: string | null;
  } | null;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    nik?: string;
    ktpFilePath?: string;
    emergencyContact?: {
      name?: string;
      phone?: string;
    } | null;
  } | null;
  readiness?: OperationalReadiness | null;
}

export interface InternalAccountSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  employeeId: string;
  role: {
    code: string;
    name: string;
  };
  department: string;
  position: string;
  employmentType?: string;
  startDate?: string | null;
  accountStatus: string;
  employmentStatus: "INVITED" | "PENDING" | "PENDING_START" | "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | string;
  onboardingStatus: "INVITED" | "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "REVISION_REQUIRED" | "REJECTED" | "COMPLETED" | "BLOCKED" | "CANCELLED" | string;
  readiness: "READY" | "NOT_READY" | string;
  readinessReason?: string;
  password?: string | null;
  password_status?: "PENDING_INVITATION" | "CREATED" | string;
  password_label?: string;
  createdAt?: string | null;
}

export interface InternalAccountDetail {
  identity: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    status: string;
    password?: string | null;
    password_status?: "PENDING_INVITATION" | "CREATED" | string;
    password_label?: string;
    createdAt?: string | null;
    nik?: string;
    ktpFilePath?: string;
    emergencyContact?: {
      name?: string;
      phone?: string;
    } | null;
  };
  profile?: {
    displayName: string;
    bio?: string | null;
    avatar?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
  } | null;
  role: {
    code: string;
    name: string;
    assignmentId?: string | null;
    assignmentStatus?: string | null;
  };
  membership?: {
    id: string;
    organizationId: string;
    membershipType: string;
    status: string;
  } | null;
  employment?: InternalEmployment | null;
  onboarding?: InternalOnboarding | null;
  readiness: OperationalReadiness;
}

export const internalAccountApi = {
  // GET /api/v1/internal/accounts
  async getAccounts(filters?: {
    role?: string;
    department?: string;
    employmentStatus?: string;
    onboardingStatus?: string;
    readiness?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.role) params.set("role", filters.role);
    if (filters?.department) params.set("department", filters.department);
    if (filters?.employmentStatus) params.set("employmentStatus", filters.employmentStatus);
    if (filters?.onboardingStatus) params.set("onboardingStatus", filters.onboardingStatus);
    if (filters?.readiness) params.set("readiness", filters.readiness);
    if (filters?.search) params.set("search", filters.search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<{ stats: Record<string, number>; accounts: InternalAccountSummary[] }>(
      `/internal/accounts${qs}`
    );
  },

  // POST /api/v1/internal/accounts
  async createAccount(data: {
    fullName: string;
    email: string;
    phone?: string;
    employeeId?: string;
    roleCode: string;
    department?: string;
    position?: string;
    employmentType?: string;
    startDate?: string;
    managerUserId?: string;
  }) {
    const payload = {
      ...data,
      name: data.fullName,
      role: data.roleCode,
      employee_id: data.employeeId,
      department: data.department || "Operations",
    };
    return apiFetch<{
      account: InternalAccountSummary;
      invitationToken: string;
      invitationUrl: string;
      employeeId?: string;
      employee_id?: string;
    }>("/internal/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // GET /api/v1/internal/accounts/{id}
  async getAccount(id: string) {
    const res = await apiFetch<any>(`/internal/accounts/${id}`);
    const raw = res.data;
    if (raw && !raw.identity) {
      const roleObj = typeof raw.role === "object" && raw.role ? raw.role : { code: raw.role || raw.roleCode || "STAFF", name: raw.role || raw.roleCode || "STAFF" };
      return {
        ...res,
        data: {
          identity: {
            id: raw.id,
            fullName: raw.fullName || raw.name || "Staf Internal",
            email: raw.email,
            phone: raw.phone || "",
            status: raw.status || "ACTIVE",
            password: raw.password,
            createdAt: raw.createdAt,
            nik: raw.nik,
            ktpFilePath: raw.ktpFilePath,
            emergencyContact: null,
          },
          profile: {
            displayName: raw.fullName || raw.name || "Staf Internal",
            bio: null,
            avatar: raw.avatar || raw.photo_path || null,
            gender: raw.gender || null,
            dateOfBirth: raw.dateOfBirth || raw.birth_date || null,
          },
          role: roleObj,
          membership: null,
          employment: {
            id: "emp-" + raw.id,
            employeeId: raw.employeeId,
            department: raw.department || "Operations",
            position: raw.position || roleObj.code,
            employmentType: raw.employmentType || "FULL_TIME",
            startDate: raw.startDate,
            status: raw.status,
          },
          onboarding: {
            id: "onb-" + raw.id,
            status: raw.onboardingStatus || "COMPLETED",
            progress: raw.onboardingStatus === "COMPLETED" ? 100 : 50,
            tasks: [],
          },
          readiness: {
            ready: raw.readiness === "READY",
            status: raw.readiness || "READY",
            reason: raw.readiness === "READY" ? "Siap operasional" : "Dalam proses",
            checks: {
              accountActive: raw.status === "ACTIVE",
              membershipActive: true,
              roleAssignmentValid: true,
              employmentActive: true,
              onboardingCompleted: raw.onboardingStatus === "COMPLETED",
            },
          },
        } as unknown as InternalAccountDetail,
      };
    }
    return res as { data: InternalAccountDetail; message?: string };
  },

  // GET /api/v1/internal/accounts/{id}/invitation-link
  async getInvitationLink(id: string) {
    return apiFetch<{
      user_id: string;
      staff_id: string;
      name: string;
      email: string;
      role: string;
      invitation_token: string;
      invitation_url: string;
      expires_at: string;
      status: string;
    }>(`/internal/accounts/${id}/invitation-link`);
  },

  // POST /api/v1/internal/accounts/{id}/resend-invitation
  async resendInvitation(id: string) {
    return apiFetch<{
      user_id: string;
      staff_id: string;
      email: string;
      invitation_token: string;
      invitation_url: string;
      expires_at: string;
      delivery: {
        success: boolean;
        message_id?: string;
        state?: string;
      };
    }>(`/internal/accounts/${id}/resend-invitation`, {
      method: "POST",
    });
  },

  // POST /api/v1/internal/accounts/{id}/cancel-invitation
  async cancelInvitation(id: string) {
    return apiFetch<{
      user_id: string;
      status: string;
      message: string;
    }>(`/internal/accounts/${id}/cancel-invitation`, {
      method: "POST",
    });
  },

  // PATCH /api/v1/internal/accounts/{id}/employment
  async updateEmployment(
    id: string,
    data: {
      department?: string;
      position?: string;
      employmentType?: string;
      startDate?: string;
      managerUserId?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return apiFetch<{ message: string; data: InternalEmployment }>(
      `/internal/accounts/${id}/employment`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },

  // GET /api/v1/internal/accounts/{id}/onboarding
  async getOnboarding(id: string = "me") {
    return apiFetch<InternalOnboarding>(`/internal/accounts/${id}/onboarding`);
  },

  // PATCH /api/v1/internal/accounts/{id}/onboarding/tasks/{taskId}
  async completeTask(
    id: string = "me",
    taskId: string,
    action: string = "COMPLETE",
    payload?: Record<string, unknown>
  ) {
    return apiFetch<InternalOnboarding>(
      `/internal/accounts/${id}/onboarding/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action, payload }),
      }
    );
  },

  // POST /api/v1/internal/accounts/{id}/onboarding/complete
  async completeOnboarding(id: string = "me") {
    return apiFetch<InternalOnboarding>(
      `/internal/accounts/${id}/onboarding/complete`,
      {
        method: "POST",
      }
    );
  },

  // POST /api/v1/internal/accounts/{id}/employment/suspend
  async suspendEmployment(id: string, reason?: string) {
    return apiFetch<InternalEmployment>(
      `/internal/accounts/${id}/employment/suspend`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  },

  // POST /api/v1/internal/accounts/{id}/employment/offboard
  async offboardEmployment(id: string, reason?: string) {
    return apiFetch<InternalEmployment>(
      `/internal/accounts/${id}/employment/offboard`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  },

  // DELETE /api/v1/internal/accounts/{id}
  async deleteAccount(id: string) {
    return apiFetch<{ message: string }>(`/internal/accounts/${id}`, {
      method: "DELETE",
    });
  },

  // CR-03 Staff Onboarding Specific Endpoints
  // GET /api/v1/staff/onboarding/me
  async getMyOnboarding() {
    return apiFetch<{
      id: string;
      user_id: string;
      status: string;
      onboarding_status: string;
      revision_notes?: string | null;
      rejection_reason?: string | null;
      progress: number;
      readiness: "READY" | "NOT_READY";
      readiness_status: "READY" | "NOT_READY";
      employee: {
        employee_id: string;
        email: string;
        role: string;
        role_name: string;
        department: string;
        position: string;
      };
      profile: {
        display_name: string;
        legal_name: string;
        gender?: string;
        birth_date?: string;
        phone: string;
        photo_path?: string;
      };
      berkas: {
        nik?: string;
        nik_masked?: string;
        verification_status: string;
        document_count: number;
        ktp_url?: string;
        documents: Array<{ id: string; type: string; mime: string; size_bytes: number; download_url?: string; preview_url?: string }>;
      };
      steps: Array<{
        id: string;
        key: string;
        code: string;
        title: string;
        status: string;
        completed: boolean;
        document_version?: string;
        evidence_document_id?: string;
        completed_at?: string;
      }>;
    }>("/staff/onboarding/me");
  },

  // PATCH /api/v1/staff/onboarding/profile
  async completeProfileStep(data: {
    display_name: string;
    legal_name?: string;
    gender?: string;
    birth_date?: string;
    phone?: string;
    photo_path?: string;
  }) {
    return apiFetch<{
      step: string;
      status: string;
      profile: {
        display_name: string;
        legal_name: string;
        gender?: string;
        birth_date?: string;
        phone: string;
        photo_path?: string;
      };
    }>("/staff/onboarding/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/staff/onboarding/kyc (Pengecekan Berkas)
  async completeKycStep(data: { nik?: string; file?: File; document_id?: string } | FormData) {
    if (data instanceof FormData) {
      return apiFetch<{
        step: string;
        label: string;
        status: string;
        nik_masked: string;
        verification_request_id: string;
      }>("/staff/onboarding/kyc", {
        method: "POST",
        body: data,
      });
    }

    const formData = new FormData();
    if (data.nik) formData.append("nik", data.nik);
    if (data.file) formData.append("file", data.file);
    if (data.document_id) formData.append("document_id", data.document_id);

    return apiFetch<{
      step: string;
      label: string;
      status: string;
      nik_masked: string;
      verification_request_id: string;
    }>("/staff/onboarding/kyc", {
      method: "POST",
      body: formData,
    });
  },

  // POST /api/v1/staff/onboarding/nda
  async completeNdaStep(data: { nda_version: string; accepted: boolean }) {
    return apiFetch<{
      step: string;
      status: string;
      nda_version: string;
      completed_at: string;
    }>("/staff/onboarding/nda", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/staff/onboarding/confirm-access
  async confirmAccessStep(data: { accepted: boolean; acknowledged_permission_version?: number }) {
    return apiFetch<{
      step: string;
      status: string;
      message: string;
    }>("/staff/onboarding/confirm-access", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/staff/onboarding/submit
  async submitOnboarding() {
    return apiFetch<{
      id: string;
      status: string;
      message: string;
    }>("/staff/onboarding/submit", {
      method: "POST",
    });
  },
};

/* =========================================================================
   LEVEL 05: GOVERNANCE & POLICY API CLIENTS
   ========================================================================= */

export interface ApiPolicyDefinition {
  _id: string;
  code: string;
  domain: string;
  policyType: string;
  name: string;
  description?: string;
  ownerRole?: string;
  approvalRole?: string;
  scope?: { type: string; id: string | null };
  status: string;
  currentVersionId?: string;
  currentVersion?: ApiPolicyVersion;
  versions?: ApiPolicyVersion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiPolicyVersion {
  _id: string;
  policyDefinitionId: string;
  version: string;
  status: string;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  scope?: { type: string; id: string | null };
  configuration: Record<string, unknown>;
  configurationDigest?: string;
  immutable?: boolean;
  createdBy?: string;
  createdAt?: string;
}

export interface ApiPolicyProposal {
  _id: string;
  id?: string;
  proposalCode: string;
  policyDefinitionId: string;
  policyDefinition?: ApiPolicyDefinition;
  baseVersionId?: string | null;
  proposedVersionId?: string | null;
  proposedVersion?: ApiPolicyVersion;
  status: string;
  submittedBy?: string;
  submittedAt?: string;
  proposedBy?: string;
  effectiveFrom?: string;
  reason: string;
  notes?: string | null;
  proposedConfiguration: Record<string, unknown>;
  impactPreview?: Record<string, unknown>;
  proposalType?: "SINGLE" | "COMBINED_AFFILIATE_PACKAGE";
  policyType?: string;
  currentValue?: number;
  proposedValue?: number;
  difference?: number;
  unit?: string;
  rejectionReason?: string | null;
  submitterName?: string;
  atomicGroupId?: string | null;
  packageProposals?: ApiPolicyProposal[];
  approvals?: Array<{
    _id: string;
    decision: string;
    decidedBy: string;
    decidedAt: string;
    reason?: string | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTaxonomyCategory {
  _id: string;
  id?: string;
  code: string;
  name: string;
  normalizedName?: string;
  description?: string;
  status: string;
  iconName?: string;
  sortOrder?: number;
  subcategories?: ApiTaxonomySubcategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTaxonomySubcategory {
  _id: string;
  id?: string;
  categoryId: string;
  category?: ApiTaxonomyCategory;
  code: string;
  name: string;
  normalizedName?: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTaxonomyRequest {
  _id: string;
  requestCode: string;
  domain: string;
  requestType: string;
  providerOrganizationId: string;
  requestedCategoryId: string;
  category?: ApiTaxonomyCategory;
  requestedName: string;
  normalizedName?: string;
  reason: string;
  notes?: string | null;
  status: string;
  adminReview?: {
    reviewedBy?: string;
    reviewedAt?: string;
    decision?: string;
    reason?: string | null;
  } | null;
  ceoReview?: {
    reviewedBy?: string;
    reviewedAt?: string;
    decision?: string;
    reason?: string | null;
  } | null;
  publishedSubcategoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTaxonomyAnalytics {
  period: string;
  totalCategories: number;
  totalSubcategories: number;
  totalProviderMasterServices: number;
  activeProviders: number;
  validServiceOrders: number;
  pendingRequests: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryCode: string;
    categoryName: string;
    subcategoryCount: number;
    masterServiceCount: number;
    orderVolume: number;
    status: string;
  }>;
  generatedAt: string;
}

export const governanceApi = {
  // GET /api/v1/governance/policies
  async getPolicies(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<ApiPolicyDefinition[]>(`/governance/policies${qs}`);
  },

  // GET /api/v1/governance/policies/{id}
  async getPolicy(id: string) {
    return apiFetch<ApiPolicyDefinition>(`/governance/policies/${id}`);
  },

  // GET /api/v1/governance/policies/{id}/versions
  async getPolicyVersions(id: string) {
    return apiFetch<ApiPolicyVersion[]>(`/governance/policies/${id}/versions`);
  },

  // GET /api/v1/governance/policies/effective
  async getEffectivePolicy(type: string, atDate?: string, scopeType?: string, scopeId?: string) {
    const params: Record<string, string> = { type };
    if (atDate) params.atDate = atDate;
    if (scopeType) params.scopeType = scopeType;
    if (scopeId) params.scopeId = scopeId;
    const qs = "?" + new URLSearchParams(params).toString();
    return apiFetch<Record<string, unknown>>(`/governance/policies/effective${qs}`);
  },

  // GET /api/v1/governance/proposals
  async getProposals(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<ApiPolicyProposal[]>(`/governance/proposals${qs}`);
  },

  // GET /api/v1/governance/proposals/{id}
  async getProposal(id: string) {
    return apiFetch<ApiPolicyProposal>(`/governance/proposals/${id}`);
  },

  // GET /api/v1/governance/policies/effective?policyType=TAX (System Tax V2)
  async getEffectiveTaxPolicy(atDate?: string) {
    const qs = atDate ? `?policyType=TAX&atDate=${encodeURIComponent(atDate)}` : "?policyType=TAX";
    return apiFetch<{
      status: "NOT_USED" | "USED";
      taxStatus: "NOT_USED" | "USED";
      taxType: string;
      calculationType: string;
      rate: number | null;
      taxBasis: string;
      activeRule: string;
      effectiveFrom?: string | null;
      version?: string | null;
      configurationDigest?: string;
      configuration?: {
        status?: "NOT_USED" | "USED";
        rate?: number | null;
        taxType?: string;
        calculationType?: string;
        taxBasis?: string;
        enabled?: boolean;
      };
    }>(`/governance/policies/effective${qs}`);
  },

  // POST /api/v1/governance/proposals
  async createProposal(data: {
    proposalType?: "SINGLE" | "COMBINED_AFFILIATE_PACKAGE";
    policyDefinitionId?: string;
    policyType?: string;
    proposedConfiguration?: Record<string, unknown>;
    configuration?: Record<string, unknown>;
    effectiveFrom: string;
    reason: string;
    notes?: string;
    impactPreview?: Record<string, unknown>;
    atomicGroupId?: string;
    affiliateFee?: { value: number; calculationType?: string; currency?: string };
    providerReward?: { value: number; calculationType?: string; currency?: string };
    workerReward?: { value: number; calculationType?: string; currency?: string };
  }) {
    return apiFetch<ApiPolicyProposal>("/governance/proposals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/governance/proposals (Tax Proposal Helper)
  async createTaxProposal(data: {
    effectiveFrom: string;
    reason: string;
    notes?: string;
    rate: number;
    taxType?: string;
    taxBasis?: string;
    calculationType?: string;
  }) {
    return apiFetch<ApiPolicyProposal>("/governance/proposals", {
      method: "POST",
      body: JSON.stringify({
        policyType: "TAX",
        effectiveFrom: data.effectiveFrom,
        reason: data.reason,
        notes: data.notes,
        configuration: {
          enabled: true,
          status: "USED",
          taxType: data.taxType || "PPN",
          calculationType: data.calculationType || "PERCENTAGE",
          rate: data.rate,
          taxBasis: data.taxBasis || "SERVICE_PRICE",
        },
      }),
    });
  },

  // PATCH /api/v1/governance/proposals/{id}
  async updateProposal(id: string, data: Partial<{
    proposedConfiguration: Record<string, unknown>;
    effectiveFrom: string;
    reason: string;
    notes?: string;
    impactPreview?: Record<string, unknown>;
  }>) {
    return apiFetch<ApiPolicyProposal>(`/governance/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/governance/proposals/{id}/submit
  async submitProposal(id: string) {
    return apiFetch<{ proposalId: string; status: string; submittedAt: string }>(
      `/governance/proposals/${id}/submit`,
      { method: "POST" }
    );
  },

  // POST /api/v1/governance/proposals/{id}/approve
  async approveProposal(id: string, notes?: string) {
    return apiFetch<Record<string, unknown>>(`/governance/proposals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  // POST /api/v1/governance/proposals/{id}/reject
  async rejectProposal(id: string, reason: string) {
    return apiFetch<Record<string, unknown>>(`/governance/proposals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  // GET /api/v1/governance/audit
  async getAuditLogs(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<Array<Record<string, unknown>>>(`/governance/audit${qs}`);
  },

  // GET /api/v1/governance/schedules
  async getSchedules() {
    return apiFetch<Array<Record<string, unknown>>>("/governance/schedules");
  },
};

export type {
  PlatformPolicyConfiguration,
  PlatformPolicyVersion,
  PlatformPolicyChangePayload,
} from "@/types/domain";

/**
 * ============================================================================
 * PLATFORM POLICY API (CEO-OWNED UNIFIED MODEL - HARDENED LEVEL 05)
 * Canonical endpoints for CEO and Finance.
 * ============================================================================
 */
export const platformPolicyApi = {
  // GET /api/v1/platform-policy (Active policy snapshot)
  async getPlatformPolicy() {
    return apiFetch<{
      id: string;
      version: string;
      status: "ACTIVE" | "SCHEDULED" | "SUPERSEDED" | "CANCELLED";
      effectiveFrom: string;
      effectiveUntil?: string | null;
      configuration: {
        applicationFee: { calculationType: string; value: number; currency?: string };
        affiliateFee: { calculationType: string; value: number; basis?: string };
        providerReward: { calculationType: string; value: number };
        workerReward: { calculationType: string; value: number };
        tax: {
          enabled: boolean;
          status: "NOT_USED" | "USED";
          taxType: string;
          calculationType: string;
          rate: number | null;
          taxBasis: string;
        };
      };
      configurationDigest: string;
      changeReason: string;
      notes?: string;
      createdBy: string;
      createdAt: string;
      appliedBy: string;
      appliedAt: string;
    }>("/platform-policy");
  },

  async getActivePolicy() {
    return this.getPlatformPolicy();
  },

  // POST /api/v1/platform-policy (Apply policy - CEO only)
  async applyPlatformPolicy(payload: {
    effectiveMode: "IMMEDIATE" | "SCHEDULED";
    effectiveFrom?: string;
    changeReason: string;
    notes?: string;
    changes: {
      applicationFee?: { calculationType?: string; value?: number; currency?: string };
      affiliateFee?: { calculationType?: string; value?: number; basis?: string };
      providerReward?: { calculationType?: string; value?: number };
      workerReward?: { calculationType?: string; value?: number };
      tax?: {
        enabled?: boolean;
        status?: "NOT_USED" | "USED";
        rate?: number | null;
        taxType?: string;
        taxBasis?: string;
      };
    };
  }) {
    return apiFetch<{
      id: string;
      version: string;
      status: string;
      effectiveFrom: string;
      configuration: Record<string, unknown>;
      configurationDigest: string;
      changeReason: string;
      notes?: string;
      appliedBy: string;
      appliedAt: string;
    }>("/platform-policy", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async applyPolicy(payload: {
    effectiveMode: "IMMEDIATE" | "SCHEDULED";
    effectiveFrom?: string;
    changeReason: string;
    notes?: string;
    changes: {
      applicationFee?: { calculationType?: string; value?: number; currency?: string };
      affiliateFee?: { calculationType?: string; value?: number; basis?: string };
      providerReward?: { calculationType?: string; value?: number };
      workerReward?: { calculationType?: string; value?: number };
      tax?: {
        enabled?: boolean;
        status?: "NOT_USED" | "USED";
        rate?: number | null;
        taxType?: string;
        taxBasis?: string;
      };
    };
  }) {
    return this.applyPlatformPolicy(payload);
  },

  // GET /api/v1/platform-policy/scheduled (Single active future scheduled deployment)
  async getScheduledPlatformPolicy() {
    return apiFetch<{
      id: string;
      version: string;
      status: "SCHEDULED";
      effectiveFrom: string;
      configuration: {
        applicationFee: { calculationType: string; value: number; currency?: string };
        affiliateFee: { calculationType: string; value: number; basis?: string };
        providerReward: { calculationType: string; value: number };
        workerReward: { calculationType: string; value: number };
        tax: {
          enabled: boolean;
          status: "NOT_USED" | "USED";
          taxType: string;
          calculationType: string;
          rate: number | null;
          taxBasis: string;
        };
      };
      configurationDigest: string;
      changeReason: string;
      notes?: string;
      createdBy: string;
      createdAt: string;
      appliedBy: string;
      appliedAt: string;
    } | null>("/platform-policy/scheduled");
  },

  async getScheduledPolicy() {
    return this.getScheduledPlatformPolicy();
  },

  // GET /api/v1/platform-policy/history (Full chronological policy audit)
  async getPlatformPolicyHistory() {
    return apiFetch<
      Array<{
        id: string;
        version: string;
        status: "ACTIVE" | "SCHEDULED" | "SUPERSEDED" | "CANCELLED";
        effectiveFrom: string;
        effectiveUntil?: string | null;
        configuration: Record<string, unknown>;
        configurationDigest: string;
        changeReason: string;
        notes?: string;
        appliedBy: string;
        appliedAt: string;
      }>
    >("/platform-policy/history");
  },

  async getPolicyHistory() {
    return this.getPlatformPolicyHistory();
  },

  // GET /api/v1/platform-policy/{version} (Version details)
  async getPlatformPolicyVersion(version: string) {
    return apiFetch<{
      id: string;
      version: string;
      status: string;
      effectiveFrom: string;
      configuration: Record<string, unknown>;
      configurationDigest: string;
      changeReason: string;
      notes?: string;
      appliedBy: string;
      appliedAt: string;
    }>(`/platform-policy/${version}`);
  },
};

export interface ApiCategoryMaster {
  id: string;
  code: "PRODUK" | "JASA";
  name: string;
  status: "ACTIVE";
  sort_order: number;
  accessible?: boolean;
}

export interface ApiCategoryNode {
  id: string;
  master_id: string;
  master_code: "PRODUK" | "JASA";
  name: string;
  code: string;
  description: string | null;
  icon_name: string | null;
  status: "ACTIVE" | "INACTIVE";
  effective_active: boolean;
  sort_order: number;
  lock_version: number;
  subcategories_count?: number;
  subcategories?: ApiSubcategoryNode[];
  created_at: string;
  updated_at: string;
}

export interface ApiSubcategoryNode {
  id: string;
  category_id: string;
  master_id: string;
  master_code: "PRODUK" | "JASA";
  name: string;
  code: string;
  description: string | null;
  icon_name: string | null;
  status: "ACTIVE" | "INACTIVE";
  effective_active: boolean;
  sort_order: number;
  lock_version: number;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiCategoryTreeBranch {
  id: string;
  code: "PRODUK" | "JASA";
  name: string;
  status: "ACTIVE";
  sort_order: number;
  categories: ApiCategoryNode[];
}

export interface ApiCategorySuggestion {
  id: string;
  request_number: string;
  master_code: "PRODUK" | "JASA";
  request_type: "CATEGORY" | "SUBCATEGORY";
  suggested_name: string;
  proposed_parent_category_id: string | null;
  reason: string;
  business_context: string | null;
  status: "NEW" | "PROCESSING" | "APPROVED" | "FULFILLED" | "PUBLISHED" | "REJECTED";
  submitted_by_user_id: string;
  submitted_by_organization_id: string | null;
  submitted_by_role: string;
  submitted_by_name?: string;
  admin_notes: string | null;
  review_reason: string | null;
  rejection_reason?: string | null;
  fulfilled_node: { node_type: "CATEGORY" | "SUBCATEGORY"; node_id: string } | null;
  duplicate_of_request_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  lock_version: number;
  created_at: string;
  updated_at: string;
}

export interface ApiCategoryAuditLog {
  id: string;
  actor_user_id: string;
  actor_role: string;
  actor_name?: string;
  action: string;
  entity_type: "CATEGORY" | "SUBCATEGORY" | "CATEGORY_REQUEST";
  entity_id: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  old_safe_snapshot?: Record<string, unknown> | null;
  new_safe_snapshot?: Record<string, unknown> | null;
  reason: string | null;
  ip_address?: string | null;
  occurred_at?: string;
  created_at?: string;
}

export const taxonomyApi = {
  // C01: GET /api/v1/category-masters (Roots: PRODUK / JASA)
  async getMasters() {
    return apiFetch<ApiCategoryMaster[]>("/category-masters");
  },

  // C02: GET /api/v1/categories/tree
  async getTree(params?: { master_code?: "PRODUK" | "JASA" }) {
    const qs = params?.master_code ? `?master_code=${params.master_code}` : "";
    return apiFetch<ApiCategoryTreeBranch[]>(`/categories/tree${qs}`);
  },

  // C03: GET /api/v1/categories
  async getCategories(params?: { master_code?: string; master?: string; status?: string; search?: string; limit?: number }) {
    const query = new URLSearchParams();
    const masterVal = params?.master || params?.master_code;
    if (masterVal) {
      query.set("master", masterVal);
      query.set("master_code", masterVal);
    }
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const limit = params?.limit ?? 100;
    query.set("limit", String(limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiCategoryNode[]>(`/categories${qs}`);
  },

  // C04: GET /api/v1/categories/{id}
  async getCategory(id: string) {
    return apiFetch<ApiCategoryNode>(`/categories/${id}`);
  },

  // C05: POST /api/v1/categories (Admin Operations)
  async createCategory(data: {
    master_id: string;
    name: string;
    description?: string;
    icon_name?: string;
  }) {
    return apiFetch<ApiCategoryNode>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // C06: PATCH /api/v1/categories/{id} (Admin Operations)
  async updateCategory(
    id: string,
    data: {
      name?: string;
      description?: string;
      icon_name?: string;
    },
    lockVersion: number = 1
  ) {
    return apiFetch<ApiCategoryNode>(`/categories/${id}`, {
      method: "PATCH",
      headers: {
        "If-Match": String(lockVersion),
      },
      body: JSON.stringify(data),
    });
  },

  // C07: PATCH /api/v1/categories/{id}/status (Admin Operations)
  async changeCategoryStatus(
    id: string,
    status: "ACTIVE" | "INACTIVE",
    reason?: string,
    lockVersion?: number
  ) {
    const headers: Record<string, string> = {};
    if (lockVersion !== undefined) {
      headers["If-Match"] = String(lockVersion);
    }
    return apiFetch<ApiCategoryNode>(`/categories/${id}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status, reason }),
    });
  },

  // C08: DELETE /api/v1/categories/{id} (Guarded Hard Delete)
  async deleteCategory(id: string, lockVersion?: number) {
    const headers: Record<string, string> = {};
    if (lockVersion !== undefined) {
      headers["If-Match"] = String(lockVersion);
    }
    return apiFetch<{ message: string; data: { category_id: string } }>(`/categories/${id}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ confirm: true }),
    });
  },

  // S01: GET /api/v1/subcategories
  async getSubcategories(params?: {
    category_id?: string;
    master_code?: string;
    master?: string;
    status?: string;
    search?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.category_id) query.set("category_id", params.category_id);
    const masterVal = params?.master || params?.master_code;
    if (masterVal) {
      query.set("master", masterVal);
      query.set("master_code", masterVal);
    }
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const limit = params?.limit ?? 100;
    query.set("limit", String(limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiSubcategoryNode[]>(`/subcategories${qs}`);
  },

  // S02: GET /api/v1/subcategories/{id}
  async getSubcategory(id: string) {
    return apiFetch<ApiSubcategoryNode>(`/subcategories/${id}`);
  },

  // S03: POST /api/v1/subcategories (Admin Operations)
  async createSubcategory(data: {
    category_id: string;
    name: string;
    description?: string;
    icon_name?: string;
  }) {
    return apiFetch<ApiSubcategoryNode>("/subcategories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // S04: PATCH /api/v1/subcategories/{id} (Admin Operations)
  async updateSubcategory(
    id: string,
    data: {
      name?: string;
      description?: string;
      icon_name?: string;
    },
    lockVersion: number = 1
  ) {
    return apiFetch<ApiSubcategoryNode>(`/subcategories/${id}`, {
      method: "PATCH",
      headers: {
        "If-Match": String(lockVersion),
      },
      body: JSON.stringify(data),
    });
  },

  // S05: PATCH /api/v1/subcategories/{id}/status (Admin Operations)
  async changeSubcategoryStatus(
    id: string,
    status: "ACTIVE" | "INACTIVE",
    reason?: string,
    lockVersion?: number
  ) {
    const headers: Record<string, string> = {};
    if (lockVersion !== undefined) {
      headers["If-Match"] = String(lockVersion);
    }
    return apiFetch<ApiSubcategoryNode>(`/subcategories/${id}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status, reason }),
    });
  },

  // S06: DELETE /api/v1/subcategories/{id} (Guarded Hard Delete)
  async deleteSubcategory(id: string, lockVersion?: number) {
    const headers: Record<string, string> = {};
    if (lockVersion !== undefined) {
      headers["If-Match"] = String(lockVersion);
    }
    return apiFetch<{ message: string; data: { subcategory_id: string } }>(`/subcategories/${id}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ confirm: true }),
    });
  },

  // R01: GET /api/v1/category-requests
  async getRequests(params?: {
    status?: string;
    master_code?: string;
    search?: string;
  }) {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<ApiCategorySuggestion[]>(`/category-requests${qs}`);
  },

  // R02: GET /api/v1/category-requests/{id}
  async getRequest(id: string) {
    return apiFetch<ApiCategorySuggestion>(`/category-requests/${id}`);
  },

  // R03: POST /api/v1/category-requests (Merchant, Provider, Supplier)
  async submitRequest(data: {
    master_code: "PRODUK" | "JASA";
    request_type: "CATEGORY" | "SUBCATEGORY";
    suggested_name: string;
    proposed_parent_category_id?: string | null;
    reason: string;
    business_context?: string;
  }) {
    return apiFetch<ApiCategorySuggestion>("/category-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // R04: PATCH /api/v1/category-requests/{id}/review (Admin Operations)
  async reviewRequest(
    id: string,
    data: {
      to_status: "PROCESSING" | "APPROVED" | "FULFILLED" | "REJECTED";
      review_reason?: string;
      duplicate_of_request_id?: string | null;
      fulfilled_node?: {
        node_type: "CATEGORY" | "SUBCATEGORY";
        node_id: string;
      } | null;
    },
    lockVersion: number = 1
  ) {
    return apiFetch<ApiCategorySuggestion>(`/category-requests/${id}/review`, {
      method: "PATCH",
      headers: {
        "If-Match": String(lockVersion),
      },
      body: JSON.stringify(data),
    });
  },

  // A01: GET /api/v1/category-audit (Admin & CEO Oversight)
  async getAuditLogs(params?: {
    entity_type?: string;
    entity_id?: string;
    actor_user_id?: string;
    limit?: number;
  }) {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<ApiCategoryAuditLog[]>(`/category-audit${qs}`);
  },

  // Backward-compatibility aliases
  async activateCategory(id: string, lockVersion: number = 1) {
    return this.changeCategoryStatus(id, "ACTIVE", "Diaktifkan kembali oleh Admin", lockVersion);
  },
  async deactivateCategory(id: string, lockVersion: number = 1) {
    return this.changeCategoryStatus(id, "INACTIVE", "Dinonaktifkan oleh Admin", lockVersion);
  },
  async activateSubcategory(id: string, lockVersion: number = 1) {
    return this.changeSubcategoryStatus(id, "ACTIVE", "Diaktifkan kembali oleh Admin", lockVersion);
  },
  async deactivateSubcategory(id: string, lockVersion: number = 1) {
    return this.changeSubcategoryStatus(id, "INACTIVE", "Dinonaktifkan oleh Admin", lockVersion);
  },
  async clearSubcategories() {
    return { success: true, message: "Cleared" };
  },
  async clearRequests(_statuses?: string[]) {
    return { success: true, message: "Cleared" };
  },
  async notifyProviderRequest(id: string, decision: "APPROVED" | "REJECTED", notes?: string) {
    return this.reviewRequest(id, {
      to_status: decision === "APPROVED" ? "FULFILLED" : "REJECTED",
      review_reason: notes,
    });
  },
  async publishRequest(id: string) {
    return { success: true, message: "Published", id };
  },
  async approveRequest(id: string, reason?: string) {
    return this.reviewRequest(id, {
      to_status: "FULFILLED",
      review_reason: reason,
    });
  },
  async rejectRequest(id: string, reason: string) {
    return this.reviewRequest(id, {
      to_status: "REJECTED",
      review_reason: reason,
    });
  },
  async bulkDeleteCategories(ids: string[]) {
    await Promise.all(ids.map((id) => this.deleteCategory(id)));
    return { success: true, message: "Bulk deleted" };
  },
  async getAnalytics(period?: string) {
    const qs = period ? `?period=${period}` : "";
    return apiFetch<ApiTaxonomyAnalytics>(`/taxonomy/analytics${qs}`);
  },

  // B01: GET /api/v1/brands
  async getBrands(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<import("@/types/domain").ApiBrand[]>(`/brands${qs}`);
  },

  // B02: POST /api/v1/brands
  async createBrand(data: {
    name: string;
    logo_url?: string;
    description?: string;
    status?: "ACTIVE" | "INACTIVE";
  }) {
    return apiFetch<import("@/types/domain").ApiBrand>("/brands", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // B03: PATCH /api/v1/brands/{id}
  async updateBrand(
    id: string,
    data: {
      name?: string;
      logo_url?: string;
      description?: string;
      status?: "ACTIVE" | "INACTIVE";
    }
  ) {
    return apiFetch<import("@/types/domain").ApiBrand>(`/brands/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // B04: DELETE /api/v1/brands/{id}
  async deleteBrand(id: string) {
    return apiFetch<{ message: string }>(`/brands/${id}`, {
      method: "DELETE",
    });
  },
};

export const categoryServiceApi = taxonomyApi;

export interface DatabaseStats {
  totalUsers: number;
  totalCategories: number;
  totalTaxonomyCategories: number;
  totalServiceCategories: number;
  totalSubcategories: number;
  totalTaxonomySubcategories: number;
  totalServiceSubcategories: number;
  totalOrders: number;
  totalApplications: number;
  totalOrganizations: number;
  totalMemberships: number;
  totalEmployments: number;
  ceoAccount: {
    fullName: string;
    email: string;
    role: string;
    exists: boolean;
  };
}

export interface DatabaseCleanResult {
  success: boolean;
  message: string;
  stats: {
    deletedUsersCount: number;
    deletedSubcategoriesCount: number;
    remainingUsersCount: number;
    preservedCategoriesCount: number;
  };
  preservedAccount: {
    fullName: string;
    email: string;
    passwordHint: string;
    role: string;
    status: string;
  };
}

export const executiveApi = {
  // GET /api/v1/executive/database/stats
  async getDatabaseStats() {
    return apiFetch<DatabaseStats>("/executive/database/stats");
  },

  // POST /api/v1/executive/database/clean
  async cleanDatabase(confirmText: string) {
    return apiFetch<DatabaseCleanResult>("/executive/database/clean", {
      method: "POST",
      body: JSON.stringify({ confirmText }),
    });
  },
};

export interface PaymentConfigResponse {
  message: string;
  data: Record<string, {
    _id?: string;
    code: string;
    type: string;
    name: string;
    configuration: Record<string, unknown>;
    status?: string;
    isDummy?: boolean;
    updatedAt?: string;
  }>;
}

export const paymentConfigApi = {
  // GET /api/v1/finance/payment-configuration
  async getConfigurations() {
    return apiFetch<PaymentConfigResponse>("/finance/payment-configuration");
  },

  // POST /api/v1/finance/payment-configuration/{code}
  async saveConfiguration(code: string, payload: {
    type?: string;
    name?: string;
    configuration: Record<string, unknown>;
    status?: string;
    isDummy?: boolean;
  }) {
    return apiFetch<{ message: string; data: unknown }>(`/finance/payment-configuration/${code}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

/* =========================================================================
   LEVEL 06: PLATFORM SERVICES API CLIENTS (#68 - #78)
   ========================================================================= */

export interface PlatformNotification {
  _id?: string;
  notificationId: string;
  title: string;
  body: string;
  eventCode?: string;
  notificationType?: string;
  priority?: string;
  status: string;
  readAt?: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface PlatformFileAsset {
  _id?: string;
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileKind: string;
  status: string;
  createdAt: string;
}

export interface PlatformAuditLog {
  _id?: string;
  auditId: string;
  eventCode: string;
  action: string;
  domain: string;
  actorUserId?: string;
  resourceType: string;
  resourceId: string;
  result: string;
  reason?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformActivityLog {
  _id?: string;
  activityId: string;
  activityCode: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  occurredAt: string;
  data?: Record<string, unknown>;
}

export const notificationsApi = {
  async getNotifications(params?: { unreadOnly?: boolean; limit?: number; page?: number }) {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.set("unreadOnly", "true");
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<PlatformNotification[]>(`/notifications${qs}`);
  },

  async markAsRead(notificationId: string) {
    return apiFetch<{ message: string }>(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  async markAllAsRead() {
    return apiFetch<{ message: string; data: { updatedCount: number } }>("/notifications/read-all", {
      method: "PATCH",
    });
  },
};

export const filesApi = {
  async upload(formData: FormData) {
    return apiFetch<PlatformFileAsset>("/files", {
      method: "POST",
      body: formData,
    });
  },

  async getFiles(params?: { fileKind?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.fileKind) query.set("fileKind", params.fileKind);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<PlatformFileAsset[]>(`/files${qs}`);
  },

  async deleteFile(fileId: string) {
    return apiFetch<{ message: string }>(`/files/${fileId}`, {
      method: "DELETE",
    });
  },
};

export const auditLogsApi = {
  async getLogs(params?: { domain?: string; resourceType?: string; resourceId?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.domain) query.set("domain", params.domain);
    if (params?.resourceType) query.set("resourceType", params.resourceType);
    if (params?.resourceId) query.set("resourceId", params.resourceId);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<PlatformAuditLog[]>(`/audit-logs${qs}`);
  },
};

export const activitiesApi = {
  async getActivities(params?: { category?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<PlatformActivityLog[]>(`/activities${qs}`);
  },
};

/* =========================================================================
   LEVEL 07 ITEM 85: PROVIDER WARRANTY CONFIGURATION API
   ========================================================================= */

export interface ApiProviderWarrantySettings {
  _id?: string;
  id?: string;
  providerId: string;
  status: "ACTIVE" | "INACTIVE";
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProviderWarrantyDuration {
  _id?: string;
  id?: string;
  providerId: string;
  durationDays: number;
  status: "ACTIVE" | "ARCHIVED";
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProviderWarrantySummary {
  settings: ApiProviderWarrantySettings;
  activeDurations: ApiProviderWarrantyDuration[];
}

export const providerWarrantyApi = {
  // GET /api/v1/provider/warranty
  async getSettings() {
    return apiFetch<ApiProviderWarrantySummary>("/provider/warranty");
  },

  // POST /api/v1/provider/warranty/activate
  async activateStore() {
    return apiFetch<{ message: string; data: ApiProviderWarrantySettings }>("/provider/warranty/activate", {
      method: "POST",
    });
  },

  // POST /api/v1/provider/warranty/deactivate
  async deactivateStore() {
    return apiFetch<{ message: string; data: ApiProviderWarrantySettings }>("/provider/warranty/deactivate", {
      method: "POST",
    });
  },

  // GET /api/v1/provider/warranty/durations
  async getDurations(params?: { activeOnly?: boolean }) {
    const qs = params?.activeOnly ? "?activeOnly=true" : "";
    return apiFetch<ApiProviderWarrantyDuration[]>(`/provider/warranty/durations${qs}`);
  },

  // POST /api/v1/provider/warranty/durations
  async addDuration(durationDays: number) {
    return apiFetch<{ message: string; data: ApiProviderWarrantyDuration }>("/provider/warranty/durations", {
      method: "POST",
      body: JSON.stringify({ durationDays }),
    });
  },

  // POST /api/v1/provider/warranty/durations/{id}/archive
  async archiveDuration(id: string) {
    return apiFetch<{ message: string; data: ApiProviderWarrantyDuration }>(`/provider/warranty/durations/${id}/archive`, {
      method: "POST",
    });
  },
};

/* =========================================================================
   LEVEL 07 ITEMS 86-92: SIMPLIFIED MARKETPLACE PRODUCT CLIENT APIS
   ========================================================================= */

import type {
  ApiProductCategory,
  ApiProduct,
  ApiProductVariant,
  ApiProductCompatibility,
  ApiSupplierProduct,
  ApiProductAnalytics,
  ApiShopProfile,
} from "@/types/domain";

export const shopsApi = {
  // GET /api/v1/shops/{id}
  async get(id: string) {
    return apiFetch<{
      shop: ApiShopProfile;
      products: ApiProduct[];
      count: number;
      recommendations?: ApiProduct[];
    }>(`/shops/${id}`);
  },
};

export const productCategoriesApi = {
  // GET /api/v1/product-categories
  async list(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiProductCategory[]>(`/product-categories${qs}`);
  },

  // GET /api/v1/product-categories/{id}
  async get(id: string) {
    return apiFetch<ApiProductCategory>(`/product-categories/${id}`);
  },

  // POST /api/v1/product-categories (Admin)
  async create(data: { name: string; description?: string; sortOrder?: number; status?: string }) {
    return apiFetch<ApiProductCategory>("/product-categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/v1/product-categories/{id} (Admin)
  async update(id: string, data: Partial<{ name: string; description: string; sortOrder: number; status: string }>) {
    return apiFetch<ApiProductCategory>(`/product-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/product-categories/{id}/activate (Admin)
  async activate(id: string) {
    return apiFetch<ApiProductCategory>(`/product-categories/${id}/activate`, {
      method: "POST",
    });
  },

  // POST /api/v1/product-categories/{id}/deactivate (Admin)
  async deactivate(id: string) {
    return apiFetch<ApiProductCategory>(`/product-categories/${id}/deactivate`, {
      method: "POST",
    });
  },
};

export const productsApi = {
  // GET /api/v1/products (Canonical Resource: Public, Merchant Own, or Admin Moderation)
  async list(params?: {
    scope?: "public" | "merchant" | "admin";
    categoryId?: string;
    search?: string;
    status?: string;
    merchantOrganizationId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.scope) query.set("scope", params.scope);
    if (params?.categoryId && params.categoryId !== "ALL") query.set("categoryId", params.categoryId);
    if (params?.search) query.set("search", params.search);
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.merchantOrganizationId) query.set("merchantOrganizationId", params.merchantOrganizationId);
    if (params?.minPrice) query.set("minPrice", String(params.minPrice));
    if (params?.maxPrice) query.set("maxPrice", String(params.maxPrice));
    if (params?.sort) query.set("sort", params.sort);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiProduct[]>(`/products${qs}`);
  },

  // GET /api/v1/products/{id}
  async get(id: string) {
    return apiFetch<ApiProduct>(`/products/${id}`);
  },

  // POST /api/v1/products (Merchant)
  async create(data: {
    categoryId: string;
    categoryName?: string;
    subcategoryId?: string;
    subcategoryName?: string;
    name: string;
    brandName?: string;
    description?: string;
    variants?: Array<{ name: string; price: number; stock: number; status?: string }>;
    warrantyPolicy?: any;
  }) {
    return apiFetch<ApiProduct>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/v1/products/{id} (Merchant or Admin moderation)
  async update(id: string, data: Partial<{
    categoryId: string;
    categoryName: string;
    subcategoryId: string;
    subcategoryName: string;
    name: string;
    brandName: string;
    description: string;
    status: string;
    warrantyPolicy: any;
  }>) {
    return apiFetch<ApiProduct>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/products/{id}/activate
  async activate(id: string) {
    return apiFetch<ApiProduct>(`/products/${id}/activate`, {
      method: "POST",
    });
  },

  // POST /api/v1/products/{id}/deactivate
  async deactivate(id: string) {
    return apiFetch<ApiProduct>(`/products/${id}/deactivate`, {
      method: "POST",
    });
  },

  // POST /api/v1/products/{id}/archive
  async archive(id: string) {
    return apiFetch<ApiProduct>(`/products/${id}/archive`, {
      method: "POST",
    });
  },

  // DELETE /api/v1/products/{id}
  async delete(id: string) {
    return apiFetch<{ message: string }>(`/products/${id}`, {
      method: "DELETE",
    });
  },
};

export const productVariantsApi = {
  // GET /api/v1/products/{productId}/variants
  async list(productId: string, params?: { status?: string }) {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiFetch<ApiProductVariant[]>(`/products/${productId}/variants${qs}`);
  },

  // GET /api/v1/products/{productId}/variants/{variantId}
  async get(productId: string, variantId: string) {
    return apiFetch<ApiProductVariant>(`/products/${productId}/variants/${variantId}`);
  },

  // POST /api/v1/products/{productId}/variants
  async create(productId: string, data: { name: string; price: number; stock: number; status?: string }) {
    return apiFetch<ApiProductVariant>(`/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/v1/products/{productId}/variants/{variantId}
  async update(productId: string, variantId: string, data: Partial<{ name: string; price: number; stock: number; status: string }>) {
    return apiFetch<ApiProductVariant>(`/products/${productId}/variants/${variantId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/products/{productId}/variants/{variantId}/activate
  async activate(productId: string, variantId: string) {
    return apiFetch<ApiProductVariant>(`/products/${productId}/variants/${variantId}/activate`, {
      method: "POST",
    });
  },

  // POST /api/v1/products/{productId}/variants/{variantId}/deactivate
  async deactivate(productId: string, variantId: string) {
    return apiFetch<ApiProductVariant>(`/products/${productId}/variants/${variantId}/deactivate`, {
      method: "POST",
    });
  },

  // POST /api/v1/products/{productId}/variants/{variantId}/archive
  async archive(productId: string, variantId: string) {
    return apiFetch<ApiProductVariant>(`/products/${productId}/variants/${variantId}/archive`, {
      method: "POST",
    });
  },
};

export const productCompatibilitiesApi = {
  // GET /api/v1/products/{productId}/variants/{variantId}/compatibilities
  async list(productId: string, variantId: string) {
    return apiFetch<ApiProductCompatibility[]>(`/products/${productId}/variants/${variantId}/compatibilities`);
  },

  // POST /api/v1/products/{productId}/variants/{variantId}/compatibilities (Admin)
  async create(productId: string, variantId: string, data: { targetVariantId: string; notes?: string }) {
    return apiFetch<ApiProductCompatibility>(`/products/${productId}/variants/${variantId}/compatibilities`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/v1/products/{productId}/variants/{variantId}/compatibilities/{compatibilityId}
  async update(productId: string, variantId: string, compatibilityId: string, data: { notes?: string; status?: "ACTIVE" | "INACTIVE" }) {
    return apiFetch<ApiProductCompatibility>(`/products/${productId}/variants/${variantId}/compatibilities/${compatibilityId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export const supplierProductsApi = {
  // GET /api/v1/supplier/products
  async list(params?: { status?: string }) {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiFetch<ApiSupplierProduct[]>(`/supplier/products${qs}`);
  },

  // GET /api/v1/supplier/products/{id}
  async get(id: string) {
    return apiFetch<ApiSupplierProduct>(`/supplier/products/${id}`);
  },

  // POST /api/v1/supplier/products
  async create(data: {
    productId: string;
    variantId: string;
    supplierProductCode: string;
    supplierProductName?: string;
    supplierDescription?: string;
    status?: string;
  }) {
    return apiFetch<ApiSupplierProduct>("/supplier/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/v1/supplier/products/{id}
  async update(id: string, data: Partial<{ supplierProductCode: string; supplierProductName: string; supplierDescription: string; status: string }>) {
    return apiFetch<ApiSupplierProduct>(`/supplier/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/supplier/products/{id}/activate
  async activate(id: string) {
    return apiFetch<ApiSupplierProduct>(`/supplier/products/${id}/activate`, {
      method: "POST",
    });
  },

  // POST /api/v1/supplier/products/{id}/deactivate
  async deactivate(id: string) {
    return apiFetch<ApiSupplierProduct>(`/supplier/products/${id}/deactivate`, {
      method: "POST",
    });
  },

  // POST /api/v1/supplier/products/{id}/archive
  async archive(id: string) {
    return apiFetch<ApiSupplierProduct>(`/supplier/products/${id}/archive`, {
      method: "POST",
    });
  },
};

export const productAnalyticsApi = {
  // GET /api/v1/products-analytics
  async get() {
    return apiFetch<ApiProductAnalytics>("/products-analytics");
  },
};

/* =========================================================================
   LEVEL 08: LOCATION, AVAILABILITY, SCHEDULE, SLOTS & TRACKING APIs
   ========================================================================= */

export const workerApi = {
  // GET /api/v1/worker/availability
  async getAvailability() {
    return apiFetch<{
      status: "AVAILABLE" | "UNAVAILABLE";
      updatedAt?: string;
      updatedBy?: string;
    }>("/worker/availability");
  },

  // PATCH /api/v1/worker/availability
  async updateAvailability(status: "AVAILABLE" | "UNAVAILABLE") {
    return apiFetch<{
      message: string;
      data: {
        status: "AVAILABLE" | "UNAVAILABLE";
        updatedAt: string;
        updatedBy: string;
      };
    }>("/worker/availability", {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // GET /api/v1/worker/schedule
  async getSchedule() {
    return apiFetch<{
      ownerType: string;
      ownerId: string;
      timezone: string;
      weeklyHours: Array<{
        day: string;
        isOpen: boolean;
        windows: Array<{ start: string; end: string }>;
      }>;
      exceptions: Array<{
        date: string;
        isOpen: boolean;
        windows: Array<{ start: string; end: string }>;
        reason?: string;
      }>;
    }>("/worker/schedule");
  },

  // PATCH /api/v1/worker/schedule
  async updateSchedule(data: {
    timezone?: string;
    weeklyHours?: Array<{
      day: string;
      isOpen: boolean;
      windows: Array<{ start: string; end: string }>;
    }>;
    exceptions?: Array<{
      date: string;
      isOpen: boolean;
      windows: Array<{ start: string; end: string }>;
      reason?: string;
    }>;
  }) {
    return apiFetch<{
      message: string;
      data: any;
    }>("/worker/schedule", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export const locationApi = {
  // POST /api/v1/locations/evaluate
  async evaluate(data: {
    source: "SAVED_ADDRESS" | "CURRENT_LOCATION" | "MAP_PIN" | "MANUAL_ADDRESS" | string;
    addressId?: string;
    latitude: number;
    longitude: number;
    displayAddress?: string;
    providerMasterServiceId?: string;
  }) {
    return apiFetch<{
      serviceLocation: {
        source: string;
        addressId?: string;
        latitude: number;
        longitude: number;
        displayAddress?: string;
      };
      distanceKm: number | null;
      coverage: {
        status: "COVERED" | "NOT_COVERED" | "NOT_CONFIGURED" | string;
        areaMatched: boolean;
        radiusMatched: boolean;
        covered: boolean;
      };
      eligible: boolean;
      reason?: string;
    }>("/locations/evaluate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const serviceSlotApi = {
  // GET /api/v1/service-slots
  async getSlots(params: {
    providerMasterServiceId: string;
    date: string;
    workerId?: string;
  }) {
    const query = new URLSearchParams({
      providerMasterServiceId: params.providerMasterServiceId,
      date: params.date,
    });
    if (params.workerId) query.set("workerId", params.workerId);
    return apiFetch<
      Array<{
        startAt: string | null;
        endAt: string | null;
        date: string;
        timezone: string;
        available: boolean;
        reason?: string;
      }>
    >(`/service-slots?${query.toString()}`);
  },
};

export const trackingApi = {
  // POST /api/v1/tracking/sessions
  async createSession(data: {
    actorType: "WORKER_TECHNICIAN" | "SERVICE_PROVIDER";
    role?: string;
    executionContextId?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }) {
    return apiFetch<{
      sessionId: string;
      status: string;
      startedAt: string;
      actorType: string;
    }>("/tracking/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // GET /api/v1/tracking/sessions/{sessionId}
  async getSession(sessionId: string) {
    return apiFetch<{
      sessionId: string;
      actorType: string;
      actorId: string;
      status: string;
      startedAt: string;
      lastLatitude: number | null;
      lastLongitude: number | null;
      lastAccuracyMeters: number | null;
      lastLocationAt: string | null;
    }>(`/tracking/sessions/${sessionId}`);
  },

  // POST /api/v1/tracking/sessions/{sessionId}/telemetry
  async updateTelemetry(
    sessionId: string,
    data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    }
  ) {
    return apiFetch<{
      sessionId: string;
      status: string;
      lastLatitude: number;
      lastLongitude: number;
      lastAccuracyMeters?: number;
      lastLocationAt: string;
    }>(`/tracking/sessions/${sessionId}/telemetry`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/tracking/sessions/{sessionId}/stop
  async stopSession(sessionId: string) {
    return apiFetch<{
      sessionId: string;
      status: string;
      stoppedAt: string;
    }>(`/tracking/sessions/${sessionId}/stop`, {
      method: "POST",
    });
  },

  // GET /api/v1/tracking/radar
  async getRadar() {
    return apiFetch<{
      totalPersonnel: number;
      trackingActive: number;
      locationStale: number;
      trackingOff: number;
      assignedCount: number;
      workers: Array<{
        id: string;
        fullName: string;
        status: string;
        hasActiveSession: boolean;
        role?: string;
      }>;
      providers: Array<{
        id: string;
        name: string;
        type: string;
        status: string;
      }>;
    }>("/tracking/radar");
  },

  // GET /api/v1/tracking/public/{executionContextId}
  async getSafeProjection(executionContextId: string) {
    return apiFetch<{
      status: string;
      message: string;
      lastUpdated?: string;
      distanceKm?: number | null;
      eta?: number | null;
    }>(`/tracking/public/${executionContextId}`);
  },
};

/* =========================================================================
   CANONICAL PRODUCT COMMERCE SUITE (6 MASTER DOMAINS)
   ========================================================================= */

export const cartApi = {
  // GET /api/v1/cart
  async getCart() {
    return apiFetch<{
      cartId: string;
      groups: Array<{
        merchantOrganizationId: string;
        merchantName: string;
        items: Array<{
          cartItemId: string;
          productId: string;
          variantId: string;
          productName: string;
          variantName: string;
          unitPriceSnapshot: number;
          currentCatalogPrice: number;
          isPriceChanged: boolean;
          quantity: number;
          subtotalSnapshot: number;
          availableStock: number;
          isAvailable: boolean;
          productStatus: string;
          variantStatus: string;
          thumbnailUrl?: string;
          contextType: string;
          contextId?: string;
        }>;
        subtotal: number;
      }>;
      totalItemsCount: number;
      grandSubtotal: number;
    }>("/cart");
  },

  // POST /api/v1/cart/items
  async addItem(data: { productId: string; variantId: string; quantity?: number; contextType?: string; contextId?: string }) {
    return apiFetch("/cart/items", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/v1/cart/items/{cartItemId}
  async updateItem(cartItemId: string, quantity: number) {
    return apiFetch(`/cart/items/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  },

  // DELETE /api/v1/cart/items/{cartItemId}
  async removeItem(cartItemId: string) {
    return apiFetch(`/cart/items/${cartItemId}`, {
      method: "DELETE",
    });
  },

  // POST /api/v1/cart/validate
  async validateCart() {
    return apiFetch<{
      isValid: boolean;
      issues: string[];
      cart: any;
    }>("/cart/validate", {
      method: "POST",
    });
  },

  // POST /api/v1/cart/checkout-preview
  async checkoutPreview(options?: { courierCode?: string }) {
    return apiFetch<{
      isValid: boolean;
      issues: string[];
      breakdown: {
        itemsSubtotal: number;
        shippingFee: number;
        courierName: string;
        estimatedDelivery: string;
        platformFee: number;
        taxAmount: number;
        discountAmount: number;
        grandTotal: number;
      };
      sellerOrders: Array<{
        merchantOrganizationId: string;
        merchantName: string;
        items: any[];
        subtotal: number;
        shippingAmount: number;
        totalAmount: number;
      }>;
    }>("/cart/checkout-preview", {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },
};

export const productOrdersApi = {
  // GET /api/v1/product-orders
  async list(filters?: { status?: string }) {
    const q = new URLSearchParams(filters as any).toString();
    return apiFetch<any[]>(`/product-orders${q ? `?${q}` : ""}`);
  },

  // POST /api/v1/product-orders
  async create(data: {
    courierCode?: string;
    deliveryAddress?: {
      recipientName: string;
      phone: string;
      street: string;
      city?: string;
      postalCode?: string;
    };
    paymentMethodCode?: string;
    channelCode?: string;
    bookingContext?: any;
  }) {
    return apiFetch<{
      orderGroup: any;
      orders: any[];
      paymentIntent: any;
    }>("/product-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // GET /api/v1/product-orders/{id}
  async get(orderId: string) {
    return apiFetch<any>(`/product-orders/${orderId}`);
  },

  // POST /api/v1/product-orders/{id}/cancel
  async cancel(orderId: string, reason?: string) {
    return apiFetch(`/product-orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  // POST /api/v1/product-orders/{id}/confirm-received
  async confirmReceived(orderId: string) {
    return apiFetch(`/product-orders/${orderId}/confirm-received`, {
      method: "POST",
    });
  },
};

export const paymentApi = {
  // POST /api/v1/product-orders/{orderId}/payment
  async createIntent(orderId: string, data?: { paymentMethodCode?: string; channelCode?: string }) {
    return apiFetch<any>(`/product-orders/${orderId}/payment`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  // GET /api/v1/payments/{paymentIntentId}
  async getIntent(paymentIntentId: string) {
    return apiFetch<any>(`/payments/${paymentIntentId}`);
  },

  // POST /api/v1/payments/{paymentIntentId}/pay
  async pay(paymentIntentId: string, data?: any) {
    return apiFetch<any>(`/payments/${paymentIntentId}/pay`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },
};

export const inventoryApi = {
  // GET /api/v1/inventory
  async list(filters?: { search?: string }) {
    const q = new URLSearchParams(filters as any).toString();
    return apiFetch<any[]>(`/inventory${q ? `?${q}` : ""}`);
  },

  // GET /api/v1/inventory/{variantId}
  async get(variantId: string) {
    return apiFetch<any>(`/inventory/${variantId}`);
  },

  // POST /api/v1/inventory/adjust
  async adjust(data: { variantId: string; quantity: number; type?: string; reason?: string }) {
    return apiFetch("/inventory/adjust", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // GET /api/v1/inventory/movements
  async movements(variantId?: string) {
    return apiFetch<any[]>(`/inventory/movements${variantId ? `?variantId=${variantId}` : ""}`);
  },
};

export const fulfillmentApi = {
  // GET /api/v1/fulfillments
  async list() {
    return apiFetch<any[]>("/fulfillments");
  },

  // POST /api/v1/fulfillments/orders/{orderId}/start
  async start(orderId: string) {
    return apiFetch<any>(`/fulfillments/orders/${orderId}/start`, {
      method: "POST",
    });
  },

  // POST /api/v1/fulfillments/{id}/pack
  async pack(fulfillmentId: string) {
    return apiFetch<any>(`/fulfillments/${fulfillmentId}/pack`, {
      method: "POST",
    });
  },

  // POST /api/v1/fulfillments/{id}/qc
  async qc(fulfillmentId: string, data: { passed: boolean; checklist?: string[]; notes?: string }) {
    return apiFetch<any>(`/fulfillments/${fulfillmentId}/qc`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/fulfillments/{id}/prepare-shipment
  async prepareShipment(fulfillmentId: string, shipmentData?: any) {
    return apiFetch<any>(`/fulfillments/${fulfillmentId}/prepare-shipment`, {
      method: "POST",
      body: JSON.stringify(shipmentData || {}),
    });
  },

  // POST /api/v1/fulfillments/{id}/handover
  async handover(fulfillmentId: string) {
    return apiFetch<any>(`/fulfillments/${fulfillmentId}/handover`, {
      method: "POST",
    });
  },

  // POST /api/v1/fulfillments/{id}/ship
  async ship(fulfillmentId: string, shipmentData?: any) {
    return apiFetch<any>(`/fulfillments/${fulfillmentId}/ship`, {
      method: "POST",
      body: JSON.stringify(shipmentData || {}),
    });
  },
};

export const shipmentsApi = {
  // GET /api/v1/shipments
  async list(filters?: { direction?: string; status?: string }) {
    const q = new URLSearchParams(filters as any).toString();
    return apiFetch<any[]>(`/shipments${q ? `?${q}` : ""}`);
  },

  // GET /api/v1/shipments/{id}/tracking
  async getTracking(id: string) {
    return apiFetch<any>(`/shipments/${id}/tracking`);
  },

  // POST /api/v1/shipments/{id}/handover
  async handover(shipmentId: string) {
    return apiFetch(`/shipments/${shipmentId}/handover`, {
      method: "POST",
    });
  },

  // POST /api/v1/shipments/{id}/events
  async addEvent(shipmentId: string, data: { status: string; description: string; location: string }) {
    return apiFetch(`/shipments/${shipmentId}/events`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/shipments/{id}/pod
  async recordPod(shipmentId: string, data: { receiverName: string; evidenceReference?: string; notes?: string }) {
    return apiFetch(`/shipments/${shipmentId}/pod`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const warrantiesApi = {
  // GET /api/v1/warranties
  async list(filters?: { status?: string }) {
    const q = new URLSearchParams(filters as any).toString();
    return apiFetch<any[]>(`/warranties${q ? `?${q}` : ""}`);
  },

  // GET /api/v1/warranties/{id}
  async get(warrantyId: string) {
    return apiFetch<any>(`/warranties/${warrantyId}`);
  },

  // POST /api/v1/warranties/{id}/claims
  async createClaim(warrantyId: string, data: { reason: string; description?: string; evidenceMedia?: any[] }) {
    return apiFetch<any>(`/warranties/${warrantyId}/claims`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // GET /api/v1/warranty-claims/{claimId}
  async getClaim(claimId: string) {
    return apiFetch<any>(`/warranty-claims/${claimId}`);
  },

  // GET /api/v1/warranty-claims
  async listClaims(filters?: { status?: string }) {
    const q = new URLSearchParams(filters as any).toString();
    return apiFetch<any[]>(`/warranty-claims${q ? `?${q}` : ""}`);
  },

  // POST /api/v1/warranty-claims/{claimId}/review
  async reviewClaim(claimId: string, status: string, rejectionReason?: string, needMoreInfoPrompt?: string) {
    return apiFetch(`/warranty-claims/${claimId}/review`, {
      method: "POST",
      body: JSON.stringify({ status, rejectionReason, needMoreInfoPrompt }),
    });
  },

  // POST /api/v1/warranty-claims/{claimId}/respond-info
  async respondNeedMoreInfo(claimId: string, data: { notes: string; additionalEvidence?: any[] }) {
    return apiFetch(`/warranty-claims/${claimId}/respond-info`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/warranty-claims/{claimId}/inspect
  async recordInspection(claimId: string, data: { result: string; notes: string; evidenceReferences?: string[] }) {
    return apiFetch(`/warranty-claims/${claimId}/inspect`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/warranty-claims/{claimId}/evidence
  async addEvidence(claimId: string, data: { fileReference: string; evidenceType?: string; description?: string }) {
    return apiFetch(`/warranty-claims/${claimId}/evidence`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/warranty-claims/{claimId}/resolve
  async resolveClaim(claimId: string, data: { resolutionType: string; amount?: number; description?: string; action?: string; immediateCompletion?: boolean }) {
    return apiFetch(`/warranty-claims/${claimId}/resolve`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const returnsApi = {
  // GET /api/v1/returns
  async list() {
    return apiFetch<any[]>("/returns");
  },

  // GET /api/v1/returns/eligibility
  async checkEligibility(
    orderId: string,
    orderItemId: string,
    options?: { quantity?: number; reason?: string; conditionClaim?: string }
  ) {
    const params = new URLSearchParams({
      orderId,
      orderItemId,
    });
    if (options?.quantity !== undefined && options.quantity !== null) {
      params.set("quantity", options.quantity.toString());
    }
    if (options?.reason) {
      params.set("reason", options.reason);
    }
    if (options?.conditionClaim) {
      params.set("conditionClaim", options.conditionClaim);
    }
    return apiFetch<{
      status: "ELIGIBLE" | "PARTIALLY_ELIGIBLE" | "NOT_ELIGIBLE" | "REQUIRES_REVIEW" | "RETURN_WINDOW_EXPIRED" | string;
      canReturn: boolean;
      canWarranty: boolean;
      reason?: string;
      message: string;
      returnWindowDays?: number;
      eligibleFrom?: string;
      eligibleUntil?: string;
      isWithinReturnWindow?: boolean;
      maxQuantity?: number;
      requestedQuantity?: number;
      eligibleQuantity?: number;
      totalPurchasedQuantity?: number;
      alreadyReturnedQuantity?: number;
      alreadyRefundedQuantity?: number;
      remainingQuantity?: number;
      selectedReason?: string;
      reasonEligibility?: string;
      conditionClaim?: string;
      evidenceRequirement?: "EVIDENCE_REQUIRED" | "EVIDENCE_NOT_REQUIRED";
      evidenceDetails?: {
        unboxingVideoRequired: boolean;
        photoRequired: boolean;
      };
      policySource?: string;
      policyVersion?: string;
    }>(`/returns/eligibility?${params.toString()}`);
  },

  // POST /api/v1/returns
  async create(data: {
    orderId: string;
    orderItemId: string;
    quantity: number;
    reason: string;
    description?: string;
    conditionClaim?: string;
    photos?: string[];
    evidence?: string[];
    unboxingVideoUrl?: string;
    returnMethod?: string;
  }) {
    return apiFetch<any>("/returns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // GET /api/v1/returns/{id}
  async get(returnId: string) {
    return apiFetch<any>(`/returns/${returnId}`);
  },

  // POST /api/v1/returns/{id}/approve
  async approve(returnId: string) {
    return apiFetch(`/returns/${returnId}/approve`, {
      method: "POST",
    });
  },

  // POST /api/v1/returns/{id}/ship
  async ship(returnId: string, data: { trackingNumber?: string; courierName?: string; returnMethod?: string }) {
    return apiFetch(`/returns/${returnId}/ship`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/returns/{id}/reject
  async reject(returnId: string, reason?: string) {
    return apiFetch(`/returns/${returnId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, rejectionReason: reason }),
    });
  },

  // POST /api/v1/returns/{id}/receive
  async receive(returnId: string) {
    return apiFetch(`/returns/${returnId}/receive`, {
      method: "POST",
    });
  },

  // POST /api/v1/returns/{id}/inspect
  async inspect(
    returnId: string,
    data: {
      inventoryDisposition: string;
      conditionFound?: string;
      status?: "PASSED" | "FAILED" | "PARTIALLY_PASSED";
      notes?: string;
      items?: Array<{
        orderItemId: string;
        inspectedQuantity: number;
        passedQuantity: number;
        conditionFound?: string;
      }>;
    }
  ) {
    return apiFetch(`/returns/${returnId}/inspect`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // POST /api/v1/returns/{id}/resolve
  async resolve(returnId: string, data: { resolutionType: string; refundAmount?: number; notes?: string }) {
    return apiFetch(`/returns/${returnId}/resolve`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const refundsApi = {
  // GET /api/v1/finance/refunds
  async list(filters?: { status?: string; orderId?: string }) {
    const q = new URLSearchParams(filters as any).toString();
    return apiFetch<any[]>(`/finance/refunds${q ? `?${q}` : ""}`);
  },

  // POST /api/v1/finance/refunds
  async execute(data: { orderId: string; amount: number; reason?: string; returnId?: string; warrantyId?: string; refundId?: string; idempotencyKey?: string }) {
    const headers: Record<string, string> = {};
    if (data.idempotencyKey) {
      headers["Idempotency-Key"] = data.idempotencyKey;
    }
    return apiFetch<any>("/finance/refunds", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  },

  // GET /api/v1/finance/refunds/{id}
  async get(id: string) {
    return apiFetch<any>(`/finance/refunds/${id}`);
  },
};



