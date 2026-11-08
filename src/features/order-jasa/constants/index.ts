import {
  ServiceOrder,
  CustomerTabType,
  WorkerTabType,
  ProviderTabType,
  ServiceOrderStatus,
  ServiceOrderSubStatus,
} from "../types";

export const CUSTOMER_TABS: { id: CustomerTabType; label: string; description: string }[] = [
  { id: "BELUM_BAYAR", label: "Belum Bayar", description: "Tagihan diagnosis atau pengerjaan yang belum dibayar" },
  { id: "MENUNGGU_JADWAL", label: "Menunggu Jadwal", description: "Booking terkonfirmasi, menunggu jadwal kunjungan teknisi" },
  { id: "BERLANGSUNG", label: "Berlangsung", description: "Teknisi dalam perjalanan, pemeriksaan, atau proses pengerjaan" },
  { id: "SELESAI", label: "Selesai", description: "Pesanan servis yang telah tuntas dikerjakan dan diverifikasi" },
  { id: "BATAL", label: "Batal", description: "Pesanan servis yang dibatalkan beserta riwayat refund" },
];

export const WORKER_TABS: { id: WorkerTabType; label: string; description: string }[] = [
  { id: "TUGAS_MASUK", label: "Tugas Masuk", description: "Penugasan baru yang membutuhkan konfirmasi Anda (30 Menit)" },
  { id: "HARI_INI", label: "Hari Ini", description: "Pekerjaan diterima dengan jadwal kunjungan hari ini" },
  { id: "TERJADWAL", label: "Terjadwal", description: "Pekerjaan diterima untuk tanggal mendatang" },
  { id: "BERLANGSUNG", label: "Berlangsung", description: "Dalam perjalanan (OTW), pemeriksaan lapangan, atau pengerjaan aktif" },
  { id: "SELESAI", label: "Selesai", description: "Pekerjaan fisik selesai, menunggu pembayaran, atau kunjungan diakhiri" },
  { id: "RIWAYAT", label: "Riwayat", description: "Riwayat tugas yang ditolak, kedaluwarsa, atau dibatalkan" },
];

export const PROVIDER_TABS: { id: ProviderTabType; label: string; description: string }[] = [
  { id: "BOOKING_MASUK", label: "Booking Masuk", description: "Pesanan baru yang siap ditugaskan ke teknisi" },
  { id: "PENUGASAN", label: "Penugasan", description: "Status penugasan teknisi, konfirmasi, atau penugasan ulang" },
  { id: "BERLANGSUNG", label: "Berlangsung", description: "Operasional teknisi di lapangan hingga selesai pengerjaan" },
  { id: "SELESAI", label: "Selesai", description: "Pesanan servis selesai dan monitoring pelepasan dana S-Pay" },
  { id: "BATAL", label: "Batal", description: "Pesanan yang dibatalkan dan pencatatan hak dana diagnosis" },
];

export const ADMIN_SERVICE_STATUS_FILTERS = [
  { id: "ALL", label: "Semua Status" },
  { id: "PENDING_PAYMENT", label: "Belum Bayar" },
  { id: "SCHEDULED", label: "Menunggu Jadwal" },
  { id: "IN_PROGRESS", label: "Berlangsung" },
  { id: "COMPLETED", label: "Selesai" },
  { id: "CANCELLED", label: "Batal" },
];

