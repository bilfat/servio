"use client";

import React from "react";
import { SPayProvider } from "@/features/spay/spay.frontend-provider";
import { SPayDetailPage } from "@/components/features/spay/SPayDetailPage";

export default function MerchantSPayPage() {
  return (
    <SPayProvider forcedOwnerType="MERCHANT">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SPayDetailPage
          backHref="/merchant/dashboard"
          backLabel="Kembali ke Dashboard Toko"
        />
      </div>
    </SPayProvider>
  );
}
