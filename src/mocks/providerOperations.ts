export interface ProviderInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: "AC_PARTS" | "FREON" | "PIPING" | "ELECTRICAL" | "TOOLS";
  stockAvailable: number;
  stockAllocated: number;
  minThreshold: number;
  unit: string;
  unitCost: number;
  lastRestocked: string;
}

export interface ProviderFulfillmentItem {
  id: string;
  orderId: string;
  customerName: string;
  technicianId: string;
  technicianName: string;
  serviceTitle: string;
  items: { name: string; quantity: number; unit: string; sku: string }[];
  status: "WAITING_PREP" | "PREPARED" | "HANDED_TO_WORKER";
  preparedAt?: string;
}

export interface WorkshopShipment {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  unitModel: string;
  serviceType: string;
  direction: "PICKUP_FROM_CUSTOMER" | "DELIVERY_TO_CUSTOMER";
  scheduledDate: string;
  timeSlot: string;
  driverName?: string;
  vehicleNumber?: string;
  status: "SCHEDULED" | "IN_TRANSIT" | "ARRIVED_AT_WORKSHOP" | "COMPLETED";
}

export interface ProviderReturnClaim {
  id: string;
  purchaseOrderId: string;
  supplierName: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  defectReason: string;
  status: "SUBMITTED" | "APPROVED" | "RETURN_DISPATCHED" | "REFUNDED";
  submittedAt: string;
  refundAmount: number;
}

export const MOCK_PROVIDER_INVENTORY: ProviderInventoryItem[] = [
  {
    id: "inv-001",
    sku: "FRN-R32-DAIKIN",
    name: "Freon Tabung R32 Daikin Original 3kg",
    category: "FREON",
    stockAvailable: 14,
    stockAllocated: 3,
    minThreshold: 5,
    unit: "Tabung",
    unitCost: 285000,
    lastRestocked: "14 September 2026",
  },
  {
    id: "inv-002",
    sku: "PIP-COPPER-058",
    name: "Pipa Tembaga AC Tateyama 1/4 + 3/8 (Roll 15m)",
    category: "PIPING",
    stockAvailable: 4,
    stockAllocated: 2,
    minThreshold: 3,
    unit: "Roll",
    unitCost: 650000,
    lastRestocked: "10 September 2026",
  },
  {
    id: "inv-003",
    sku: "CAP-PANAS-35UF",
    name: "Kapasitor Kompresor 35 uF Panasonic Original",
    category: "AC_PARTS",
    stockAvailable: 22,
    stockAllocated: 4,
    minThreshold: 8,
    unit: "Pcs",
    unitCost: 85000,
    lastRestocked: "18 September 2026",
  },
  {
    id: "inv-004",
    sku: "PCB-MOD-UNIV",
    name: "PCB Board Modul Universal AC Split Multi-Brand",
    category: "ELECTRICAL",
    stockAvailable: 2,
    stockAllocated: 2,
    minThreshold: 4,
    unit: "Unit",
    unitCost: 195000,
    lastRestocked: "02 September 2026",
  },
  {
    id: "inv-005",
    sku: "MCB-SCHN-16A",
    name: "MCB Domae Schneider 1 Phase 16 Ampere",
    category: "ELECTRICAL",
    stockAvailable: 18,
    stockAllocated: 1,
    minThreshold: 6,
    unit: "Pcs",
    unitCost: 55000,
    lastRestocked: "12 September 2026",
  },
];

