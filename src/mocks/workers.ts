import { WorkerTechnician } from "@/types/domain";

export const MOCK_WORKERS: WorkerTechnician[] = [
  {
    id: "eb61b49d-d917-4f68-bda2-d52637643573",
    employeeId: "SMT-AHMAD-RWS",
    providerId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    providerName: "PT Servio Mandiri Teknik",
    name: "Ahmad Teknisi",
    avatarUrl: "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg",
    phone: "+628196677889",
    rating: 5.0,
    completedJobs: 154,
    skills: ["Sertifikasi BNSP Teknisi AC Level 2", "Inverter Specialist", "Instalasi Stop Kontak"],
    isOnline: true,
    currentLocation: {
      lat: -6.2301,
      lng: 106.8502,
      address: "Dekat Stasiun Cawang, Jakarta Selatan",
    },
    vehicleNumber: "B 1928 SMT (Motor Operasional)",
  },
];
