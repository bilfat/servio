/**
 * SERVIO PHASE 07 — AFTER-SALES STATUS ENGINE & UI LABEL MAPPER
 * Baseline: Planning V2.2 FINAL LOCKED
 * Shared across Customer, Merchant, Provider, and Admin roles.
 */

export interface StatusBadgeConfig {
  label: string;
  sublabel?: string;
  badgeClass: string;
  dotClass?: string;
  variant: "info" | "warning" | "success" | "danger" | "purple" | "neutral";
}

/**
 * Format currency IDR safely
 */
export function formatCurrencyIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format timestamp into WIB (Asia/Jakarta)
 */
export function formatWibDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d) + " WIB";
  } catch {
    return "-";
  }
}

/**
 * Calculate remaining SLA hours/time until response_due_at
 */
export function calculateSlaCountdown(dueAtStr: string | null | undefined): {
  isOverdue: boolean;
  remainingText: string;
  hoursLeft: number;
} {
  if (!dueAtStr) {
    return { isOverdue: false, remainingText: "-", hoursLeft: 0 };
  }

  const dueTime = new Date(dueAtStr).getTime();
  const now = Date.now();
  const diffMs = dueTime - now;

  if (diffMs <= 0) {
    const hoursOver = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
    return {
      isOverdue: true,
      remainingText: hoursOver > 0 ? `Terlewat ${hoursOver} jam` : "Tenggat terlewati",
      hoursLeft: 0,
    };
  }

  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursLeft >= 24) {
    const days = Math.floor(hoursLeft / 24);
    const remHours = hoursLeft % 24;
    return {
      isOverdue: false,
      remainingText: `${days} hari ${remHours} jam`,
      hoursLeft,
    };
  }

  return {
    isOverdue: false,
    remainingText: `${hoursLeft} jam ${minutesLeft} menit`,
    hoursLeft,
  };
}

/**
 * Map main_status + substate to display badge and label
 */
export function getCaseMainStatusConfig(
  mainStatus: string | null | undefined,
  substate?: string | null
): StatusBadgeConfig {
  const status = (mainStatus || "SUBMITTED").toUpperCase();
  const sub = (substate || "").toUpperCase();

  switch (status) {
    case "SUBMITTED":
      return {
        label: "Diajukan",
        sublabel: "Menunggu Peninjauan Usaha",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
        dotClass: "bg-sky-500",
        variant: "info",
      };

    case "UNDER_REVIEW":
      if (sub === "AWAITING_CUSTOMER_INFO") {
        return {
          label: "Menunggu Informasi",
          sublabel: "Usaha Meminta Tambahan Bukti",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
          dotClass: "bg-amber-500",
          variant: "warning",
        };
      }
      if (sub === "AWAITING_CUSTOMER_CONSENT") {
        return {
          label: "Menunggu Persetujuan",
          sublabel: "Solusi Alternatif Ditawarkan",
          badgeClass: "bg-purple-50 text-purple-800 border-purple-300",
          dotClass: "bg-purple-500",
          variant: "purple",
        };
      }
      return {
        label: "Ditinjau",
        sublabel: "Sedang Ditinjau Pelaku Usaha",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        dotClass: "bg-blue-500",
        variant: "info",
      };

    case "AWAITING_RETURN":
      return {
        label: "Menunggu Pengembalian",
        sublabel: "Barang Perlu Dikirim Balik",
        badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
        dotClass: "bg-indigo-500",
        variant: "purple",
      };

    case "IN_RESOLUTION":
      return {
        label: "Dalam Penyelesaian",
        sublabel: "Solusi Sedang Dijalankan",
        badgeClass: "bg-blue-50 text-[#0F4C81] border-sky-300",
        dotClass: "bg-[#0F4C81]",
        variant: "info",
      };

    case "COMPLETED":
      return {
        label: "Selesai",
        sublabel: "Solusi Berhasil Diverifikasi",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
        dotClass: "bg-emerald-500",
        variant: "success",
      };

    case "REJECTED":
      return {
        label: "Ditolak",
        sublabel: "Klaim Ditolak Usaha",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
        dotClass: "bg-rose-500",
        variant: "danger",
      };

    case "CANCELLED":
      return {
        label: "Dibatalkan",
        sublabel: "Pengajuan Ditutup",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
        dotClass: "bg-slate-400",
        variant: "neutral",
      };

    default:
      return {
        label: status,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
        dotClass: "bg-slate-400",
        variant: "neutral",
      };
  }
}

/**
 * Map response_state / SLA status
 */
