export type DisputePriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type DisputeCategory = "DAMAGE_DURING_SERVICE" | "PARTS_MISMATCH" | "UNRESOLVED_DELAY" | "WARRANTY_DENIAL" | "PAYMENT_ISSUE";
export type DisputeDecision = "FREE_REWORK" | "PRICE_ADJUSTMENT" | "FULL_REFUND" | "PARTIAL_REFUND" | "REJECT_CLAIM_RELEASE_ESCROW";

export interface TripartiteChatMessage {
  id: string;
  senderRole: "CUSTOMER" | "PROVIDER" | "SUPPORT_MEDIATOR";
  senderName: string;
  message: string;
  timestamp: string;
  attachmentUrl?: string;
  isSystemNotice?: boolean;
}

export interface SupportCase {
  id: string;
  orderId: string;
  serviceTitle: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  providerId: string;
  providerName: string;
  providerPhone: string;
  category: DisputeCategory;
  priority: DisputePriority;
  slaRemaining: string;
  escrowAmount: number;
  status: "OPEN" | "IN_MEDIATION" | "AWAITING_VENDOR_PROOF" | "ESCALATED_FINANCE" | "RESOLVED";
  createdAt: string;
  assignedTo?: string;
  customerStatement: string;
  providerStatement?: string;
  evidenceBeforePhotos: string[];
  evidenceAfterPhotos: string[];
  warrantyActiveDays: number;
  decision?: {
    type: DisputeDecision;
    notes: string;
    refundAmount?: number;
    decidedAt: string;
    decidedBy: string;
  };
  chatThread: TripartiteChatMessage[];
}

