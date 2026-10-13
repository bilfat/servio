import { ExecutionSession } from "@/types/domain";

export const MOCK_EXECUTION_SESSIONS: Record<string, ExecutionSession> = {
  "order-normal-progress": {
    orderId: "order-normal-progress",
    workerId: "worker-budi",
    workerName: "Budi Santoso",
    startedAt: "2026-09-21T10:00:00.000Z",
    safetyStopTriggered: false,
    sopChecklist: [
      {
        id: "sop-1",
        stepNumber: 1,
        title: "Uji Fungsi Awal & Suhu Hembusan",
        description: "Ukur suhu hembusan AC sebelum dicuci (Tercatat 24.5°C).",
        isCompleted: true,
        requiresPhoto: true,
        photoUrl: "/mocks/sop-temp-test.jpg",
        completedAt: "10:05",
      },
      {
        id: "sop-2",
        stepNumber: 2,
        title: "Pemasangan Plastik Pelindung Dinding & Stop Kontak",
        description: "Pastikan tidak ada air mengenai area panel listrik dan stop kontak.",
        isCompleted: true,
        requiresPhoto: false,
        completedAt: "10:12",
      },
      {
        id: "sop-3",
        stepNumber: 3,
        title: "Steam Evaporator & Saluran Pembuangan",
        description: "Cuci sirip aluminium evaporator dan tembak saluran pembuangan air agar lendir keluar.",
        isCompleted: false,
        requiresPhoto: true,
      },
      {
        id: "sop-4",
        stepNumber: 4,
        title: "Pembersihan Unit Kondensor Outdoor",
        description: "Semprot sirip kondensor dari arah belakang ke depan.",
        isCompleted: false,
        requiresPhoto: true,
      },
      {
        id: "sop-5",
        stepNumber: 5,
        title: "Uji Coba Akhir & Pengukuran Arus Ampere",
        description: "Nyalakan AC selama 15 menit dan pastikan tidak ada kebocoran air.",
        isCompleted: false,
        requiresPhoto: true,
      },
    ],
    notes: "Unit 1 di ruang keluarga cukup berdebu tebal, unit 2 di kamar tidur utama relatif bersih.",
  },
};
