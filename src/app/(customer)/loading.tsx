import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";

export default function CustomerLoading() {
  return (
    <ServioLoadingScreen
      message="Menyiapkan Layanan..."
      subMessage="Lebih dari servis, menghadirkan hari yang lebih baik"
      fullScreen
    />
  );
}
