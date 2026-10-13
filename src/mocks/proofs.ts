import { ProofOfService } from "@/types/domain";

export const MOCK_PROOFS: Record<string, ProofOfService> = {
  "order-awaiting-proof": {
    orderId: "order-awaiting-proof",
    providerId: "prov-klinik-kasur",
    workerId: "worker-rizky",
    media: [
      {
        id: "pm-1",
        label: "Kondisi Matras Sebelum Dicuci (Banyak Noda)",
        type: "BEFORE",
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80",
        capturedAt: "13:15",
        description: "Tampak bercak kecokelatan di sisi tengah kasur dan debu tungau menumpuk.",
      },
      {
        id: "pm-2",
        label: "Hasil Setelah Ekstraksi & Hydro Vacuum",
        type: "AFTER",
        imageUrl: "https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?w=600&auto=format&fit=crop&q=80",
        capturedAt: "14:40",
        description: "Bercak noda terangkat sempurna, serat kain bersih dan telah disanitasi UV.",
      },
      {
        id: "pm-3",
        label: "Air Ekstraksi Kotoran & Tungau Debu",
        type: "AFTER",
        imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
        capturedAt: "14:42",
        description: "Hasil endapan tabung air vacuum memperlihatkan residu tungau dan debu mikro.",
      },
    ],
    checklistCompleted: true,
    testedParameters: [
      { parameter: "Tingkat Kelembapan Kasur", value: "8% (Aman & Siap Digunakan)", standard: "< 12%" },
      { parameter: "Sterilisasi Sinar UV-C", value: "15 Menit Merata", standard: "10-15 Menit" },
      { parameter: "Aroma Sterilizer", value: "Fresh Lavender Organik", standard: "Non-toxic" },
    ],
    submittedAt: "2026-09-21T14:45:00.000Z",
    verificationStatus: "PENDING_PROVIDER_REVIEW",
    isApprovedByCustomer: false,
  },
};