export function resolveCustomerTab(order: ServiceOrder): CustomerTabType {
  // Rule: Satu Order hanya masuk satu tab utama Customer pada satu waktu.
  if (order.status === "CANCELLED" || order.providerDecisionStatus === "REJECTED") {
    return "BATAL";
  }

  if (order.status === "COMPLETED") {
    return "SELESAI";
  }

  // 1. Check if diagnosis payment is PENDING (Belum Bayar)
  if (
    order.paymentSummary?.diagnosisPayment &&
    order.paymentSummary.diagnosisPayment.amount > 0 &&
    order.paymentSummary.diagnosisPayment.status === "PENDING" &&
    order.subStatus === "DIAGNOSIS_PENDING"
  ) {
    return "BELUM_BAYAR";
  }

  // 2. Check if execution payment is PENDING or OVERDUE (Belum Bayar)
  if (
    (order.subStatus === "EXECUTION_PENDING" ||
      order.subStatus === "PAYMENT_OVERDUE" ||
      (order.paymentSummary?.executionPayment &&
        (order.paymentSummary.executionPayment.status === "PENDING" ||
          order.paymentSummary.executionPayment.status === "OVERDUE" ||
          order.paymentSummary.executionPayment.status === "EXPIRED"))) &&
    (order.paymentSummary?.executionPayment?.amount ?? 0) > 0 &&
    order.paymentSummary?.executionPayment?.status !== "PAID"
  ) {
    return "BELUM_BAYAR";
  }

  // 3. Scheduled tab: booking eligible, waiting assignment, or assigned/accepted before OTW
  if (
    (order.status === "SCHEDULED" ||
      order.subStatus === "UNASSIGNED" ||
      order.subStatus === "ASSIGNED_PENDING" ||
      order.subStatus === "WORKER_ACCEPTED" ||
      order.subStatus === "RESCHEDULE_PROPOSED") &&
    order.subStatus !== "PRICE_APPROVED" &&
    order.subStatus !== "WORK_FINISHED" &&
    order.subStatus !== "WAITING_WORKER_CLOSE_VISIT" &&
    order.subStatus !== "VISIT_CLOSED"
  ) {
    return "MENUNGGU_JADWAL";
  }

  // 4. Ongoing flow: OTW through execution, price approved, work finished, visit closed & confirmation
  return "BERLANGSUNG";
}

export function resolveWorkerTab(order: ServiceOrder): WorkerTabType {
  const assignmentStatus = order.assignment?.status;

  // 1. History: rejected, expired, superseded, or cancelled orders
  if (
    assignmentStatus === "REJECTED" ||
    assignmentStatus === "EXPIRED" ||
    (assignmentStatus as string) === "SUPERSEDED" ||
    order.status === "CANCELLED"
  ) {
    return "RIWAYAT";
  }

  // 2. Incoming tasks: assigned, awaiting worker response
  if (assignmentStatus === "ASSIGNED" || order.subStatus === "ASSIGNED_PENDING" || (assignmentStatus as string) === "PENDING") {
    return "TUGAS_MASUK";
  }

  // 3. Selesai: work finished, execution payment pending/paid, visit closed, or completed
  if (
    order.subStatus === "WORK_FINISHED" ||
    order.subStatus === "EXECUTION_PENDING" ||
    order.subStatus === "PAYMENT_OVERDUE" ||
    order.subStatus === "WAITING_WORKER_CLOSE_VISIT" ||
    order.subStatus === "VISIT_CLOSED" ||
    order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" ||
    order.status === "COMPLETED" ||
    Boolean(order.execution?.finishedAt) ||
    order.visit?.status === "CLOSED"
  ) {
    return "SELESAI";
  }

  // 4. Berlangsung: active field visit (OTW, arrived, diagnosis, consent, price approved, execution)
  const isOngoing =
    order.subStatus === "WORKER_OTW" ||
    order.subStatus === "WORKER_ARRIVED" ||
    order.subStatus === "DIAGNOSING" ||
    order.subStatus === "WAITING_CUSTOMER_CONSENT" ||
    order.subStatus === "IN_PERSON_CONSENT_RECORDED" ||
    order.subStatus === "PRICE_APPROVED" ||
    order.subStatus === "EXECUTING" ||
    order.status === "IN_PROGRESS" ||
    order.visit?.status === "OTW" ||
    order.visit?.status === "ON_THE_WAY" ||
    order.visit?.status === "ARRIVED" ||
    order.visit?.status === "DIAGNOSING" ||
    order.visit?.status === "EXECUTING";

  if (isOngoing) {
    return "BERLANGSUNG";
  }

  // 5. Accepted, scheduled pre-OTW: split into HARI_INI vs TERJADWAL based on Asia/Jakarta date
  if (
    assignmentStatus === "ACCEPTED" ||
    order.subStatus === "WORKER_ACCEPTED" ||
    order.status === "SCHEDULED"
  ) {
    const todayJakarta = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const scheduledDate = order.schedule?.date || (order as any).scheduledDate || "";
    if (scheduledDate && scheduledDate > todayJakarta) {
      return "TERJADWAL";
    }
    // If today or past scheduled date, goes to HARI_INI
    return "HARI_INI";
  }

  return "BERLANGSUNG";
}

