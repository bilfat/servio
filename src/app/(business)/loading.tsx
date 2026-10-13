import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";

export default function BusinessLoading() {
  return (
    <ServioLoadingScreen
      message="Menyiapkan Workspace Bisnis..."
      subMessage="Memuat inventaris gudang dan operasional mitra"
      fullScreen
    />
  );
}
