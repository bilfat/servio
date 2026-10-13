import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";

export default function OpsLoading() {
  return (
    <ServioLoadingScreen
      message="Menyiapkan Pusat Kendali Operasi..."
      subMessage="Sinkronisasi audit trail dan antrean verifikasi platform"
      fullScreen
    />
  );
}
