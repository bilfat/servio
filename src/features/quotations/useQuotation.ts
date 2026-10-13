"use client";

import { useState } from "react";
import { Quotation } from "@/types/domain";
import { MOCK_QUOTATIONS } from "@/mocks/quotations";

export function useQuotation(quotationId: string = "quote-802") {
  const [quotations, setQuotations] = useState<Quotation[]>(MOCK_QUOTATIONS);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const quotation = quotations.find((q) => q.id === quotationId) || quotations[0];

  const acceptQuotation = async () => {
    setIsActionLoading(true);
    await new Promise((r) => setTimeout(r, 80));
    setQuotations((prev) =>
      prev.map((q) => (q.id === quotationId ? { ...q, status: "ACCEPTED" } : q))
    );
    setIsActionLoading(false);
  };

  const rejectQuotation = async () => {
    setIsActionLoading(true);
    await new Promise((r) => setTimeout(r, 80));
    setQuotations((prev) =>
      prev.map((q) => (q.id === quotationId ? { ...q, status: "REJECTED" } : q))
    );
    setIsActionLoading(false);
  };

  const negotiateQuotation = async (note: string) => {
    setIsActionLoading(true);
    await new Promise((r) => setTimeout(r, 80));
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === quotationId ? { ...q, status: "NEGOTIATING", negotiationNote: note } : q
      )
    );
    setIsActionLoading(false);
  };

  const submitOfficialQuote = async (_data?: unknown, _notes?: string) => {
    setIsActionLoading(true);
    await new Promise((r) => setTimeout(r, 80));
    setQuotations((prev) =>
      prev.map((q) => (q.id === quotationId ? { ...q, status: "PENDING_CUSTOMER" } : q))
    );
    setIsActionLoading(false);
  };

  return {
    quotation,
    quotations,
    getQuotationById: (id: string) => quotations.find((q) => q.id.toLowerCase() === id.toLowerCase()) || null,
    acceptQuotation,
    rejectQuotation,
    negotiateQuotation,
    submitOfficialQuote,
    isActionLoading,
  };
}
