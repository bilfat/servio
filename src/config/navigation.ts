import React from "react";
import { UserRole } from "@/types/auth";
import {
  House,
  CalendarCheck,
  ClipboardText,
  Package,
  ShoppingCart,
  MapPin,
  ShieldCheck,
  ClockCounterClockwise,
  Wrench,
  Sparkle,
  Users,
  ChatCircleText,
  Bank,
  Storefront,
  Truck,
  ChartLineUp,
  SlidersHorizontal,
  FileText,
  Receipt,
  Scales,
  GearSix,
  CheckCircle,
  CurrencyCircleDollar,
  Question,
  Info,
  Car,
  Broom,
  HouseLine,
  TreeEvergreen,
  User,
  Handshake,
  PlusCircle,
  Lightning,
  Drop,
  Flame,
  Fan,
  PaintRoller,
  Scissors,
  Camera,
  Plug,
  DeviceMobile,
  FirstAid,
  Lock,
  Folder,
} from "@phosphor-icons/react";

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Lightning,
  ShieldCheck,
  Drop,
  Flame,
  Fan,
  PaintRoller,
  Scissors,
  Truck,
  Camera,
  Plug,
  DeviceMobile,
  FirstAid,
  Package,
  Storefront,
  Lock,
  Sparkle,
  Folder,
};

export type IconComponent = React.ComponentType<{
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

export interface NavChildItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
  icon?: IconComponent;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: IconComponent;
  badge?: string;
  roles: UserRole[];
  children?: NavChildItem[];
}

export interface NavigationSection {
  id: string;
  title: string;
  items: NavigationItem[];
}

/**
 * 6 Fixed Service Domains for Public and Customer Dropdowns (Points to valid App Router routes)
 */
export const SIX_SERVICE_DOMAINS = [
  { id: "2e379ce0-0a88-4c9e-8085-1a37fb487b62", label: "Repair & Technical", href: "/categories/2e379ce0-0a88-4c9e-8085-1a37fb487b62", icon: Wrench },
  { id: "92438132-1530-4711-8bf2-4d1c631fabf0", label: "Home & Building", href: "/categories/92438132-1530-4711-8bf2-4d1c631fabf0", icon: HouseLine },
  { id: "4e7f1415-07ae-4c93-966c-b44172ba4d67", label: "Cleaning", href: "/categories/4e7f1415-07ae-4c93-966c-b44172ba4d67", icon: Broom },
  { id: "8c927438-8b79-41ff-a8f4-9e2288e8b5b8", label: "Maintenance", href: "/categories/8c927438-8b79-41ff-a8f4-9e2288e8b5b8", icon: GearSix },
  { id: "48cadd7a-6707-4139-b650-4cadc74ca76b", label: "Environment", href: "/categories/48cadd7a-6707-4139-b650-4cadc74ca76b", icon: TreeEvergreen },
  { id: "06e8f70c-6a07-417c-ba04-38cf26976aef", label: "Automotive", href: "/categories/06e8f70c-6a07-417c-ba04-38cf26976aef", icon: Car },
];

/**
 * Public Landing Navigation Elements (P0.3)
 */
export const PUBLIC_NAV_ITEMS = [
  {
    id: "public-services",
    label: "Jasa",
    href: "/services",
    children: SIX_SERVICE_DOMAINS,
  },
  {
    id: "public-products",
    label: "Produk",
    href: "/products",
  },
  {
    id: "public-how-it-works",
    label: "Cara Kerja",
    href: "/how-it-works",
  },
  {
    id: "public-help",
    label: "Bantuan",
    href: "/support",
    children: [
      { id: "help-center", label: "Pusat Bantuan", href: "/support", icon: Info },
      { id: "help-faq", label: "FAQ & Garansi", href: "/faq", icon: Question },
      { id: "help-contact", label: "Hubungi Kami", href: "/contact", icon: ChatCircleText },
    ],
  },
];

/**
 * Hierarchical Navigation Matrix by Role (P1.3 / ROOT-08 complete sections)
 */