export function getResponseStateConfig(
  responseState: string | null | undefined,
  dueAt?: string | null
): StatusBadgeConfig {
  const state = (responseState || "WAITING").toUpperCase();

  switch (state) {
    case "OVERDUE":
      return {
        label: "TIDAK DITANGGAPI",
        sublabel: "Batas 72 Jam Terlewati",
        badgeClass: "bg-red-50 text-red-800 border-red-300 font-bold",
        dotClass: "bg-red-600 animate-pulse",
        variant: "danger",
      };

    case "RESPONDED":
      return {
        label: "Direspons",
        sublabel: "Tepat Waktu",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-500",
        variant: "success",
      };

    case "WAITING":
    default: {
      const countdown = calculateSlaCountdown(dueAt);
      return {
        label: "Menunggu Respons",
        sublabel: countdown.remainingText,
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
        variant: "warning",
      };
    }
  }
}

/**
 * Map solution code to Indonesian label
 */
export function getSolutionLabel(solutionCode: string | null | undefined): string {
  if (!solutionCode) return "-";
  switch (solutionCode.toUpperCase()) {
    case "REPLACEMENT":
      return "Penggantian Barang";
    case "REWORK":
      return "Perbaikan / Pengerjaan Ulang";
    case "REFUND":
      return "Pengembalian Dana (Refund)";
    case "REPAIR_GOODS":
      return "Perbaikan Barang (Alternatif)";
    default:
      return solutionCode;
  }
}

/**
 * Map Case Type to Indonesian label
 */
export function getCaseTypeLabel(caseType: string | null | undefined): string {
  if (!caseType) return "-";
  switch (caseType.toUpperCase()) {
    case "GOODS_WARRANTY":
      return "Klaim Garansi Barang";
    case "SERVICE_WARRANTY":
      return "Klaim Garansi Jasa";
    case "GOODS_RETURN":
      return "Retur Barang";
    default:
      return caseType;
  }
}

/**
 * Map Refund Subprocess status
 */
export function getRefundSubstatusConfig(status: string | null | undefined): {
  label: string;
  description: string;
  badgeClass: string;
  isAvailable: boolean;
} {
  const s = (status || "PENDING").toUpperCase();
  switch (s) {
    case "SUCCEEDED":
    case "COMPLETED":
      return {
        label: "Dana Berhasil Dikembalikan",
        description: "Saldo telah masuk ke S-Pay Anda dan tersedia untuk digunakan atau ditarik.",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
        isAvailable: true,
      };

    case "PROCESSING":
      return {
        label: "Sedang Diproses Finance",
        description: "Permintaan pengembalian dana telah diverifikasi dan sedang dalam antrean pemindahan dana oleh Finance.",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        isAvailable: false,
      };

    case "PENDING":
    case "APPROVED":
      return {
        label: "Disetujui (Menunggu Eksekusi)",
        description: "Keputusan refund telah disetujui. Sedang menunggu antrean koordinasi dengan layanan Finance.",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        isAvailable: false,
      };

    case "FAILED":
      return {
        label: "Terkendala",
        description: "Pemrosesan refund mengalami kendala teknis. Tim Finance & Support sedang menindaklanjuti.",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
        isAvailable: false,
      };

    default:
      return {
        label: s,
        description: "Status transaksi pengembalian dana tercatat di sistem Finance.",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
        isAvailable: false,
      };
  }
}

/**
 * Map Replacement Substatus (from 05A)
 */
export function getReplacementSubstatusConfig(status: string | null | undefined): {
  label: string;
  description: string;
  badgeClass: string;
} {
  const s = (status || "PREPARING").toUpperCase();
  switch (s) {
    case "DELIVERED":
    case "COMPLETED":
      return {
        label: "Barang Pengganti Diterima",
        description: "Paket barang pengganti telah sampai di alamat tujuan dan diterima dengan baik.",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      };

    case "SHIPPED":
    case "IN_TRANSIT":
      return {
        label: "Sedang Dikirim",
        description: "Barang pengganti telah diserahkan ke kurir dan sedang dalam perjalanan pengiriman.",
        badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
      };

    case "PREPARING":
    default:
      return {
        label: "Sedang Disiapkan",
        description: "Merchant sedang menyiapkan unit pengganti baru dari gudang.",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
      };
  }
}

/**
 * Map Warranty Job Substatus (from 05B)
 */
export function getWarrantyJobSubstatusConfig(status: string | null | undefined): {
  label: string;
  description: string;
  badgeClass: string;
} {
  const s = (status || "ASSIGNED").toUpperCase();
  switch (s) {
    case "COMPLETED":
    case "DONE":
      return {
        label: "Pekerjaan Garansi Selesai",
        description: "Teknisi telah menyelesaikan pengerjaan ulang garansi dan bukti kerja terverifikasi.",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      };

    case "IN_PROGRESS":
    case "ON_THE_WAY":
      return {
        label: "Sedang Dikerjakan",
        description: "Teknisi sedang melakukan perbaikan di lokasi pelanggan.",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
      };

    case "ASSIGNED":
    default:
      return {
        label: "Teknisi Ditugaskan",
        description: "Pekerjaan garansi telah diterbitkan dengan biaya Rp0 (ditanggung garansi resmi).",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
  }
}

