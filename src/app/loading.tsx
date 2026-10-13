import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";

export default function Loading() {
  return (
    <ServioLoadingScreen
      message="Menyiapkan Layanan..."
      subMessage="Memuat ekosistem platform SERVIO"
      fullScreen
    />
  );
}