export function resolveProviderTab(order: ServiceOrder): ProviderTabType {
  // 1. Cancelled orders
  if (order.status === "CANCELLED" || order.providerDecisionStatus === "REJECTED") {
    return "BATAL";
  }

  // 2. Completed orders
  if (order.status === "COMPLETED") {
    return "SELESAI";
  }

  // 3. Ongoing field operations: Worker ACCEPTED through all execution/payment stages
  if (
    order.assignment?.status === "ACCEPTED" ||
    order.subStatus === "WORKER_ACCEPTED" ||
    order.status === "IN_PROGRESS" ||
    order.subStatus === "WORKER_OTW" ||
    order.subStatus === "WORKER_ARRIVED" ||
    order.subStatus === "DIAGNOSING" ||
    order.subStatus === "WAITING_CUSTOMER_CONSENT" ||
    order.subStatus === "IN_PERSON_CONSENT_RECORDED" ||
    order.subStatus === "PRICE_APPROVED" ||
    order.subStatus === "EXECUTING" ||
    order.subStatus === "WORK_FINISHED" ||
    order.subStatus === "EXECUTION_PENDING" ||
    order.subStatus === "PAYMENT_OVERDUE" ||
    order.subStatus === "WAITING_WORKER_CLOSE_VISIT" ||
    order.subStatus === "VISIT_CLOSED" ||
    order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION"
  ) {
    return "BERLANGSUNG";
  }

  // 4. Provider has accepted the order, now awaiting technician assignment
  if (
    order.providerDecisionStatus === "ACCEPTED" ||
    order.assignment?.status === "ASSIGNED" ||
    order.assignment?.status === "REJECTED" ||
    order.assignment?.status === "EXPIRED" ||
    order.subStatus === "ASSIGNED_PENDING"
  ) {
    return "PENUGASAN";
  }

  // 5. Booking Masuk: Incoming reservations waiting for provider acceptance/rejection
  return "BOOKING_MASUK";
}

