import { DisputeCase } from "@/types/domain";

export const MOCK_DISPUTES: DisputeCase[] = [
  {
    id: "disp-901",
    orderId: "order-disputed",
    serviceTitle: "Cuci & Perawatan AC Split 1 PK",
    customerId: "cust-bambang",
    customerName: "Bambang Sudiro",
    providerId: "prov-bintang-teknik",
    providerName: "Bintang Teknik Mandiri",
    reason: "Unit AC Bocor Air Parah Setelah Dicuci",
    detailedComplaint: "Setelah teknisi Budi menyelesaikan pencucian AC dan pulang sekitar pukul 15.30, pada pukul 17.30 air menetes deras membasahi meja kerja dan laptop di bawah unit indoor. Selang pembuangan tampaknya tersumbat lendir yang tidak dibilas bersih.",
    evidencePhotos: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
    ],
    requestedResolution: "FREE_REWORK",
    status: "IN_MEDIATION",
    createdAt: "2026-09-19T17:45:00.000Z",
    mediatorName: "Rina Kusuma (Customer Support Specialist)",
    mediationNotes: "Mitra Bintang Teknik telah menyetujui jadwal kunjungan revisi gratis besok pagi pukul 09:00 untuk membersihkan ulang talang air belakang unit tanpa biaya tambahan.",
  },
];
