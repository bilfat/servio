export type ChatCategory = "ALL" | "ACTIVE_ORDER" | "COMPLETED_ORDER" | "GENERAL_INQUIRY";
export type ChatItemType = "SERVICE" | "PRODUCT" | "GENERAL";

export interface ChatAttachment {
  type: "IMAGE" | "FILE";
  url: string;
  name: string;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "merchant" | "provider" | "worker" | "support";
  message: string;
  timestamp: string;
  isRead: boolean;
  attachment?: ChatAttachment;
}

export interface ChatConversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerRoleTitle: string;
  partnerInitials: string;
  partnerColor: string; // Tailwind color class for avatar badge
  isOnline: boolean;
  category: "ACTIVE_ORDER" | "COMPLETED_ORDER" | "GENERAL_INQUIRY";
  itemType: ChatItemType;

  // Contextual info
  orderId?: string;
  orderNumber?: string;
  orderStatus?: string;
  orderHref?: string;

  // Product / Service preview
  itemTitle: string;
  itemSubtitle?: string;
  itemPrice?: number;
  itemImage?: string;
  actionUrl?: string;
  actionLabel?: string;

  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  messages: ChatMessageItem[];
}

export const INITIAL_CHAT_CONVERSATIONS: ChatConversation[] = [
  {
    id: "chat-active-srv-01",
    partnerId: "worker-budi-01",
    partnerName: "Budi Santoso",
    partnerRoleTitle: "Teknisi Lapangan • PT Servio Mandiri Teknik",
    partnerInitials: "BS",
    partnerColor: "bg-purple-600 text-white",
    isOnline: true,
    category: "ACTIVE_ORDER",
    itemType: "SERVICE",
    orderId: "ORD-SRV-2026-9912",
    orderNumber: "ORD-SRV-2026-9912",
    orderStatus: "Teknisi Menuju Lokasi",
    orderHref: "/orders/ORD-SRV-2026-9912",
    itemTitle: "Cuci AC Split Standard & Pembersihan Evaporator",
    itemSubtitle: "Jadwal: Hari Ini, 14:00 - 15:30 WIB",
    itemPrice: 75000,
    actionUrl: "/tracking",
    actionLabel: "Lacak Teknisi",
    unreadCount: 1,
    lastMessage: "Halo Pak Ahmad, saya sudah dekat komplek. Tolong bantu infokan ke pos satpam ya.",
    lastMessageTime: "13:48",
    messages: [
      {
        id: "m-01",
        senderId: "worker-budi-01",
        senderName: "Budi Santoso",
        senderRole: "worker",
        message: "Selamat siang Pak Ahmad, saya teknisi dari PT Servio Mandiri Teknik yang bertugas untuk pengerjaan Cuci AC hari ini.",
        timestamp: "13:30",
        isRead: true,
      },
      {
        id: "m-02",
        senderId: "customer-user",
        senderName: "Ahmad Fauzi",
        senderRole: "customer",
        message: "Siang Pak Budi. Kira-kira estimasi tiba jam berapa ya?",
        timestamp: "13:32",
        isRead: true,
      },
      {
        id: "m-03",
        senderId: "worker-budi-01",
        senderName: "Budi Santoso",
        senderRole: "worker",
        message: "Sekitar 15 menit lagi Pak. Saya membawa peralatan steam bertekanan dan cover plastik pelindung dinding.",
        timestamp: "13:35",
        isRead: true,
      },
      {
        id: "m-04",
        senderId: "worker-budi-01",
        senderName: "Budi Santoso",
        senderRole: "worker",
        message: "Halo Pak Ahmad, saya sudah dekat komplek. Tolong bantu infokan ke pos satpam ya.",
        timestamp: "13:48",
        isRead: false,
      },
    ],
  },
  {
    id: "chat-active-prd-01",
    partnerId: "merchant-jaya-01",
    partnerName: "Jaya Pendingin Glodok",
    partnerRoleTitle: "Merchant Resmi • Toko Suku Cadang Terverifikasi",
    partnerInitials: "JP",
    partnerColor: "bg-blue-600 text-white",
    isOnline: true,
    category: "ACTIVE_ORDER",
    itemType: "PRODUCT",
    orderId: "PO-PRD-88200",
    orderNumber: "PO-PRD-88200",
    orderStatus: "Sedang Dikirim (J&T Cargo)",
    orderHref: "/orders/products/PO-PRD-88200",
    itemTitle: "Manifold Gauge R32 / R410A Double Manometer",
    itemSubtitle: "Resi: JTC-980128391 • 1 Unit",
    itemPrice: 385000,
    actionUrl: "/orders/products/PO-PRD-88200",
    actionLabel: "Lihat Resi",
    unreadCount: 1,
    lastMessage: "Paket manifold gauge sudah di-pickup kurir dengan bubble wrap ekstra tebal ya kak.",
    lastMessageTime: "11:20",
    messages: [
      {
        id: "m-11",
        senderId: "customer-user",
        senderName: "Ahmad Fauzi",
        senderRole: "customer",
        message: "Halo admin, pesanan manifold gauge saya tolong diberi stiker fragile ya karena kaca meteran sensitif benturan.",
        timestamp: "09:10",
        isRead: true,
      },
      {
        id: "m-12",
        senderId: "merchant-jaya-01",
        senderName: "Jaya Pendingin Glodok",
        senderRole: "merchant",
        message: "Siap kak Ahmad, kami pastikan dilapisi bubble wrap tebal 4 lapis plus stiker fragile merah di seluruh sisi dus.",
        timestamp: "09:25",
        isRead: true,
      },
      {
        id: "m-13",
        senderId: "merchant-jaya-01",
        senderName: "Jaya Pendingin Glodok",
        senderRole: "merchant",
        message: "Paket manifold gauge sudah di-pickup kurir dengan bubble wrap ekstra tebal ya kak. Nomor resi JTC-980128391 sudah aktif di sistem.",
        timestamp: "11:20",
        isRead: false,
      },
    ],
  },
  {
    id: "chat-done-srv-01",
    partnerId: "prov-bintang-01",
    partnerName: "Bintang AC Teknik",
    partnerRoleTitle: "Mitra Jasa Terverifikasi • Spesialis Overhaul",
    partnerInitials: "BA",
    partnerColor: "bg-emerald-600 text-white",
    isOnline: false,
    category: "COMPLETED_ORDER",
    itemType: "SERVICE",
    orderId: "ORD-SRV-2026-8842",
    orderNumber: "ORD-SRV-2026-8842",
    orderStatus: "Pesanan Selesai (Garansi 30 Hari)",
    orderHref: "/orders/ORD-SRV-2026-8842",
    itemTitle: "Penggantian Kapasitor & Overhaul Outdoor AC",
    itemSubtitle: "Garansi Toko Aktif s.d. 30 Hari",
    itemPrice: 220000,
    actionUrl: "/warranties",
    actionLabel: "Lihat Garansi",
    unreadCount: 0,
    lastMessage: "Sama-sama Pak Ahmad! Jika ada kendala dingin dalam masa garansi 30 hari langsung infokan kami ya.",
    lastMessageTime: "Kemarin",
    messages: [
      {
        id: "m-21",
        senderId: "worker-budi-01",
        senderName: "Budi (Teknisi)",
        senderRole: "worker",
        message: "Pekerjaan penggantian kapasitor outdoor sudah tuntas Pak. Suhu semburan sudah normal di 18.2°C.",
        timestamp: "Kemarin 16:30",
        isRead: true,
      },
      {
        id: "m-22",
        senderId: "customer-user",
        senderName: "Ahmad Fauzi",
        senderRole: "customer",
        message: "Terima kasih banyak tim Bintang AC, kerjaannya rapi dan outdoornya sekarang sudah senyap kembali.",
        timestamp: "Kemarin 17:05",
        isRead: true,
      },
      {
        id: "m-23",
        senderId: "prov-bintang-01",
        senderName: "Bintang AC Teknik",
        senderRole: "provider",
        message: "Sama-sama Pak Ahmad! Jika ada kendala dingin dalam masa garansi 30 hari langsung infokan kami ya.",
        timestamp: "Kemarin 17:15",
        isRead: true,
      },
    ],
  },
  {
    id: "chat-done-prd-01",
    partnerId: "merchant-mitra-01",
    partnerName: "Mitra Mandiri AC Parts",
    partnerRoleTitle: "Distributor Komponen Resmi",
    partnerInitials: "MM",
    partnerColor: "bg-teal-600 text-white",
    isOnline: false,
    category: "COMPLETED_ORDER",
    itemType: "PRODUCT",
    orderId: "PO-PRD-88102",
    orderNumber: "PO-PRD-88102",
    orderStatus: "Pesanan Selesai",
    orderHref: "/orders/products/PO-PRD-88102",
    itemTitle: "Kapasitor Kompresor AC Daikin & Panasonic 25 uF",
    itemSubtitle: "Diterima: 18 Okt 2026",
    itemPrice: 48000,
    actionUrl: "/products",
    actionLabel: "Beli Lagi",
    unreadCount: 0,
    lastMessage: "Terima kasih atas ulasan bintang 5 nya kak. Senang bisa membantu kebutuhan suku cadang AC Anda.",
    lastMessageTime: "18 Okt",
    messages: [
      {
        id: "m-31",
        senderId: "merchant-mitra-01",
        senderName: "Mitra Mandiri AC Parts",
        senderRole: "merchant",
        message: "Pesanan Kapasitor 25 uF telah tiba di tujuan. Mohon uji coba komponen saat pemasangan ya kak.",
        timestamp: "18 Okt 14:10",
        isRead: true,
      },
      {
        id: "m-32",
        senderId: "customer-user",
        senderName: "Ahmad Fauzi",
        senderRole: "customer",
        message: "Sudah dipasang dan berfungsi normal gan. Produk original mantap.",
        timestamp: "18 Okt 15:40",
        isRead: true,
      },
      {
        id: "m-33",
        senderId: "merchant-mitra-01",
        senderName: "Mitra Mandiri AC Parts",
        senderRole: "merchant",
        message: "Terima kasih atas ulasan bintang 5 nya kak. Senang bisa membantu kebutuhan suku cadang AC Anda.",
        timestamp: "18 Okt 16:00",
        isRead: true,
      },
    ],
  },
  {
    id: "chat-inquiry-prd-01",
    partnerId: "merchant-pusat-01",
    partnerName: "Pusat AC & Sparepart Nusantara",
    partnerRoleTitle: "Toko Merchant • Suku Cadang & Kompresor",
    partnerInitials: "PA",
    partnerColor: "bg-rose-600 text-white",
    isOnline: true,
    category: "GENERAL_INQUIRY",
    itemType: "PRODUCT",
    itemTitle: "Kompresor AC Inverter 1 PK R32 Panasonic Original",
    itemSubtitle: "Konsultasi Kecocokan Tipe Sebelum Beli",
    itemPrice: 1450000,
    actionUrl: "/products",
    actionLabel: "Beli Sekarang",
    unreadCount: 0,
    lastMessage: "Untuk tipe CS-YN9WKJ 100% cocok kak, pipa hisap dan tekan pas tanpa modifikasi nepel.",
    lastMessageTime: "10:15",
    messages: [
      {
        id: "m-41",
        senderId: "customer-user",
        senderName: "Ahmad Fauzi",
        senderRole: "customer",
        message: "Halo min, mau tanya kompresor Panasonic 1 PK R32 ini apakah bisa dipakai untuk unit indoor lama model CS-YN9WKJ?",
        timestamp: "10:02",
        isRead: true,
      },
      {
        id: "m-42",
        senderId: "merchant-pusat-01",
        senderName: "Pusat AC & Sparepart Nusantara",
        senderRole: "merchant",
        message: "Halo kak Ahmad! Bisa sekali kak. Tipe Panasonic CS-YN9WKJ sudah menggunakan freon R32 dengan spesifikasi pipa yang sama persis.",
        timestamp: "10:08",
        isRead: true,
      },
      {
        id: "m-43",
        senderId: "merchant-pusat-01",
        senderName: "Pusat AC & Sparepart Nusantara",
        senderRole: "merchant",
        message: "Untuk tipe CS-YN9WKJ 100% cocok kak, pipa hisap dan tekan pas tanpa modifikasi nepel. Barang ready dan bergaransi resmi toko 30 hari.",
        timestamp: "10:15",
        isRead: true,
      },
    ],
  },
  {
    id: "chat-inquiry-srv-01",
    partnerId: "prov-sejuk-01",
    partnerName: "Sejuk Abadi HVAC Service",
    partnerRoleTitle: "Mitra Jasa Servio • Instalasi & Relokasi AC",
    partnerInitials: "SA",
    partnerColor: "bg-sky-600 text-white",
    isOnline: true,
    category: "GENERAL_INQUIRY",
    itemType: "SERVICE",
    itemTitle: "Bongkar Pasang AC Split (Rumah 2 Lantai)",
    itemSubtitle: "Konsultasi Jalur Pipa & Biaya Sebelum Order",
    itemPrice: 280000,
    actionUrl: "/services",
    actionLabel: "Pesan Jasa",
    unreadCount: 0,
    lastMessage: "Teknisi kami siap bawa tangga 5 meter dan alat vakum digital kak. Silakan order melalui menu Jasa.",
    lastMessageTime: "08:30",
    messages: [
      {
        id: "m-51",
        senderId: "customer-user",
        senderName: "Ahmad Fauzi",
        senderRole: "customer",
        message: "Pagi, mau konsultasi dulu. Kalau mau pasang unit outdoor di dinding luar lantai 2 apakah ada biaya tambahan scaffolding atau tangga tinggi?",
        timestamp: "08:12",
        isRead: true,
      },
      {
        id: "m-52",
        senderId: "prov-sejuk-01",
        senderName: "Sejuk Abadi HVAC Service",
        senderRole: "provider",
        message: "Selamat pagi Pak Ahmad. Jika posisi dinding masih terjangkau tangga teleskopik 5 meter standar teknisi kami, tidak ada biaya alat tambahan kak.",
        timestamp: "08:22",
        isRead: true,
      },
      {
        id: "m-53",
        senderId: "prov-sejuk-01",
        senderName: "Sejuk Abadi HVAC Service",
        senderRole: "provider",
        message: "Teknisi kami siap bawa tangga 5 meter dan alat vakum digital kak. Silakan order melalui menu Jasa ya, kami jadwalkan teknisi berpengalaman.",
        timestamp: "08:30",
        isRead: true,
      },
    ],
  },
];
