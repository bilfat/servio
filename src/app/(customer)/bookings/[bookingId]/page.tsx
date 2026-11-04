"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  useEffect(() => {
    if (bookingId) {
      router.replace(`/orders/${bookingId}`);
    }
  }, [bookingId, router]);

  return (
    <div className="py-20 text-center text-xs text-slate-500">
      Mengalihkan ke detail pesanan #{bookingId}...
    </div>
  );
}
