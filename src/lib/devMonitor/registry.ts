import path from "node:path";

export type ServiceId =
  | "identity"
  | "category"
  | "product"
  | "service"
  | "order-barang"
  | "finance"
  | "order-jasa"
  | "after-sales";

export type AuditDomain =
  | "IDENTITY"
  | "CATALOG"
  | "ORDER"
  | "FINANCE"
  | "AFTER_SALES";

export interface MicroserviceSpec {
  id: ServiceId;
  name: string;
  shortName: string;
  domain: AuditDomain;
  port: number;
  baseUrl: string;
  healthPath: string;
  dirName: string;
  dbName: string;
  auditTable: string;
  outboxTable: string;
  inboxTable: string | null;
  failedJobsTable: string;
  description: string;
  dependsOn: ServiceId[];
}

export const MICROSERVICE_REGISTRY: MicroserviceSpec[] = [
  {
    id: "identity",
    name: "Identity & Access Service",
    shortName: "Identity",
    domain: "IDENTITY",
    port: 8001,
    baseUrl: "http://127.0.0.1:8001",
    healthPath: "/up",
    dirName: "identity-service",
    dbName: "servio_identity_db",
    auditTable: "audit_logs",
    outboxTable: "outbox_events",
    inboxTable: "inbox_consumptions",
    failedJobsTable: "failed_jobs",
    description: "Autentikasi, RBAC, Profil, Alamat, Onboarding Mitra & Staf Internal",
    dependsOn: [],
  },
  {
    id: "category",
    name: "Category Taxonomy Service",
    shortName: "Category",
    domain: "CATALOG",
    port: 8002,
    baseUrl: "http://127.0.0.1:8002",
    healthPath: "/api/v1/health",
    dirName: "category-service",
    dbName: "servio_category_db",
    auditTable: "category_audit_logs",
    outboxTable: "category_outbox_events",
    inboxTable: null,
    failedJobsTable: "failed_jobs",
    description: "Pohon Kategori & Subkategori Produk/Jasa serta Pengajuan Taksonomi",
    dependsOn: ["identity"],
  },
  {
    id: "product",
    name: "Product Catalog Service",
    shortName: "Product",
    domain: "CATALOG",
    port: 8003,
    baseUrl: "http://127.0.0.1:8003",
    healthPath: "/api/v1/health",
    dirName: "product-service",
    dbName: "servio_product_db",
    auditTable: "product_audit_logs",
    outboxTable: "product_outbox_events",
    inboxTable: "product_inbox_consumptions",
    failedJobsTable: "failed_jobs",
    description: "Katalog Produk Merchant, Stok, Varian, dan Moderasi Produk",
    dependsOn: ["identity", "category"],
  },
  {
    id: "service",
    name: "Service Offering Service",
    shortName: "Service",
    domain: "CATALOG",
    port: 8004,
    baseUrl: "http://127.0.0.1:8004",
    healthPath: "/api/v1/health",
    dirName: "service-service",
    dbName: "servio_service_db",
    auditTable: "service_audit_logs",
    outboxTable: "service_outbox_events",
    inboxTable: "service_inbox_consumptions",
    failedJobsTable: "failed_jobs",
    description: "Master Layanan Jasa, Penawaran Provider, Kapabilitas Teknisi",
    dependsOn: ["identity", "category"],
  },
  {
    id: "order-barang",
    name: "Order Barang Service",
    shortName: "Order Barang",
    domain: "ORDER",
    port: 8005,
    baseUrl: "http://127.0.0.1:8005",
    healthPath: "/api/v1/order-barang/health",
    dirName: "order-barang-service",
    dbName: "servio_order_barang_db",
    auditTable: "order_audit_logs",
    outboxTable: "integration_outbox_events",
    inboxTable: "integration_inbox_events",
    failedJobsTable: "failed_jobs",
    description: "Keranjang, Checkout, Pesanan Produk, Pengiriman & Penggantian Barang",
    dependsOn: ["identity", "product", "finance"],
  },
  {
    id: "finance",
    name: "Finance & Escrow Service",
    shortName: "Finance",
    domain: "FINANCE",
    port: 8006,
    baseUrl: "http://127.0.0.1:8006",
    healthPath: "/api/v1/finance/health",
    dirName: "finance-service",
    dbName: "servio_finance_db",
    auditTable: "finance_audit_logs",
    outboxTable: "outbox_events",
    inboxTable: "inbox_events",
    failedJobsTable: "failed_jobs",
    description: "Pembayaran, Escrow, Double-Entry Ledger, S-Pay, Payout & Refund",
    dependsOn: ["identity"],
  },
  {
    id: "order-jasa",
    name: "Order Jasa Service",
    shortName: "Order Jasa",
    domain: "ORDER",
    port: 8007,
    baseUrl: "http://127.0.0.1:8007",
    healthPath: "/api/v1/order-jasa/health",
    dirName: "order-jasa-service",
    dbName: "servio_order_jasa_db",
    auditTable: "order_audit_logs",
    outboxTable: "integration_outbox_events",
    inboxTable: "integration_inbox_events",
    failedJobsTable: "failed_jobs",
    description: "Booking Jasa, Dispatch Teknisi, OTW, Diagnosis, Otorisasi Biaya & Serah Terima",
    dependsOn: ["identity", "service", "finance"],
  },
  {
    id: "after-sales",
    name: "After-Sales & Review Service",
    shortName: "After-Sales",
    domain: "AFTER_SALES",
    port: 8008,
    baseUrl: "http://127.0.0.1:8008",
    healthPath: "/api/v1/after-sales/health",
    dirName: "after-sales-service",
    dbName: "servio_after_sales_db",
    auditTable: "case_events",
    outboxTable: "outbox_events",
    inboxTable: "inbox_events",
    failedJobsTable: "failed_jobs",
    description: "Garansi, Klaim Komplain, Retur, Mediasi Dispute & Rating Ulasan",
    dependsOn: ["identity", "order-barang", "order-jasa", "finance"],
  },
];

export function getRepoRoot(): string {
  return process.cwd();
}

export function getServiceLogPaths(spec: MicroserviceSpec) {
  const root = getRepoRoot();
  return {
    laravelLog: path.join(root, "backend", "services", spec.dirName, "storage", "logs", "laravel.log"),
    stdoutLog: path.join(root, "scratch", "logs", `service-${spec.port}.log`),
    stderrLog: path.join(root, "scratch", "logs", `service-${spec.port}-err.log`),
  };
}

export function getClientErrorsLogPath(): string {
  return path.join(getRepoRoot(), "scratch", "logs", "client-errors.jsonl");
}

