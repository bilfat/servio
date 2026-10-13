import { LiveTrackingData } from "@/types/domain";

export const MOCK_TRACKING_DATA: Record<string, LiveTrackingData> = {
  "order-normal-progress": {
    orderId: "order-normal-progress",
    workerId: "worker-budi",
    workerName: "Budi Santoso",
    workerPhone: "0812-3456-7890",
    workerVehicleNumber: "B 4512 TKO",
    workerLocation: { lat: -6.2425, lng: 106.8521 },
    destinationLocation: { lat: -6.2435, lng: 106.8535 },
    destinationAddress: "Jl. Gandaria Tengah IV No. 12, Kebayoran Baru, Jakarta Selatan",
    estimatedArrivalMinutes: 0,
    distanceKm: 0.1,
    status: "ARRIVED",
    lastUpdated: "Baru saja",
    shareableUrl: "https://servio.id/t/track-live-801",
  },
  "order-quotation-negotiation": {
    orderId: "order-quotation-negotiation",
    workerId: "worker-hendra",
    workerName: "Hendra Wijaya",
    workerPhone: "0813-8821-4321",
    workerVehicleNumber: "B 3982 SEJ",
    workerLocation: { lat: -6.2912, lng: 106.7978 },
    destinationLocation: { lat: -6.2955, lng: 106.8012 },
    destinationAddress: "Cluster Palm Hill No. B3, Cilandak, Jakarta Selatan",
    estimatedArrivalMinutes: 0,
    distanceKm: 0,
    status: "ARRIVED",
    lastUpdated: "5 menit lalu",
    shareableUrl: "https://servio.id/t/track-live-802",
  },
};