export const MOCK_PROVIDER_FULFILLMENTS: ProviderFulfillmentItem[] = [
  {
    id: "ful-101",
    orderId: "ord-srv-101",
    customerName: "Sarah Wijaya",
    technicianId: "worker-budi",
    technicianName: "Budi Santoso",
    serviceTitle: "Cuci & Servis Komprehensif AC Inverter",
    items: [
      { name: "Freon R32 (Refill 0.5kg)", quantity: 1, unit: "Pcs", sku: "FRN-R32-DAIKIN" },
      { name: "Kapasitor Kompresor 35 uF", quantity: 1, unit: "Pcs", sku: "CAP-PANAS-35UF" },
    ],
    status: "WAITING_PREP",
  },
  {
    id: "ful-102",
    orderId: "ord-srv-102",
    customerName: "Hendro Gunawan",
    technicianId: "worker-dedi",
    technicianName: "Dedi Supriyadi",
    serviceTitle: "Flushing Pipa Freon & Vacuum AC",
    items: [
      { name: "Pipa Tembaga AC 1/4 + 3/8", quantity: 5, unit: "Meter", sku: "PIP-COPPER-058" },
      { name: "Refrigerant Flush R141b", quantity: 1, unit: "Botol", sku: "CHEM-R141B" },
    ],
    status: "PREPARED",
    preparedAt: "08:15 WIB",
  },
  {
    id: "ful-103",
    orderId: "ord-srv-103",
    customerName: "Rina Kusuma",
    technicianId: "worker-agus",
    technicianName: "Agus Prasetyo",
    serviceTitle: "Ganti Kompresor AC Split 1.5 PK",
    items: [
      { name: "Kompresor Rotary Daikin 1.5PK", quantity: 1, unit: "Unit", sku: "KMP-DKN-15" },
      { name: "Kapasitor 40 uF", quantity: 1, unit: "Pcs", sku: "CAP-40UF" },
    ],
    status: "HANDED_TO_WORKER",
    preparedAt: "07:30 WIB",
  },
];

export const MOCK_WORKSHOP_SHIPMENTS: WorkshopShipment[] = [
  {
    id: "shp-ws-01",
    orderId: "ord-srv-104",
    customerName: "Bambang Sudiro",
    customerPhone: "0812-3344-5566",
    address: "Kebayoran Baru, Jakarta Selatan",
    unitModel: "Modul Inverter Multi-Split Daikin 3PK",
    serviceType: "Reparasi PCB & Penggantian Sensor IC di Workshop",
    direction: "PICKUP_FROM_CUSTOMER",
    scheduledDate: "2026-09-22",
    timeSlot: "09:00 - 11:00 WIB",
    driverName: "Rahmat Hidayat (Kurir Servio Workshop)",
    vehicleNumber: "B 4912 SFV",
    status: "SCHEDULED",
  },
  {
    id: "shp-ws-02",
    orderId: "ord-srv-105",
    customerName: "PT Graha Sentosa (Bpk. Andre)",
    customerPhone: "0811-9876-5432",
    address: "Kuningan City Office Tower Lt. 14, Jaksel",
    unitModel: "Pompa Booster Grundfos CMBE 3-62",
    serviceType: "Rewinding Gulungan Dinamo Pompa",
    direction: "DELIVERY_TO_CUSTOMER",
    scheduledDate: "2026-09-21",
    timeSlot: "14:00 - 16:00 WIB",
    driverName: "Fajar Nugraha",
    vehicleNumber: "B 6789 SKV",
    status: "IN_TRANSIT",
  },
];

export const MOCK_PROVIDER_RETURNS: ProviderReturnClaim[] = [
  {
    id: "ret-prov-001",
    purchaseOrderId: "PO-SERVIO-2026-881",
    supplierName: "PT Jaya Sparepart Refrigerasi Indonesia",
    itemSku: "PCB-MOD-UNIV",
    itemName: "PCB Board Modul Universal AC Split",
    quantity: 2,
    defectReason: "IC Relay gagal boot dan short-circuit saat pengujian voltase",
    status: "APPROVED",
    submittedAt: "19 September 2026",
    refundAmount: 390000,
  },
  {
    id: "ret-prov-002",
    purchaseOrderId: "PO-SERVIO-2026-879",
    supplierName: "CV Maju Cool Teknik Mandiri",
    itemSku: "CAP-PANAS-35UF",
    itemName: "Kapasitor Kompresor 35 uF",
    quantity: 5,
    defectReason: "Kapasitansi drop di bawah 22 uF (cacat batch pabrik)",
    status: "RETURN_DISPATCHED",
    submittedAt: "17 September 2026",
    refundAmount: 425000,
  },
];