export const MOCK_SUPPORT_CASES: SupportCase[] = [
  {
    id: "disp-901",
    orderId: "order-disputed",
    serviceTitle: "Cuci & Perawatan AC Split 1 PK",
    customerId: "cust-bambang",
    customerName: "Bambang Sudiro",
    customerPhone: "0812-9988-1122",
    customerEmail: "bambang.sudiro@email.com",
    providerId: "prov-bintang-teknik",
    providerName: "Bintang Teknik Mandiri",
    providerPhone: "0811-2233-4455",
    category: "DAMAGE_DURING_SERVICE",
    priority: "URGENT",
    slaRemaining: "28 Menit",
    escrowAmount: 385000,
    status: "IN_MEDIATION",
    createdAt: "2026-09-21T08:30:00.000Z",
    assignedTo: "Rina Kusuma (Senior CS Mediator)",
    customerStatement:
      "Setelah teknisi pulang sore kemarin, air menetes sangat deras dari indoor unit dan membasahi meja kerja laptop. Selang fleksibel tampaknya tersumbat kotoran yang tidak tuntas dibilas.",
    providerStatement:
      "Teknisi kami telah mencuci unit sesuai SOP. Masalah timbul karena pipa buangan lama di dinding rumah pelanggan sudah berlumut tebal. Namun kami bersedia mengirimkan teknisi senior untuk flushing ulang gratis.",
    evidenceBeforePhotos: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
    ],
    evidenceAfterPhotos: [
      "https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?w=600&auto=format&fit=crop&q=80",
    ],
    warrantyActiveDays: 30,
    chatThread: [
      {
        id: "msg-1",
        senderRole: "CUSTOMER",
        senderName: "Bambang Sudiro (Pelanggan)",
        message: "Air masih menetes pagi ini, tolong segera kirim teknisi atau refund dana saya!",
        timestamp: "08:35 WIB",
      },
      {
        id: "msg-2",
        senderRole: "SUPPORT_MEDIATOR",
        senderName: "Rina Kusuma (Mediator CS)",
        message: "Selamat pagi Bpk. Bambang dan tim Bintang Teknik. Kasus ini telah diambil alih oleh Customer Support Servio. Dana pesanan sebesar Rp 385.000 saat ini kami kunci di escrow dan aman.",
        timestamp: "08:38 WIB",
      },
      {
        id: "msg-3",
        senderRole: "PROVIDER",
        senderName: "Bintang Teknik Mandiri (Mitra)",
        message: "Kami siap memberangkatkan teknisi senior Bpk. Hendra hari ini pukul 11.00 WIB untuk pembersihan ulang pipa buang secara gratis.",
        timestamp: "08:44 WIB",
      },
    ],
  },
  {
    id: "disp-902",
    orderId: "ord-srv-102",
    serviceTitle: "Penggantian Kompresor Inverter & Pengisian Freon",
    customerId: "cust-sarah",
    customerName: "Sarah Wijaya",
    customerPhone: "0813-5566-7788",
    customerEmail: "sarah.wijaya@email.com",
    providerId: "prov-sejuk-abadi",
    providerName: "Sejuk Abadi HVAC & Chiller",
    providerPhone: "0812-7788-9900",
    category: "PARTS_MISMATCH",
    priority: "HIGH",
    slaRemaining: "1 Jam 15 Menit",
    escrowAmount: 650000,
    status: "OPEN",
    createdAt: "2026-09-21T09:15:00.000Z",
    customerStatement:
      "Dalam penawaran tertulis kompresor merk Daikin Original, namun saat teknisi memasang kardus yang dibuka berlabel merk generic tidak bermerek.",
    providerStatement:
      "Kami menggunakan OEM certified yang setara karena stok Daikin sedang kosong dari distributor rekanan.",
    evidenceBeforePhotos: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    ],
    evidenceAfterPhotos: [],
    warrantyActiveDays: 60,
    chatThread: [
      {
        id: "msg-10",
        senderRole: "CUSTOMER",
        senderName: "Sarah Wijaya (Pelanggan)",
        message: "Saya tidak terima sparepart dipasang tanpa izin konfirmasi saya terlebih dahulu.",
        timestamp: "09:20 WIB",
      },
    ],
  },
  {
    id: "disp-903",
    orderId: "ord-ws-801",
    serviceTitle: "Reparasi PCB Modul AC Workshop",
    customerId: "cust-rudy",
    customerName: "Rudy Gunawan",
    customerPhone: "0818-4455-6677",
    customerEmail: "rudy.g@email.com",
    providerId: "prov-autopro",
    providerName: "AutoPro Mobile Workshop",
    providerPhone: "0819-3344-5566",
    category: "UNRESOLVED_DELAY",
    priority: "MEDIUM",
    slaRemaining: "3 Jam 40 Menit",
    escrowAmount: 920000,
    status: "ESCALATED_FINANCE",
    createdAt: "2026-09-20T14:00:00.000Z",
    assignedTo: "Doni Prasetyo (Finance & Mediasi)",
    customerStatement:
      "Unit PCB modul dibawa ke workshop sejak 5 hari lalu dan dijanjikan selesai dalam 2 hari. Sampai sekarang belum diantar dan teknisi sulit dihubungi.",
    providerStatement:
      "Komponen IC mikro pengontrol harus diimpor dari Surabaya, paket baru tiba di workshop kemarin sore.",
    evidenceBeforePhotos: [
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80",
    ],
    evidenceAfterPhotos: [],
    warrantyActiveDays: 30,
    chatThread: [
      {
        id: "msg-20",
        senderRole: "CUSTOMER",
        senderName: "Rudy Gunawan",
        message: "Tolong kembalikan unit saya jika tidak sanggup mengerjakan!",
        timestamp: "Kemarin, 14:10 WIB",
      },
    ],
  },
  {
    id: "disp-904",
    orderId: "ord-srv-105",
    serviceTitle: "Hydro Vacuum Kasur King Size 3 Kamar",
    customerId: "cust-graha",
    customerName: "PT Graha Sentosa",
    customerPhone: "0821-9900-1122",
    customerEmail: "admin@grahasentosa.co.id",
    providerId: "prov-klinik-kasur",
    providerName: "Klinik Kasur Higienis",
    providerPhone: "0857-1122-3344",
    category: "WARRANTY_DENIAL",
    priority: "LOW",
    slaRemaining: "Selesai",
    escrowAmount: 1450000,
    status: "RESOLVED",
    createdAt: "2026-09-18T10:00:00.000Z",
    assignedTo: "Rina Kusuma (Senior CS Mediator)",
    customerStatement:
      "Ada 1 kasur di kamar tamu yang masih menyisakan noda kuning samar. Kami minta aktivasi garansi cuci ulang.",
    providerStatement:
      "Telah dijadwalkan ulang dan tim telah mencuci kembali unit kasur kamar tamu pada 19 September 2026.",
    evidenceBeforePhotos: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80",
    ],
    evidenceAfterPhotos: [
      "https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?w=600&auto=format&fit=crop&q=80",
    ],
    warrantyActiveDays: 30,
    decision: {
      type: "FREE_REWORK",
      notes: "Mitra telah mengirimkan teknisi untuk cuci ulang kasur kamar tamu tanpa biaya tambahan. Klien PT Graha Sentosa telah menandatangani bukti serah terima kepuasan.",
      decidedAt: "2026-09-19T14:30:00.000Z",
      decidedBy: "Rina Kusuma",
    },
    chatThread: [],
  },
];

export const INITIAL_SUPPORT_CASES = MOCK_SUPPORT_CASES;
