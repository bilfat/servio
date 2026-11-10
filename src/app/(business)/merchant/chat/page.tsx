"use client";

import React, { Suspense } from "react";
import { UniversalChatView } from "@/components/chat/UniversalChatView";

export default function MerchantChatPage() {
  return (
    <Suspense fallback={<div className="h-full w-full flex items-center justify-center p-8 text-sm text-slate-500">Memuat obrolan...</div>}>
      <UniversalChatView currentEntityRole="merchant" portalTitle="Chat Pembeli (Merchant)" />
    </Suspense>
  );
}
