"use client";

import React from "react";
import { SPayProvider } from "@/features/spay/spay.frontend-provider";
import { SPayDetailPage } from "@/components/features/spay/SPayDetailPage";

export default function CustomerSPayPage() {
  return (
    <SPayProvider forcedOwnerType="CUSTOMER">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SPayDetailPage backHref="/" backLabel="Kembali ke Beranda" />
      </div>
    </SPayProvider>
  );
}
