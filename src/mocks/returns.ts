import { ReturnRequest } from "@/types/domain";

export const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: "ret-701",
    orderId: "order-prod-881",
    productId: "prod-kapasitor-daikin-25uf",
    productTitle: "Kapasitor Kompresor AC Daikin & Panasonic 25 uF",
    merchantId: "merch-jaya-motor",
    merchantName: "Jaya Pendingin Glodok",
    reason: "Ukuran soket terminal tidak cocok dengan AC lama (salah tipe pin)",
    resolutionType: "EXCHANGE",
    evidencePhotoUrls: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    ],
    status: "APPROVED",
    returnCourier: "JNE Regular",
    returnTrackingNumber: "JNE-RET-0988127391",
    refundAmount: 68000,
    createdAt: "2026-09-18T11:20:00.000Z",
  },
];
