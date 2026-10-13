import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";

export default function ExecutiveLoading() {
  return (
    <ServioLoadingScreen
      message="Menyiapkan Dashboard Eksekutif..."
      subMessage="Mengompilasi analitik makro dan tata kelola platform"
      fullScreen
    />
  );
}