export const CANONICAL_NAVIGATION_SECTIONS: Partial<Record<UserRole, NavigationSection[]>> = {
  CUSTOMER: [
    {
      id: "cust-main",
      title: "Menu Utama",
      items: [
        { id: "cust-home", label: "Beranda", href: "/", icon: House, roles: ["CUSTOMER"] },
        { id: "cust-services", label: "Jasa", href: "/services", icon: Wrench, roles: ["CUSTOMER"] },
        { id: "cust-products", label: "Produk", href: "/products", icon: Package, roles: ["CUSTOMER"] },
        { id: "cust-orders", label: "Pesanan Saya", href: "/orders", icon: ClipboardText, roles: ["CUSTOMER"] },
        { id: "cust-warranties", label: "Garansi & Perlindungan", href: "/warranties", icon: ShieldCheck, roles: ["CUSTOMER"] },
        { id: "cust-cart", label: "Keranjang Belanja", href: "/cart", icon: ShoppingCart, roles: ["CUSTOMER"] },
      ],
    },
    {
      id: "cust-account",
      title: "Akun & Layanan",
      items: [
        { id: "cust-profile", label: "Profil Akun", href: "/profile", icon: User, roles: ["CUSTOMER"] },
        { id: "cust-returns", label: "Retur Produk", href: "/returns", icon: ClockCounterClockwise, roles: ["CUSTOMER"] },
        { id: "cust-spay", label: "Saldo S-Pay", href: "/spay", icon: Bank, roles: ["CUSTOMER"] },
      ],
    },
  ],
  SERVICE_PROVIDER: [
    {
      id: "prov-core",
      title: "Jasa & Layanan",
      items: [
        { id: "prov-dash", label: "Dashboard", href: "/provider/dashboard", icon: ChartLineUp, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-serv", label: "Katalog Layanan", href: "/provider/services", icon: Wrench, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-tax-req", label: "Ajukan Subkategori", href: "/provider/taxonomy-request", icon: PlusCircle, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-book", label: "Antrean Booking", href: "/provider/bookings", icon: CalendarCheck, badge: "3", roles: ["SERVICE_PROVIDER"] },
        { id: "prov-ord", label: "Order Operasional", href: "/provider/orders", icon: ClipboardText, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-chat", label: "Obrolan Pelanggan", href: "/provider/chat", icon: ChatCircleText, roles: ["SERVICE_PROVIDER"] },
      ],
    },
    {
      id: "prov-ops",
      title: "Operasional Lapangan",
      items: [
        { id: "prov-work", label: "Manajemen Teknisi", href: "/provider/workers", icon: Users, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-track", label: "Radar Pelacakan", href: "/provider/tracking", icon: MapPin, roles: ["SERVICE_PROVIDER"] },
      ],
    },
    {
      id: "prov-partnerships",
      title: "Kemitraan Toko",
      items: [
        { id: "prov-partnerships-link", label: "Kerja Sama Toko", href: "/provider/partnerships", icon: Storefront, roles: ["SERVICE_PROVIDER"] },
      ],
    },
    {
      id: "prov-quality",
      title: "Pelanggan & Kualitas",
      items: [
        { id: "prov-rat", label: "Rating & Ulasan", href: "/provider/ratings", icon: Sparkle, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-disp", label: "Sengketa", href: "/provider/disputes", icon: Scales, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-his", label: "Riwayat Layanan", href: "/provider/history", icon: FileText, roles: ["SERVICE_PROVIDER"] },
      ],
    },
    {
      id: "prov-warranty-section",
      title: "GARANSI",
      items: [
        { id: "prov-war", label: "Garansi", href: "/provider/warranty", icon: ShieldCheck, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-war-req", label: "Pengajuan Garansi", href: "/provider/warranty/requests", icon: ClipboardText, roles: ["SERVICE_PROVIDER"] },
      ],
    },
    {
      id: "prov-finance",
      title: "Keuangan",
      items: [
        { id: "prov-rev", label: "Pendapatan", href: "/provider/revenue", icon: CurrencyCircleDollar, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-payout", label: "Payout", href: "/provider/payouts", icon: Bank, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-trx", label: "Transaksi", href: "/provider/transactions", icon: Receipt, roles: ["SERVICE_PROVIDER"] },
        { id: "prov-spay", label: "Dompet S-Pay", href: "/provider/spay", icon: Bank, roles: ["SERVICE_PROVIDER"] },
      ],
    },
    {
      id: "prov-settings",
      title: "Pengaturan",
      items: [
        { id: "prov-prof", label: "Profil", href: "/provider/profile", icon: User, roles: ["SERVICE_PROVIDER"] },
      ],
    },
  ],
  WORKER_TECHNICIAN: [
    {
      id: "work-dash-section",
      title: "Dashboard",
      items: [
        { id: "work-dashboard", label: "Dashboard", href: "/worker/dashboard", icon: House, roles: ["WORKER_TECHNICIAN"] },
      ],
    },
    {
      id: "work-jobs-section",
      title: "Pekerjaan",
      items: [
        { id: "work-my-jobs", label: "Pekerjaan Saya", href: "/worker/jobs", icon: Wrench, roles: ["WORKER_TECHNICIAN"] },
      ],
    },
    {
      id: "work-warranty-section",
      title: "GARANSI",
      items: [
        { id: "work-warranty", label: "Garansi", href: "/worker/warranty", icon: ShieldCheck, roles: ["WORKER_TECHNICIAN"] },
      ],
    },
    {
      id: "work-ops-section",
      title: "Operasional",
      items: [
        { id: "work-schedule", label: "Jadwal", href: "/worker/schedule", icon: CalendarCheck, roles: ["WORKER_TECHNICIAN"] },
        { id: "work-chat", label: "Obrolan", href: "/worker/chat", icon: ChatCircleText, roles: ["WORKER_TECHNICIAN"] },
      ],
    },
    {
      id: "work-support-section",
      title: "Bantuan",
      items: [
        { id: "work-guide", label: "Bantuan", href: "/worker/guide", icon: Question, roles: ["WORKER_TECHNICIAN"] },
      ],
    },
    {
      id: "work-profile-section",
      title: "Profile",
      items: [
        { id: "work-profile", label: "Profil & Portofolio", href: "/worker/profile", icon: User, roles: ["WORKER_TECHNICIAN"] },
        { id: "work-earnings", label: "Pendapatan & Reward", href: "/worker/earnings", icon: CurrencyCircleDollar, roles: ["WORKER_TECHNICIAN"] },
      ],
    },
  ],

  CUSTOMER_SUPPORT: [
    {
      id: "cs-tickets",
      title: "Tiket & Antrean",
      items: [
        { id: "cs-dashboard", label: "Dashboard CS", href: "/support/dashboard", icon: ChartLineUp, roles: ["CUSTOMER_SUPPORT"] },
        { id: "cs-onboarding", label: "My Onboarding", href: "/staff/onboarding", icon: CheckCircle, roles: ["CUSTOMER_SUPPORT"] },
        { id: "cs-queue", label: "Antrean Tiket", href: "/support/queue", icon: ClipboardText, badge: "5", roles: ["CUSTOMER_SUPPORT"] },
        { id: "cs-cases", label: "Eskalasi Kasus", href: "/support/cases", icon: ClipboardText, roles: ["CUSTOMER_SUPPORT"] },
        { id: "cs-chat", label: "Chat Bantuan", href: "/support/chat", icon: ChatCircleText, roles: ["CUSTOMER_SUPPORT"] },
      ],
    },
    {
      id: "cs-resolution",
      title: "Resolusi & Mediasi",
      items: [
        { id: "cs-disputes", label: "Mediasi Sengketa", href: "/support/disputes", icon: Scales, roles: ["CUSTOMER_SUPPORT"] },
      ],
    },
  ],
  MERCHANT: [
    {
      id: "merch-sales",
      title: "Katalog & Penjualan",
      items: [
        { id: "merch-dash", label: "Dashboard Toko", href: "/merchant/dashboard", icon: ChartLineUp, roles: ["MERCHANT"] },
        { id: "merch-prod", label: "Katalog Produk", href: "/merchant/products", icon: Package, roles: ["MERCHANT"] },
        { id: "merch-ord", label: "Pesanan Masuk", href: "/merchant/orders", icon: ClipboardText, badge: "4", roles: ["MERCHANT"] },
      ],
    },
    {
      id: "merch-logistics",
      title: "Gudang & Logistik",
      items: [
        { id: "merch-inv", label: "Stok Gudang", href: "/merchant/inventory", icon: Storefront, roles: ["MERCHANT"] },
        { id: "merch-procure", label: "Pengadaan B2B", href: "/merchant/procurement", icon: ShoppingCart, roles: ["MERCHANT"] },
        { id: "merch-ful", label: "Pick & Pack (Outbound)", href: "/merchant/fulfillment", icon: Package, roles: ["MERCHANT"] },
        { id: "merch-ship", label: "Pengiriman", href: "/merchant/shipping", icon: Truck, roles: ["MERCHANT"] },
        { id: "merch-ret", label: "Retur Barang", href: "/merchant/returns", icon: ClockCounterClockwise, roles: ["MERCHANT"] },
        { id: "merch-war", label: "Garansi & Klaim", href: "/merchant/warranty", icon: ShieldCheck, roles: ["MERCHANT"] },
      ],
    },
    {
      id: "merch-partnerships",
      title: "Kemitraan",
      items: [
        {
          id: "merch-part-req",
          label: "Pengajuan Kerja Sama",
          href: "/merchant/partnerships/requests",
          icon: Handshake,
          badge: "2",
          roles: ["MERCHANT"],
        },
        {
          id: "merch-affiliate",
          label: "Program Afiliasi",
          href: "/merchant/affiliate",
          icon: Sparkle,
          roles: ["MERCHANT"],
        },
      ],
    },
    {
      id: "merch-finance",
      title: "Keuangan",
      items: [
        { id: "merch-settle", label: "Settlement & Saldo", href: "/merchant/settlement", icon: Bank, roles: ["MERCHANT"] },
        { id: "merch-spay", label: "Dompet S-Pay", href: "/merchant/spay", icon: Bank, roles: ["MERCHANT"] },
      ],
    },
    {
      id: "merch-settings",
      title: "Pengaturan",
      items: [
        { id: "merch-prof", label: "Profil Toko", href: "/merchant/profile", icon: User, roles: ["MERCHANT"] },
      ],
    },
  ],
  SUPPLIER: [
    {
      id: "supp-catalog",
      title: "Katalog & Inventori",
      items: [
        { id: "supp-dashboard", label: "Dashboard Suplai", href: "/supplier/dashboard", icon: ChartLineUp, roles: ["SUPPLIER"] },
        { id: "supp-products", label: "Katalog Grosir", href: "/supplier/products", icon: Package, roles: ["SUPPLIER"] },
        { id: "supp-inventory", label: "Inventaris B2B", href: "/supplier/inventory", icon: Storefront, roles: ["SUPPLIER"] },
      ],
    },
    {
      id: "supp-distribution",
      title: "Distribusi & Logistik",
      items: [
        { id: "supp-orders", label: "Pesanan B2B", href: "/supplier/orders", icon: ClipboardText, roles: ["SUPPLIER"] },
        { id: "supp-fulfillment", label: "Fulfillment Kargo", href: "/supplier/fulfillment", icon: Package, roles: ["SUPPLIER"] },
        { id: "supp-shipping", label: "Pengiriman B2B", href: "/supplier/shipping", icon: Truck, roles: ["SUPPLIER"] },
        { id: "supp-returns", label: "Retur B2B", href: "/supplier/returns", icon: ClockCounterClockwise, roles: ["SUPPLIER"] },
      ],
    },
    {
      id: "supp-settings",
      title: "Pengaturan",
      items: [
        { id: "supp-prof", label: "Profil Distributor", href: "/supplier/profile", icon: GearSix, roles: ["SUPPLIER"] },
      ],
    },
  ],
  ADMIN_OPERATIONS: [
    {
      id: "adm-platform",
      title: "Platform & Pengguna",
      items: [
        { id: "adm-dashboard", label: "Dashboard Operasi", href: "/admin/dashboard", icon: ChartLineUp, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-onboarding", label: "My Onboarding", href: "/staff/onboarding", icon: CheckCircle, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-reg-apps", label: "Pendaftaran Mitra", href: "/admin/registration-applications", icon: FileText, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-taxonomy", label: "Kategori dan Sub Kategori", href: "/admin/taxonomy", icon: SlidersHorizontal, roles: ["ADMIN_OPERATIONS"] },
      ],
    },
    {
      id: "adm-transactions",
      title: "Transaksi & Katalog",
      items: [
        { id: "adm-services", label: "Operasional Servis", href: "/admin/services", icon: Wrench, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-products", label: "Moderasi Produk", href: "/admin/products", icon: Package, badge: "2", roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-orders", label: "Order Global", href: "/admin/orders", icon: ClipboardText, roles: ["ADMIN_OPERATIONS"] },
      ],
    },
    {
      id: "adm-resolution",
      title: "Resolusi & Kualitas",
      items: [
        { id: "adm-disputes", label: "Sengketa & Eskalasi", href: "/admin/disputes", icon: Scales, badge: "1", roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-warranties", label: "Klaim Garansi", href: "/admin/warranties", icon: ShieldCheck, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-moderation", label: "Moderasi Ulasan & UGC", href: "/admin/moderation", icon: ChatCircleText, roles: ["ADMIN_OPERATIONS"] },
      ],
    },
    {
      id: "adm-logistics",
      title: "Gudang & Logistik",
      items: [
        { id: "adm-inventory", label: "Pengawasan Inventaris", href: "/admin/inventory", icon: Storefront, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-fulfillment", label: "SLA Fulfillment", href: "/admin/fulfillment", icon: CheckCircle, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-shipping", label: "Integrasi Pengiriman", href: "/admin/shipping", icon: Truck, roles: ["ADMIN_OPERATIONS"] },
        { id: "adm-returns", label: "Retur & Risiko Fraud", href: "/admin/returns", icon: ClockCounterClockwise, roles: ["ADMIN_OPERATIONS"] },
      ],
    },
    {
      id: "adm-security",
      title: "Keamanan & Audit",
      items: [
        { id: "adm-audit", label: "Log Audit Sistem", href: "/admin/audit", icon: FileText, roles: ["ADMIN_OPERATIONS"] },
      ],
    },
  ],
  FINANCE_PAYMENT_OPS: [
    {
      id: "fin-escrow",
      title: "Escrow & Transaksi",
      items: [
        { id: "fin-dashboard", label: "Dashboard Finansial", href: "/finance/dashboard", icon: ChartLineUp, roles: ["FINANCE_PAYMENT_OPS"] },
        { id: "fin-onboarding", label: "My Onboarding", href: "/staff/onboarding", icon: CheckCircle, roles: ["FINANCE_PAYMENT_OPS"] },
        { id: "fin-payments", label: "Escrow & Bayar", href: "/finance/payments", icon: Bank, roles: ["FINANCE_PAYMENT_OPS"] },
      ],
    },
    {
      id: "fin-payouts-group",
      title: "Pengembalian & Pencairan",
      items: [
        { id: "fin-refunds", label: "Refund Dana", href: "/finance/refunds", icon: Receipt, badge: "2", roles: ["FINANCE_PAYMENT_OPS"] },
        { id: "fin-payouts", label: "Pencairan Mitra", href: "/finance/payouts", icon: FileText, roles: ["FINANCE_PAYMENT_OPS"] },
        { id: "fin-reconciliation", label: "Rekonsiliasi Bank", href: "/finance/reconciliation", icon: Scales, roles: ["FINANCE_PAYMENT_OPS"] },
      ],
    },
    {
      id: "fin-fee-commercial",
      title: "Fee & Kebijakan Platform",
      items: [
        { id: "fin-policies", label: "Kebijakan Platform (Read-Only)", href: "/finance/policies", icon: ShieldCheck, roles: ["FINANCE_PAYMENT_OPS"] },
        { id: "fin-payment-cfg", label: "Konfigurasi Pembayaran", href: "/finance/payment-configuration", icon: Bank, roles: ["FINANCE_PAYMENT_OPS"] },
      ],
    },
  ],
  CEO_PRODUCT_OWNER: [
    {
      id: "ceo-governance",
      title: "Tata Kelola Eksekutif",
      items: [
        { id: "ceo-dash", label: "Dashboard", href: "/ceo/dashboard", icon: ChartLineUp, roles: ["CEO_PRODUCT_OWNER"] },
        { id: "ceo-gov-center", label: "Kebijakan Platform", href: "/ceo/governance/policies", icon: ShieldCheck, roles: ["CEO_PRODUCT_OWNER"] },
        { id: "ceo-onboarding", label: "Monitoring Mitra", href: "/ceo/business-onboarding", icon: FileText, roles: ["CEO_PRODUCT_OWNER"] },
        { id: "ceo-team", label: "Tim & Akses Internal", href: "/ceo/internal-team", icon: Users, roles: ["CEO_PRODUCT_OWNER"] },
        { id: "ceo-tax", label: "Kategori dan Sub Kategori", href: "/ceo/taxonomy", icon: SlidersHorizontal, roles: ["CEO_PRODUCT_OWNER"] },
        { id: "ceo-affiliate", label: "Affiliate", href: "/ceo/affiliate", icon: Sparkle, roles: ["CEO_PRODUCT_OWNER"] },
      ],
    },
    {
      id: "ceo-policy-group",
      title: "Policy & AI",
      items: [
        { id: "ceo-pol", label: "Kebijakan Logistik", href: "/ceo/policy", icon: ShieldCheck, roles: ["CEO_PRODUCT_OWNER"] },
        { id: "ceo-ai-mon", label: "Monitoring Safe AI", href: "/ceo/ai", icon: Sparkle, roles: ["CEO_PRODUCT_OWNER"] },
      ],
    },
    {
      id: "ceo-maintenance-group",
      title: "Sistem & Database",
      items: [
        { id: "ceo-clean-data", label: "Bersihkan Data", href: "/ceo/clean-data", icon: Broom, roles: ["CEO_PRODUCT_OWNER"] },
      ],
    },
  ],
};

/**
 * Flat items for standard top navigation or simple sidebar
 */
export const CANONICAL_NAVIGATION: Record<UserRole, NavigationItem[]> = {
  CUSTOMER: [
    {
      id: "home",
      label: "Beranda",
      href: "/",
      icon: House,
      roles: ["CUSTOMER"],
    },
    {
      id: "services-menu",
      label: "Jasa",
      href: "/services",
      icon: Wrench,
      roles: ["CUSTOMER"],
      children: [
        { id: "all-services", label: "Semua Jasa", href: "/services" },
        { id: "cat-services", label: "Kategori Layanan", href: "/categories" },
        { id: "smart-services", label: "Smart Discovery AI", href: "/smart-discovery" },
      ],
    },
    {
      id: "products-menu",
      label: "Produk",
      href: "/products",
      icon: Package,
      roles: ["CUSTOMER"],
      children: [
        { id: "all-products", label: "Semua Produk", href: "/products" },
        { id: "asset-products", label: "Sparepart Aset Saya", href: "/products" },
      ],
    },
    {
      id: "orders-menu",
      label: "Pesanan",
      href: "/orders",
      icon: ClipboardText,
      badge: "2",
      roles: ["CUSTOMER"],
      children: [
        { id: "service-orders", label: "Pesanan Jasa", href: "/orders" },
        { id: "booking-list", label: "Reservasi Masuk", href: "/bookings" },
        { id: "returns-list", label: "Retur Barang", href: "/returns" },
      ],
    },
    {
      id: "history-menu",
      label: "Riwayat & Perawatan",
      href: "/history",
      icon: ClockCounterClockwise,
      roles: ["CUSTOMER"],
      children: [
        { id: "service-history", label: "Riwayat Servis", href: "/history" },
        { id: "maintenance-sched", label: "Jadwal Servis", href: "/maintenance" },
      ],
    },
    {
      id: "warranties-menu",
      label: "Garansi & Perlindungan",
      href: "/warranties",
      icon: ShieldCheck,
      roles: ["CUSTOMER"],
      children: [
        { id: "warranties-activate", label: "Perlu Diaktifkan", href: "/warranties?subTab=PERLU_DIAKTIFKAN" },
        { id: "warranties-active", label: "Garansi Aktif", href: "/warranties?subTab=GARANSI_AKTIF" },
        { id: "warranties-claims", label: "Klaim Garansi", href: "/warranties?subTab=KLAIM_GARANSI" },
        { id: "warranties-history", label: "Riwayat Perlindungan", href: "/warranties?subTab=RIWAYAT_PERLINDUNGAN" },
      ],
    },
    {
      id: "cart",
      label: "Keranjang",
      href: "/cart",
      icon: ShoppingCart,
      roles: ["CUSTOMER"],
    },
  ],
  SERVICE_PROVIDER: [
    { id: "prov-dashboard", label: "Dashboard", href: "/provider/dashboard", icon: ChartLineUp, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-services", label: "Katalog Layanan", href: "/provider/services", icon: Wrench, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-tax-req", label: "Ajukan Subkategori", href: "/provider/taxonomy-request", icon: PlusCircle, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-bookings", label: "Antrean Booking", href: "/provider/bookings", icon: CalendarCheck, badge: "3", roles: ["SERVICE_PROVIDER"] },
    { id: "prov-orders", label: "Order Operasional", href: "/provider/orders", icon: ClipboardText, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-workers", label: "Teknisi", href: "/provider/workers", icon: Users, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-tracking", label: "Radar Pelacakan", href: "/provider/tracking", icon: MapPin, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-partnerships", label: "Kerja Sama Toko", href: "/provider/partnerships", icon: Storefront, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-warranty", label: "Garansi", href: "/provider/warranty", icon: ShieldCheck, roles: ["SERVICE_PROVIDER"] },
    { id: "prov-warranty-requests", label: "Pengajuan Garansi", href: "/provider/warranty/requests", icon: ClipboardText, roles: ["SERVICE_PROVIDER"] },
  ],
  WORKER_TECHNICIAN: [
    { id: "work-dashboard", label: "Dashboard", href: "/worker/dashboard", icon: House, roles: ["WORKER_TECHNICIAN"] },
    { id: "work-jobs", label: "Pekerjaan Saya", href: "/worker/jobs", icon: Wrench, roles: ["WORKER_TECHNICIAN"] },
    { id: "work-warranty", label: "Garansi", href: "/worker/warranty", icon: ShieldCheck, roles: ["WORKER_TECHNICIAN"] },
    { id: "work-schedule", label: "Jadwal", href: "/worker/schedule", icon: CalendarCheck, roles: ["WORKER_TECHNICIAN"] },
    { id: "work-chat", label: "Obrolan", href: "/worker/chat", icon: ChatCircleText, roles: ["WORKER_TECHNICIAN"] },
    { id: "work-guide", label: "Bantuan", href: "/worker/guide", icon: Question, roles: ["WORKER_TECHNICIAN"] },
    { id: "work-profile", label: "Profil", href: "/worker/profile", icon: User, roles: ["WORKER_TECHNICIAN"] },
    { id: "work-earnings", label: "Pendapatan", href: "/worker/earnings", icon: CurrencyCircleDollar, roles: ["WORKER_TECHNICIAN"] },
  ],
  CUSTOMER_SUPPORT: [
    { id: "cs-dashboard", label: "Dashboard CS", href: "/support/dashboard", icon: ChartLineUp, roles: ["CUSTOMER_SUPPORT"] },
    { id: "cs-onboarding", label: "My Onboarding", href: "/staff/onboarding", icon: CheckCircle, roles: ["CUSTOMER_SUPPORT"] },
    { id: "cs-queue", label: "Antrean Tiket", href: "/support/queue", icon: ClipboardText, badge: "5", roles: ["CUSTOMER_SUPPORT"] },
    { id: "cs-cases", label: "Eskalasi Kasus", href: "/support/cases", icon: ClipboardText, roles: ["CUSTOMER_SUPPORT"] },
    { id: "cs-disputes", label: "Mediasi Sengketa", href: "/support/disputes", icon: Scales, roles: ["CUSTOMER_SUPPORT"] },
    { id: "cs-chat", label: "Chat Bantuan", href: "/support/chat", icon: ChatCircleText, roles: ["CUSTOMER_SUPPORT"] },
  ],
  FINANCE_PAYMENT_OPS: [
    { id: "fin-dashboard", label: "Dashboard Finansial", href: "/finance/dashboard", icon: ChartLineUp, roles: ["FINANCE_PAYMENT_OPS"] },
    { id: "fin-policies", label: "Kebijakan Platform (A–F)", href: "/finance/policies", icon: ShieldCheck, roles: ["FINANCE_PAYMENT_OPS"] },
    { id: "fin-payment-cfg", label: "Konfigurasi Pembayaran", href: "/finance/payment-configuration", icon: Bank, roles: ["FINANCE_PAYMENT_OPS"] },
    { id: "fin-onboarding", label: "My Onboarding", href: "/staff/onboarding", icon: CheckCircle, roles: ["FINANCE_PAYMENT_OPS"] },
    { id: "fin-payments", label: "Escrow & Bayar", href: "/finance/payments", icon: Bank, roles: ["FINANCE_PAYMENT_OPS"] },
    { id: "fin-refunds", label: "Refund Dana", href: "/finance/refunds", icon: Receipt, badge: "2", roles: ["FINANCE_PAYMENT_OPS"] },
    { id: "fin-payouts", label: "Pencairan Mitra", href: "/finance/payouts", icon: FileText, roles: ["FINANCE_PAYMENT_OPS"] },
    { id: "fin-reconciliation", label: "Rekonsiliasi Bank", href: "/finance/reconciliation", icon: Scales, roles: ["FINANCE_PAYMENT_OPS"] },
  ],
  MERCHANT: [
    { id: "merch-dashboard", label: "Dashboard Toko", href: "/merchant/dashboard", icon: ChartLineUp, roles: ["MERCHANT"] },
    { id: "merch-products", label: "Katalog Produk", href: "/merchant/products", icon: Package, roles: ["MERCHANT"] },
    { id: "merch-orders", label: "Pesanan Masuk", href: "/merchant/orders", icon: ClipboardText, badge: "4", roles: ["MERCHANT"] },
    { id: "merch-inventory", label: "Stok Gudang", href: "/merchant/inventory", icon: Storefront, roles: ["MERCHANT"] },
    { id: "merch-procurement", label: "Pengadaan B2B", href: "/merchant/procurement", icon: ShoppingCart, roles: ["MERCHANT"] },
    { id: "merch-fulfillment", label: "Pick & Pack (Outbound)", href: "/merchant/fulfillment", icon: Package, roles: ["MERCHANT"] },
    { id: "merch-shipping", label: "Pengiriman", href: "/merchant/shipping", icon: Truck, roles: ["MERCHANT"] },
    { id: "merch-returns", label: "Retur Barang", href: "/merchant/returns", icon: ClockCounterClockwise, roles: ["MERCHANT"] },
    { id: "merch-warranty", label: "Garansi & Klaim", href: "/merchant/warranty", icon: ShieldCheck, roles: ["MERCHANT"] },
    { id: "merch-part-req", label: "Pengajuan Kerja Sama", href: "/merchant/partnerships/requests", icon: Handshake, badge: "2", roles: ["MERCHANT"] },
    { id: "merch-affiliate", label: "Program Afiliasi", href: "/merchant/affiliate", icon: Sparkle, roles: ["MERCHANT"] },
    { id: "merch-settlement", label: "Settlement & Saldo", href: "/merchant/settlement", icon: Bank, roles: ["MERCHANT"] },
  ],
  SUPPLIER: [
    { id: "supp-dashboard", label: "Dashboard Suplai", href: "/supplier/dashboard", icon: ChartLineUp, roles: ["SUPPLIER"] },
    { id: "supp-products", label: "Katalog Grosir", href: "/supplier/products", icon: Package, roles: ["SUPPLIER"] },
    { id: "supp-orders", label: "Pesanan B2B", href: "/supplier/orders", icon: ClipboardText, roles: ["SUPPLIER"] },
    { id: "supp-inventory", label: "Inventaris B2B", href: "/supplier/inventory", icon: Storefront, roles: ["SUPPLIER"] },
    { id: "supp-fulfillment", label: "Fulfillment Kargo", href: "/supplier/fulfillment", icon: Package, roles: ["SUPPLIER"] },
    { id: "supp-shipping", label: "Pengiriman B2B", href: "/supplier/shipping", icon: Truck, roles: ["SUPPLIER"] },
    { id: "supp-returns", label: "Retur B2B", href: "/supplier/returns", icon: ClockCounterClockwise, roles: ["SUPPLIER"] },
  ],
  ADMIN_OPERATIONS: [
    { id: "adm-dashboard", label: "Dashboard Operasi", href: "/admin/dashboard", icon: ChartLineUp, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-onboarding", label: "My Onboarding", href: "/staff/onboarding", icon: CheckCircle, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-reg-apps", label: "Pendaftaran Mitra", href: "/admin/registration-applications", icon: FileText, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-taxonomy", label: "Kategori dan Sub Kategori", href: "/admin/taxonomy", icon: SlidersHorizontal, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-services", label: "Operasional Servis", href: "/admin/services", icon: Wrench, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-products", label: "Moderasi Produk", href: "/admin/products", icon: Package, badge: "2", roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-orders", label: "Order Global", href: "/admin/orders", icon: ClipboardText, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-disputes", label: "Sengketa & Eskalasi", href: "/admin/disputes", icon: Scales, badge: "1", roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-warranties", label: "Klaim Garansi", href: "/admin/warranties", icon: ShieldCheck, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-moderation", label: "Moderasi Ulasan & UGC", href: "/admin/moderation", icon: ChatCircleText, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-inventory", label: "Pengawasan Inventaris", href: "/admin/inventory", icon: Storefront, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-fulfillment", label: "SLA Fulfillment", href: "/admin/fulfillment", icon: CheckCircle, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-shipping", label: "Integrasi Pengiriman", href: "/admin/shipping", icon: Truck, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-returns", label: "Retur & Risiko Fraud", href: "/admin/returns", icon: ClockCounterClockwise, roles: ["ADMIN_OPERATIONS"] },
    { id: "adm-audit", label: "Log Audit Sistem", href: "/admin/audit", icon: FileText, roles: ["ADMIN_OPERATIONS"] },
  ],
  CEO_PRODUCT_OWNER: [
    { id: "ceo-dashboard", label: "Dashboard", href: "/ceo/dashboard", icon: ChartLineUp, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-gov-center", label: "Tata Kelola Kebijakan", href: "/ceo/governance/policies", icon: ShieldCheck, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-onboarding", label: "Monitoring Mitra", href: "/ceo/business-onboarding", icon: FileText, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-team", label: "Tim & Akses Internal", href: "/ceo/internal-team", icon: Users, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-taxonomy", label: "Kategori dan Sub Kategori", href: "/ceo/taxonomy", icon: SlidersHorizontal, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-affiliate", label: "Affiliate", href: "/ceo/affiliate", icon: Sparkle, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-policy", label: "Kebijakan Logistik", href: "/ceo/policy", icon: ShieldCheck, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-ai", label: "Monitoring Safe AI", href: "/ceo/ai", icon: Sparkle, roles: ["CEO_PRODUCT_OWNER"] },
    { id: "ceo-clean-data", label: "Bersihkan Data", href: "/ceo/clean-data", icon: Broom, roles: ["CEO_PRODUCT_OWNER"] },
  ],
};
