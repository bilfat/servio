/**
 * SERVIO — PHASE 05A ORDER BARANG
 * Configuration & Production-ready Seed Types
 * Hardcoded dummy orders have been completely removed.
 */

import {
  MockMerchantOrder,
  MockCheckoutGroup,
  MockShippingSettings,
} from "@/types/order-barang";

export const INITIAL_SHIPPING_SETTINGS: Record<string, MockShippingSettings> = {
  "merch-jaya-motor": {
    merchantId: "merch-jaya-motor",
    merchantName: "Toko Sinar AC & Sparepart Glodok",
    address: "Pertokoan Glodok Makmur Blok B No. 12, Glodok, Jakarta Barat",
    city: "Jakarta Barat",
    coordinates: { lat: -6.1432, lng: 106.8155 },
    isLocalDeliveryActive: true,
    maxRadiusKm: 10,
    rateTiers: [
      { id: "tier-1", minKm: 0, maxKm: 3, rate: 7000 },
      { id: "tier-2", minKm: 3, maxKm: 5, rate: 12000 },
      { id: "tier-3", minKm: 5, maxKm: 10, rate: 18000 },
    ],
    note: "Pengiriman lokal cepat untuk seluruh pesanan area Jakarta Barat & sekitarnya.",
  },
  "merch-berkah-teknik": {
    merchantId: "merch-berkah-teknik",
    merchantName: "Berkah Mandiri Teknik AC",
    address: "Jl. Tebet Barat Dalam Raya No. 42, Tebet, Jakarta Selatan",
    city: "Jakarta Selatan",
    coordinates: { lat: -6.2361, lng: 106.8522 },
    isLocalDeliveryActive: true,
    maxRadiusKm: 12,
    rateTiers: [
      { id: "tier-b1", minKm: 0, maxKm: 3, rate: 8000 },
      { id: "tier-b2", minKm: 3, maxKm: 6, rate: 14000 },
      { id: "tier-b3", minKm: 6, maxKm: 12, rate: 22000 },
    ],
    note: "Spesialis suku cadang HVAC resmi dan perpipaan tembaga.",
  },
  "merch-sentosa-part": {
    merchantId: "merch-sentosa-part",
    merchantName: "Sentosa Jaya Sparepart Pendingin",
    address: "Jl. Fatmawati No. 88, Cilandak, Jakarta Selatan",
    city: "Jakarta Selatan",
    coordinates: { lat: -6.2891, lng: 106.7972 },
    isLocalDeliveryActive: true,
    maxRadiusKm: 10,
    rateTiers: [
      { id: "tier-s1", minKm: 0, maxKm: 3, rate: 7000 },
      { id: "tier-s2", minKm: 3, maxKm: 5, rate: 12000 },
      { id: "tier-s3", minKm: 5, maxKm: 10, rate: 19000 },
    ],
    note: "Kompresor original bergaransi dan relay starter AC.",
  },
};

// 100% Clean: No hardcoded mock orders
export const INITIAL_ORDERS: MockMerchantOrder[] = [];

// 100% Clean: No hardcoded mock checkout groups
export const INITIAL_CHECKOUT_GROUPS: MockCheckoutGroup[] = [];
