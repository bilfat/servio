"use client";

import React from "react";
import { SPayProvider } from "@/features/spay/spay.frontend-provider";
import { SPayDetailPage } from "@/components/features/spay/SPayDetailPage";

export default function ProviderSPayPage() {
  return (
    <SPayProvider forcedOwnerType="SERVICE_PROVIDER">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SPayDetailPage
          backHref="/provider/dashboard"
          backLabel="Kembali ke Dashboard Provider"
        />
      </div>
    </SPayProvider>
  );
}
