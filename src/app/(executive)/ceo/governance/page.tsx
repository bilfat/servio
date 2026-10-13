"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CeoGovernanceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ceo/governance/policies");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px] text-slate-400 text-sm">
      <span>Mengalihkan ke Pusat Tata Kelola Kebijakan Platform...</span>
    </div>
  );
}