export function getSubStatusBadgeInfo(subStatus: ServiceOrderSubStatus): {
  label: string;
  variant: "primary" | "success" | "warning" | "danger" | "neutral" | "info";
  description: string;
} {
  switch (subStatus) {
    case "DIAGNOSIS_PENDING":
      return {
        label: "Menunggu Pembayaran Diagnosis",
        variant: "warning",
        description: "Tagihan biaya diagnosis belum diselesaikan pelanggan.",
      };
    case "EXECUTION_PENDING":
      return {
        label: "Menunggu Pembayaran Pengerjaan",
        variant: "warning",
        description: "Pekerjaan teknisi selesai. Menunggu pelunasan pengerjaan oleh pelanggan.",
      };
    case "PAYMENT_OVERDUE":
      return {
        label: "Pembayaran Terlambat",
        variant: "danger",
        description: "Batas 6 jam pembayaran telah lewat. Order tidak otomatis batal, menunggu tindak lanjut.",
      };
    case "UNASSIGNED":
      return {
        label: "Belum Ditugaskan",
        variant: "neutral",
        description: "Booking terverifikasi, provider perlu memilih teknisi pelaksana.",
      };
    case "ASSIGNED_PENDING":
      return {
        label: "Menunggu Konfirmasi Teknisi",
        variant: "info",
        description: "Teknisi memiliki waktu 30 menit untuk menerima penugasan.",
      };
    case "WORKER_ACCEPTED":
      return {
        label: "Teknisi Terkonfirmasi",
        variant: "primary",
        description: "Teknisi telah menerima tugas dan siap berangkat sesuai jadwal.",
      };
    case "RESCHEDULE_PROPOSED":
      return {
        label: "Usulan Jadwal Baru",
        variant: "info",
        description: "Terdapat usulan perubahan tanggal atau slot kunjungan.",
      };
    case "WORKER_OTW":
      return {
        label: "Teknisi Menuju Lokasi",
        variant: "info",
        description: "Teknisi sedang dalam perjalanan menuju alamat pelanggan.",
      };
    case "WORKER_ARRIVED":
      return {
        label: "Teknisi Telah Tiba",
        variant: "info",
        description: "Teknisi telah sampai di lokasi dan siap melakukan pemeriksaan.",
      };
    case "DIAGNOSING":
      return {
        label: "Sedang Diperiksa",
        variant: "primary",
        description: "Teknisi sedang melakukan diagnosa kerusakan dan menyusun rincian biaya.",
      };
    case "WAITING_CUSTOMER_CONSENT":
      return {
        label: "Menunggu Persetujuan Anda",
        variant: "warning",
        description: "Rincian biaya telah dikirim. Menunggu persetujuan pelanggan (30 menit).",
      };
    case "IN_PERSON_CONSENT_RECORDED":
      return {
        label: "Persetujuan di Lokasi Dicatat",
        variant: "success",
        description: "Persetujuan lisan pelanggan di lokasi telah dicatat resmi oleh teknisi.",
      };
    case "PRICE_APPROVED":
      return {
        label: "Harga Telah Disetujui",
        variant: "success",
        description: "Rincian biaya disetujui. Teknisi siap melanjutkan perbaikan fisik.",
      };
    case "EXECUTING":
      return {
        label: "Sedang Dikerjakan",
        variant: "primary",
        description: "Teknisi sedang melaksanakan tindakan perbaikan yang telah disetujui.",
      };
    case "WORK_FINISHED":
      return {
        label: "Pekerjaan Selesai — Menunggu Pembayaran",
        variant: "success",
        description: "Teknisi telah mengunggah bukti hasil kerja. Menunggu pelunasan pembayaran.",
      };
    case "WAITING_WORKER_CLOSE_VISIT":
      return {
        label: "Pembayaran Terverifikasi — Menunggu Tutup Kunjungan",
        variant: "info",
        description: "Pembayaran pengerjaan lunas. Teknisi akan mengakhiri kunjungan di lokasi.",
      };
    case "VISIT_CLOSED":
      return {
        label: "Kunjungan Selesai — Menunggu Konfirmasi Pelanggan",
        variant: "primary",
        description: "Teknisi telah mengakhiri kunjungan operasional. Pelanggan dapat menyelesaikan pesanan.",
      };
    case "AWAITING_CUSTOMER_CONFIRMATION":
      return {
        label: "Menunggu Konfirmasi Selesai",
        variant: "info",
        description: "Pembayaran terverifikasi. Pelanggan dapat mengonfirmasi kepuasan pengerjaan.",
      };
    case "COMPLETED_NORMAL":
      return {
        label: "Selesai (Dikonfirmasi)",
        variant: "success",
        description: "Pesanan servis telah diverifikasi selesai sepenuhnya oleh pelanggan.",
      };
    case "AUTO_COMPLETED_72H":
      return {
        label: "Selesai Otomatis (72 Jam)",
        variant: "success",
        description: "Pesanan diselesaikan otomatis oleh sistem setelah 72 jam tuntas dan lunas.",
      };
    case "CANCELLED_PROVIDER_REJECTED":
      return {
        label: "Ditolak Mitra Toko",
        variant: "danger",
        description: "Mitra penyedia jasa berhalangan menerima pesanan. Biaya survei otomatis dikembalikan 100% ke akun S-Pay pelanggan.",
      };
    case "CANCELLED_BEFORE_OTW":
      return {
        label: "Dibatalkan Sebelum Berangkat",
        variant: "danger",
        description: "Dibatalkan sebelum teknisi berangkat. Pembayaran diagnosis di-refund penuh.",
      };
    case "CANCELLED_DIAGNOSIS_UNPAID":
      return {
        label: "Batal — Tagihan Kedaluwarsa",
        variant: "danger",
        description: "Biaya diagnosis tidak dibayar hingga melewati batas waktu.",
      };
    case "CANCELLED_PRICE_REJECTED":
      return {
        label: "Diagnosis Selesai — Perbaikan Tidak Dilanjutkan",
        variant: "neutral",
        description: "Pemeriksaan selesai. Pelanggan memilih tidak melanjutkan perbaikan. Biaya diagnosis sah menjadi hak mitra.",
      };
    case "CANCELLED_SPAREPART_UNAVAILABLE":
      return {
        label: "Diagnosis Selesai — Suku Cadang Tidak Tersedia",
        variant: "warning",
        description: "Suku cadang tidak tersedia untuk kunjungan ini. Tersedia opsi Lanjutkan Perbaikan.",
      };
    case "CANCELLED_REMOTE_TIMEOUT":
      return {
        label: "Batal — Waktu Respons Habis",
        variant: "danger",
        description: "Batas 30 menit respons persetujuan jarak jauh telah kedaluwarsa.",
      };
    case "CANCELLED_OPERATIONAL_FAILURE":
      return {
        label: "Batal Operasional",
        variant: "danger",
        description: "Terjadi kendala operasional yang sah yang ditangani sistem.",
      };
    default:
      return {
        label: subStatus,
        variant: "neutral",
        description: "",
      };
  }
}
