"use client";

import React from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  WarningCircle,
  XCircle,
  CreditCard,
  User,
  MapPin,
  Wrench,
  ShieldCheck,
  ArrowsClockwise,
  ArrowRight,
  Buildings,
  ListChecks,
  Phone,
  Eye,
  CalendarBlank,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";

export interface CurrentOrderStatusPanelProps {
  order: ServiceOrder;
  role: "CUSTOMER" | "WORKER" | "PROVIDER" | "ADMIN" | "FINANCE";
  onOpenSummaryModal?: () => void;
  onOpenActivityHistoryModal?: () => void;

  // Role-specific action triggers passed from layout:
  onAcceptOrder?: () => void;
  onRejectOrder?: () => void;
  onAssignWorker?: () => void;
  onPayDiagnosis?: () => void;
  onPayExecution?: () => void;
  onReviewDiagnosis?: () => void;
  onConfirmCompleted?: () => void;
  onRetryPayment?: () => void;
  onStartTrip?: () => void;
  onArrive?: () => void;
  onStartDiagnosis?: () => void;
  onOpenDiagnosisForm?: () => void;
  onInPersonConsent?: () => void;
  onStartExecution?: () => void;
  onOpenFinishForm?: () => void;
  onCloseVisit?: () => void;

  isActionLoading?: boolean;
}

export function CurrentOrderStatusPanel({
  order,
  role,
  onOpenSummaryModal,
  onOpenActivityHistoryModal,
  onAcceptOrder,
  onRejectOrder,
  onAssignWorker,
  onPayDiagnosis,
  onPayExecution,
  onReviewDiagnosis,
  onConfirmCompleted,
  onRetryPayment,
  onStartTrip,
  onArrive,
  onStartDiagnosis,
  onOpenDiagnosisForm,
  onInPersonConsent,
  onStartExecution,
  onOpenFinishForm,
  onCloseVisit,
  isActionLoading = false,
}: CurrentOrderStatusPanelProps) {
  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return "Rp 0";
    return `Rp ${val.toLocaleString("id-ID")}`;
  };

  const diagPayment = order.paymentSummary?.diagnosisPayment;
  const execPayment = order.paymentSummary?.executionPayment;
  const isCancelled = order.status === "CANCELLED";
  const isCompleted = order.status === "COMPLETED";

  const diagAmount = diagPayment?.amount ?? order.serviceSnapshot?.diagnosisFee ?? 0;
  const execAmount = execPayment?.amount ?? order.diagnosis?.costBreakdown?.grandTotal ?? 0;

  const warrantyDays = order.serviceSnapshot?.warrantyDurationDays;
  const hasWarranty = Boolean(warrantyDays && warrantyDays > 0);
  const warrantyText = hasWarranty
    ? `Garansi Resmi ${warrantyDays} Hari Servio`
    : "Tanpa Garansi Tambahan";

  // =========================================================================
  // AUTHORITATIVE ROLE STATUS RESOLVER
  // Evaluates order state machine per role to output exact active status
  // =========================================================================

  const resolveStatusDetails = () => {
    const sub = order.subStatus as string;
    const isPreArrivedTransitioned = [
      "WORKER_ARRIVED",
      "DIAGNOSING",
      "WAITING_CUSTOMER_CONSENT",
      "PRICE_APPROVED",
      "IN_PERSON_CONSENT_RECORDED",
      "EXECUTING",
      "EXECUTION_IN_PROGRESS",
      "WORK_FINISHED",
      "EXECUTION_PENDING",
      "PAYMENT_OVERDUE",
      "WAITING_WORKER_CLOSE_VISIT",
      "VISIT_CLOSED",
      "AWAITING_CUSTOMER_CONFIRMATION",
      "COMPLETED_NORMAL",
      "AUTO_COMPLETED_72H",
    ].includes(sub);

    const isPostConsentSub = [
      "PRICE_APPROVED",
      "IN_PERSON_CONSENT_RECORDED",
      "EXECUTING",
      "EXECUTION_IN_PROGRESS",
      "WORK_FINISHED",
      "EXECUTION_PENDING",
      "PAYMENT_OVERDUE",
      "WAITING_WORKER_CLOSE_VISIT",
      "VISIT_CLOSED",
      "AWAITING_CUSTOMER_CONFIRMATION",
      "COMPLETED_NORMAL",
      "AUTO_COMPLETED_72H",
    ].includes(sub);

    const isPostExecutionSub = [
      "WORK_FINISHED",
      "EXECUTION_PENDING",
      "PAYMENT_OVERDUE",
      "WAITING_WORKER_CLOSE_VISIT",
      "VISIT_CLOSED",
      "AWAITING_CUSTOMER_CONFIRMATION",
      "COMPLETED_NORMAL",
      "AUTO_COMPLETED_72H",
    ].includes(sub);

    // -----------------------------------------------------------------------
    // CANCELLED or REJECTED (All roles)
    // -----------------------------------------------------------------------
    const isOrderRejected =
      order.providerDecisionStatus === "REJECTED" ||
      order.subStatus === "CANCELLED_PROVIDER_REJECTED";

    if (isCancelled || isOrderRejected) {
      const reasonDetail =
        order.cancellation?.reasonDetail ||
        order.providerRejectionReason ||
        "Pesanan tidak dapat dipenuhi oleh penyedia jasa.";
      const refund = order.paymentSummary?.refundSummary;
      const refundInfo = refund
        ? `Refund: ${formatRupiah(refund.amount)} (${refund.status === "SUCCEEDED" ? "Berhasil ke S-Pay" : refund.status})`
        : `Refund: ${formatRupiah(order.serviceSnapshot?.diagnosisFee || 50000)} (Berhasil ke S-Pay)`;

      return {
        title: isOrderRejected
          ? "Pesanan Ditolak oleh Mitra Toko"
          : role === "PROVIDER"
          ? "Pesanan Ditolak / Dibatalkan"
          : "Pesanan Dibatalkan",
        subStatusLabel: isOrderRejected ? "Ditolak Mitra Toko" : "Pesanan Batal",
        variant: "danger" as const,
        description: isOrderRejected
          ? `Mitra toko menolak pesanan ini dengan alasan: "${reasonDetail}". Biaya survei dikembalikan 100% ke akun S-Pay pelanggan.`
          : `Pesanan telah dihentikan. Alasan: ${reasonDetail}`,
        responsibleParty:
          order.cancellation?.cancelledByName ||
          (isOrderRejected ? order.providerName || "Mitra Toko" : "Sistem Servio"),
        responsibleRole: isOrderRejected ? "PROVIDER" : "SYSTEM",
        nextStep: isOrderRejected
          ? "Pesanan telah resmi ditutup. Dana diagnosis telah kembali 100% ke saldo S-Pay tanpa potongan."
          : "Pesanan telah ditutup. Anda dapat melihat mutasi dompet S-Pay atau memesan layanan baru.",
        contextChips: [
          { label: "Status Akhir", value: isOrderRejected ? "Ditolak Mitra" : "Dibatalkan", icon: XCircle },
          { label: "Jaminan S-Pay", value: refundInfo, highlight: true },
        ],
        lastCompletedStep: isOrderRejected
          ? "Pesanan Ditolak Mitra & Refund 100% Diproses"
          : "Pesanan Dibatalkan & Diproses oleh Sistem",
      };
    }

    // -----------------------------------------------------------------------
    // COMPLETED (All roles)
    // -----------------------------------------------------------------------
    if (isCompleted) {
      const holdUntil = order.paymentSummary?.providerFunds?.heldUntil;
      return {
        title: hasWarranty
          ? "Pesanan Selesai & Garansi Resmi Aktif"
          : "Pesanan Selesai & Pekerjaan Tuntas",
        subStatusLabel: hasWarranty ? "Selesai • Garansi Aktif" : "Pesanan Selesai",
        variant: "success" as const,
        description:
          role === "CUSTOMER"
            ? hasWarranty
              ? `Pekerjaan servis telah Anda verifikasi selesai dan bekerja dengan baik. Pembayaran diproses melalui sistem escrow dan garansi resmi ${warrantyDays} hari kini telah aktif.`
              : "Pekerjaan servis telah Anda verifikasi selesai dan bekerja dengan baik. Pembayaran diteruskan melalui sistem escrow Servio (layanan ini tanpa tambahan masa garansi)."
            : role === "PROVIDER"
            ? hasWarranty
              ? `Pesanan berhasil diselesaikan pelanggan dan garansi ${warrantyDays} hari aktif. Dana mitra dialokasikan ke rekening escrow untuk pencairan otomatis setelah masa perlindungan 120 jam.`
              : "Pesanan berhasil diselesaikan pelanggan. Dana mitra dialokasikan ke rekening escrow dan akan dicairkan otomatis setelah masa perlindungan 120 jam."
            : "Tugas servis Anda telah tuntas dikonfirmasi oleh pelanggan. Riwayat pengerjaan tercatat di rekapitulasi bulanan teknisi.",
        responsibleParty: "Sistem Escrow SERVIO",
        responsibleRole: "ESCROW",
        nextStep:
          role === "CUSTOMER"
            ? hasWarranty
              ? `Beri ulasan kualitas teknisi & mitra toko atau simpan bukti transaksi untuk klaim garansi resmi ${warrantyDays} hari di Pusat Garansi Servio.`
              : "Terima kasih telah memastikan pekerjaan selesai dengan baik! Anda dapat memberi rating & ulasan untuk teknisi dan mitra toko."
            : "Alokasi dana akan otomatis diteruskan ke saldo S-Pay Mitra setelah batas waktu escrow.",
        contextChips: [
          { label: "Status Pesanan", value: "Tuntas (COMPLETED)", icon: CheckCircle },
          {
            label: "Proteksi Garansi",
            value: hasWarranty ? `${warrantyText} (Aktif)` : warrantyText,
            highlight: hasWarranty,
            icon: ShieldCheck,
          },
          ...(role === "PROVIDER" && holdUntil
            ? [{ label: "Pencairan Escrow", value: "Masa Tahan 120 Jam", icon: Clock }]
            : []),
        ],
        lastCompletedStep: "✓ Pelanggan Mengonfirmasi Pekerjaan Selesai & Berfungsi Baik",
        primaryAction:
          role === "CUSTOMER" && onOpenSummaryModal
            ? {
                label: hasWarranty ? "Lihat Ringkasan & Garansi" : "Lihat Ringkasan Pesanan",
                icon: FileText,
                onClick: () => onOpenSummaryModal?.(),
                variant: "success" as const,
              }
            : undefined,
      };
    }

    // -----------------------------------------------------------------------
    // CUSTOMER PERSPECTIVE
    // -----------------------------------------------------------------------
    if (role === "CUSTOMER") {
      // 1. Menunggu Pembayaran Diagnosis
      if (
        order.subStatus === "DIAGNOSIS_PENDING" ||
        (diagPayment && diagPayment.status === "PENDING" && diagPayment.amount > 0)
      ) {
        return {
          title: "Menunggu Pembayaran Biaya Diagnosis",
          subStatusLabel: "Menunggu Pembayaran Diagnosis",
          variant: "warning" as const,
          description:
            "Tagihan biaya reservasi dan survei teknisi telah diterbitkan. Silakan selesaikan pembayaran agar pesanan diteruskan ke antrean mitra penyedia jasa.",
          responsibleParty: "Pelanggan (Anda)",
          responsibleRole: "CUSTOMER",
          nextStep: "Setelah pembayaran diverifikasi, pesanan masuk ke mitra penyedia jasa untuk ditinjau dan dijadwalkan.",
          deadline: { label: "Batas Waktu Pembayaran", value: "6 Jam dari Pemesanan", isUrgent: true },
          contextChips: [
            { label: "Nominal Tagihan", value: formatRupiah(diagAmount), highlight: true, icon: CreditCard },
            { label: "Metode", value: diagPayment?.method || "QRIS / Transfer VA" },
          ],
          lastCompletedStep: "✓ Pemesanan Servis Berhasil Didaftarkan",
          primaryAction: onPayDiagnosis
            ? { label: "Bayar Biaya Diagnosis", icon: CreditCard, onClick: onPayDiagnosis, variant: "warning" as const }
            : undefined,
        };
      }

      // 2. Menunggu Konfirmasi Provider
      if (order.providerDecisionStatus === "PENDING") {
        return {
          title: "Menunggu Konfirmasi Penerimaan Mitra",
          subStatusLabel: "Menunggu Konfirmasi Provider",
          variant: "info" as const,
          description:
            `Biaya diagnosis telah diverifikasi aman di penampung resmi. Pesanan Anda saat ini berada dalam antrean konfirmasi penerimaan oleh mitra "${order.providerName}".`,
          responsibleParty: `Mitra Penyedia Jasa (${order.providerName})`,
          responsibleRole: "PROVIDER",
          nextStep: "Mitra penyedia jasa akan memeriksa jadwal dan mengonfirmasi penerimaan pesanan Anda.",
          deadline: { label: "SLA Konfirmasi Mitra", value: "Maks. 2 Jam Kerja" },
          contextChips: [
            { label: "Mitra Jasa", value: order.providerName, icon: Buildings },
            { label: "Jadwal Kunjungan", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock },
          ],
          lastCompletedStep: "✓ Pembayaran Diagnosis Terverifikasi Aman",
        };
      }

      // 3. Pesanan Diterima — Menunggu Teknisi
      if (
        order.providerDecisionStatus === "ACCEPTED" &&
        (!order.assignment || order.assignment.status === "REJECTED" || order.assignment.status === "EXPIRED")
      ) {
        return {
          title: "Pesanan Diterima — Menjadwalkan Teknisi",
          subStatusLabel: "Pesanan Diterima — Menunggu Teknisi",
          variant: "primary" as const,
          description:
            `Mitra "${order.providerName}" telah resmi menerima pesanan Anda. Saat ini mitra sedang memilih dan menugaskan teknisi bersertifikasi yang sesuai dengan kualifikasi unit.`,
          responsibleParty: `Mitra Penyedia Jasa (${order.providerName})`,
          responsibleRole: "PROVIDER",
          nextStep: "Teknisi resmi akan ditugaskan ke order Anda dan mengonfirmasi kesiapan jadwal kedatangan.",
          contextChips: [
            { label: "Status Mitra", value: "Order Diterima", icon: CheckCircle, highlight: true },
            { label: "Rencana Kunjungan", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock },
          ],
          lastCompletedStep: "✓ Mitra Toko Menerima Permohonan Order",
        };
      }

      // 4. Menunggu Teknisi Menerima
      if (order.assignment?.status === "ASSIGNED" || order.subStatus === "ASSIGNED_PENDING") {
        const workerName = order.assignment?.workerName || "Teknisi Resmi";
        return {
          title: "Menunggu Respon Kesiapan Teknisi",
          subStatusLabel: "Menunggu Teknisi Menerima",
          variant: "info" as const,
          description:
            `Mitra telah menugaskan teknisi ${workerName}. Teknisi sedang mengonfirmasi kesiapan penugasan menuju alamat Anda.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi mengonfirmasi tugas dan mempersiapkan perlengkapan standar inspeksi.",
          deadline: { label: "Batas Respon Teknisi", value: "30 Menit Operasional" },
          contextChips: [
            { label: "Teknisi Ditunjuk", value: workerName, icon: User },
            { label: "Jadwal Kunjungan", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock },
          ],
          lastCompletedStep: "✓ Penugasan Teknisi Dikirim oleh Mitra",
        };
      }

      // 5. Menunggu Jadwal Kunjungan (Evaluasi Hari Ini vs Terjadwal Mendatang)
      if (
        order.subStatus === "WORKER_ACCEPTED" ||
        (order.status === "SCHEDULED" &&
          order.assignment?.status === "ACCEPTED" &&
          order.subStatus !== "WORKER_OTW" &&
          !isPreArrivedTransitioned)
      ) {
        const workerName = order.assignment?.workerName || "Teknisi Lapangan";
        const todayStr = new Date().toISOString().split("T")[0];
        const isFutureDate = Boolean(order.schedule.date && order.schedule.date > todayStr);

        if (isFutureDate) {
          return {
            title: "Pesanan Terjadwal — Menunggu Waktu Servis",
            subStatusLabel: `Terjadwal (${order.schedule.date})`,
            variant: "primary" as const,
            description:
              `Teknisi ${workerName} telah mengonfirmasi penugasan dan siap hadir ke alamat hunian Anda pada ${order.schedule.date} pukul ${order.schedule.timeSlot}. Anda akan menerima notifikasi saat teknisi berangkat pada hari-H.`,
            responsibleParty: `Teknisi Lapangan (${workerName})`,
            responsibleRole: "WORKER",
            nextStep: "Menunggu waktu jadwal servis tiba. Teknisi akan memulai perjalanan pada hari-H pelaksanaan.",
            contextChips: [
              { label: "Status", value: "Terkonfirmasi Terjadwal", highlight: true },
              { label: "Jadwal Servis", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock },
              { label: "Teknisi", value: workerName, icon: User },
            ],
            lastCompletedStep: "✓ Teknisi Menyetujui Tugas & Jadwal Terkonfirmasi",
          };
        }

        return {
          title: "Jadwal Hari Ini — Teknisi Bersiap Berangkat",
          subStatusLabel: "Hari Ini",
          variant: "primary" as const,
          description:
            `Jadwal servis adalah hari ini (${order.schedule.timeSlot}). Teknisi ${workerName} sedang mempersiapkan perlengkapan standar inspeksi dan bersiap menuju lokasi Anda.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi akan menekan mulai perjalanan (OTW) dan lokasi perjalanannya dapat Anda pantau.",
          contextChips: [
            { label: "Teknisi Bertugas", value: workerName, icon: User, highlight: true },
            { label: "Slot Hari Ini", value: order.schedule.timeSlot, icon: Clock },
          ],
          lastCompletedStep: "✓ Teknisi Menyetujui Tugas & Jadwal Terkonfirmasi",
        };
      }

      // 6. Teknisi Menuju Lokasi
      if (
        order.subStatus === "WORKER_OTW" ||
        (order.visit?.status === "ON_THE_WAY" && !isPreArrivedTransitioned)
      ) {
        const workerName = order.assignment?.workerName || "Teknisi";
        return {
          title: "Teknisi Sedang Menuju ke Lokasi Anda",
          subStatusLabel: "Teknisi Menuju Lokasi",
          variant: "primary" as const,
          description:
            `Teknisi ${workerName} sedang dalam perjalanan menuju alamat kunjungan Anda. Harap pastikan ada perwakilan di lokasi untuk menyambut teknisi.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi tiba di alamat dan menekan konfirmasi ketibaan di lokasi.",
          contextChips: [
            { label: "Teknisi Lapangan", value: workerName, icon: User },
            { label: "Kontak Teknisi", value: order.assignment?.workerPhone || "-", icon: Phone },
          ],
          lastCompletedStep: "✓ Teknisi Memulai Perjalanan dari Bengkel/Posko",
        };
      }

      // 7. Teknisi Tiba
      if (
        order.subStatus === "WORKER_ARRIVED" ||
        (order.visit?.status === "ARRIVED" &&
          !order.diagnosis &&
          order.subStatus !== "DIAGNOSING" &&
          order.subStatus !== "WAITING_CUSTOMER_CONSENT" &&
          !isPostConsentSub)
      ) {
        const workerName = order.assignment?.workerName || "Teknisi";
        return {
          title: "Teknisi Telah Tiba di Lokasi",
          subStatusLabel: "Teknisi Tiba",
          variant: "success" as const,
          description:
            `Teknisi ${workerName} telah sampai di lokasi hunian Anda dan sedang bersiap memulai inspeksi fisik unit yang bermasalah.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi memulai pemeriksaan menyeluruh dan mendiagnosis kerusakan unit.",
          contextChips: [
            { label: "Lokasi Kunjungan", value: order.addressSnapshot.city, icon: MapPin },
            { label: "Teknisi", value: workerName, icon: User },
          ],
          lastCompletedStep: "✓ Teknisi Tiba di Alamat Kunjungan",
        };
      }

      // 8. Sedang Diperiksa (Diagnosis)
      if (order.subStatus === "DIAGNOSING") {
        const workerName = order.assignment?.workerName || "Teknisi";
        return {
          title: "Unit Sedang Diperiksa (Proses Diagnosis)",
          subStatusLabel: "Sedang Diperiksa",
          variant: "primary" as const,
          description:
            `Teknisi ${workerName} sedang melakukan pembongkaran awal, pengecekan komponen, dan menghitung estimasi kebutuhan suku cadang/jasa perbaikan.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi akan mengunggah laporan hasil diagnosis beserta rincian estimasi biaya untuk Anda setujui.",
          contextChips: [
            { label: "Fase Operasional", value: "Investigasi Teknis Kerusakan", icon: Wrench },
            { label: "Teknisi", value: workerName, icon: User },
          ],
          lastCompletedStep: "✓ Pemeriksaan Fisik Unit Dimulai",
        };
      }

      // 9. Perlu Persetujuan Harga
      if (
        order.subStatus === "WAITING_CUSTOMER_CONSENT" ||
        (order.diagnosis?.status === "SUBMITTED" &&
          order.diagnosis?.consent?.type !== "REMOTE_APPROVED" &&
          order.diagnosis?.consent?.type !== "IN_PERSON_RECORDED" &&
          !isPostConsentSub)
      ) {
        return {
          title: "Persetujuan Rincian Biaya Perbaikan Diperlukan",
          subStatusLabel: "Perlu Persetujuan Harga",
          variant: "warning" as const,
          description:
            "Teknisi telah menyelesaikan pemeriksaan dan mengajukan estimasi rincian biaya pengerjaan serta suku cadang. Silakan tinjau dan tanggapi penawaran perbaikan.",
          responsibleParty: "Pelanggan (Anda)",
          responsibleRole: "CUSTOMER",
          nextStep: "Anda dapat menyetujui biaya secara langsung (in-person) atau menanggapi lewat aplikasi sebelum teknisi mulai bekerja.",
          deadline: { label: "Batas Tanggapan Remote", value: "30 Menit", isUrgent: true },
          contextChips: [
            { label: "Estimasi Biaya", value: formatRupiah(execAmount), highlight: true, icon: CreditCard },
            { label: "Temuan Kerusakan", value: order.diagnosis?.findings || "Komponen perlu perbaikan/penggantian" },
          ],
          lastCompletedStep: "✓ Form Diagnosis & Estimasi Harga Diajukan Teknisi",
          primaryAction: onReviewDiagnosis
            ? { label: "Tanggapi Hasil Pemeriksaan", icon: CheckCircle, onClick: onReviewDiagnosis, variant: "primary" as const }
            : undefined,
        };
      }

      // 10. Harga Disetujui
      if (
        (order.subStatus === "PRICE_APPROVED" ||
          order.subStatus === "IN_PERSON_CONSENT_RECORDED") &&
        !isPostExecutionSub
      ) {
        const isInPerson =
          order.diagnosis?.consent?.type === "IN_PERSON_RECORDED" ||
          order.subStatus === "IN_PERSON_CONSENT_RECORDED";

        return {
          title: isInPerson
            ? "Biaya Disetujui di Lokasi — Perbaikan Dimulai"
            : "Rincian Biaya Telah Disetujui",
          subStatusLabel: isInPerson ? "Persetujuan di Lokasi" : "Harga Disetujui",
          variant: "success" as const,
          description: isInPerson
            ? `Persetujuan di Lokasi Terverifikasi: Estimasi biaya pengerjaan sebesar ${formatRupiah(execAmount)} telah disetujui secara langsung di tempat bersama teknisi. Teknisi segera memulai tindakan perbaikan unit.`
            : "Estimasi biaya perbaikan telah disepakati oleh Anda dan teknisi. Teknisi sedang mempersiapkan alat kerja dan suku cadang untuk memulai perbaikan fisik.",
          responsibleParty: `Teknisi Lapangan (${order.assignment?.workerName || "Teknisi"})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi memulai perbaikan fisik dan pengujian performa alat.",
          contextChips: [
            { label: "Status Persetujuan", value: isInPerson ? "Tatap Muka di Lokasi" : "Disetujui di Aplikasi", highlight: true, icon: CheckCircle },
            { label: "Biaya Disetujui", value: formatRupiah(execAmount), highlight: true },
          ],
          lastCompletedStep: "✓ Rincian Biaya Perbaikan Disetujui",
        };
      }

      // 11. Sedang Dikerjakan (Eksekusi Fisik)
      if (
        order.subStatus === "EXECUTING" ||
        (order.status === "IN_PROGRESS" && (order.subStatus as string) === "EXECUTION_IN_PROGRESS") ||
        ((order.visit?.status === "EXECUTING" || Boolean(order.execution && !order.execution.finishedAt)) &&
          !isPostExecutionSub)
      ) {
        return {
          title: "Tindakan Perbaikan Fisik Sedang Berlangsung",
          subStatusLabel: "Sedang Dikerjakan",
          variant: "primary" as const,
          description:
            "Teknisi sedang melaksanakan perbaikan fisik, pembersihan, atau penggantian komponen sesuai kesepakatan diagnosa.",
          responsibleParty: `Teknisi Lapangan (${order.assignment?.workerName || "Teknisi"})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi akan menguji fungsi alat, mengambil foto dokumentasi hasil perbaikan, dan menyatakan pengerjaan fisik selesai.",
          contextChips: [
            { label: "Progres Fisik", value: "Perbaikan & Pengujian Komponen", icon: Wrench },
            { label: "Alamat Pengerjaan", value: order.addressSnapshot.fullAddress },
          ],
          lastCompletedStep: "✓ Teknisi Memulai Pengerjaan Fisik",
        };
      }

      // 12. Bayar Pengerjaan (Worker Finished -> Awaiting Execution Payment)
      if (
        (order.subStatus === "WORK_FINISHED" ||
          order.subStatus === "EXECUTION_PENDING" ||
          order.subStatus === "PAYMENT_OVERDUE") &&
        execPayment?.status !== "PAID"
      ) {
        const isOverdue = order.subStatus === "PAYMENT_OVERDUE" || execPayment?.status === "OVERDUE";
        return {
          title: isOverdue ? "Invoice Pelunasan Kadaluarsa — Buat Tagihan Baru" : "Pekerjaan Selesai — Menunggu Pelunasan",
          subStatusLabel: "Bayar Pengerjaan",
          variant: isOverdue ? ("danger" as const) : ("warning" as const),
          description: isOverdue
            ? "Batas waktu pembayaran 6 jam sebelumnya telah berakhir. Pesanan tetap aman dan tidak dibatalkan. Silakan terbitkan invoice pengganti untuk melunasi."
            : "Teknisi telah menyelesaikan tindakan fisik perbaikan dan menguji fungsi alat. Silakan lakukan pelunasan pengerjaan. Dana ditampung aman di escrow.",
          responsibleParty: "Pelanggan (Anda)",
          responsibleRole: "CUSTOMER",
          nextStep: "Setelah Anda melunasi tagihan pengerjaan, teknisi akan merapikan area kerja dan menutup kunjungan fisik.",
          deadline: { label: "Batas Waktu Pelunasan", value: "6 Jam SLA", isUrgent: true },
          contextChips: [
            { label: "Total Pelunasan", value: formatRupiah(execAmount), highlight: true, icon: CreditCard },
            { label: "Nomor Invoice", value: execPayment?.invoiceNo || "-" },
          ],
          lastCompletedStep: "✓ Pengerjaan Fisik Selesai & Tagihan Diterbitkan",
          primaryAction: isOverdue && onRetryPayment
            ? { label: "Buat Tagihan Pengganti & Bayar", icon: ArrowsClockwise, onClick: onRetryPayment, variant: "primary" as const }
            : onPayExecution
            ? { label: "Bayar Pelunasan Sekarang", icon: CreditCard, onClick: onPayExecution, variant: "primary" as const }
            : undefined,
        };
      }

      // 13. Pembayaran Berhasil — Menunggu Teknisi
      if (
        order.subStatus !== "VISIT_CLOSED" &&
        order.subStatus !== "AWAITING_CUSTOMER_CONFIRMATION" &&
        order.visit?.status !== "CLOSED" &&
        (order.subStatus === "WAITING_WORKER_CLOSE_VISIT" || execPayment?.status === "PAID")
      ) {
        return {
          title: "Pembayaran Berhasil — Menunggu Teknisi Menutup Kunjungan",
          subStatusLabel: "Pembayaran Berhasil — Menunggu Teknisi",
          variant: "info" as const,
          description:
            "Pelunasan pengerjaan telah berhasil diverifikasi oleh sistem penampung resmi. Teknisi sedang merapikan peralatan kerja dan menyelesaikan penutupan kunjungan.",
          responsibleParty: `Teknisi Lapangan (${order.assignment?.workerName || "Teknisi"})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi menekan 'Akhiri Kunjungan' untuk menyerahkan unit kepada Anda secara resmi.",
          contextChips: [
            { label: "Status Pelunasan", value: "Lunas (Diamankan Escrow)", icon: CheckCircle, highlight: true },
            { label: "Teknisi Bertugas", value: order.assignment?.workerName || "Teknisi" },
          ],
          lastCompletedStep: "✓ Pembayaran Pengerjaan Berhasil Diverifikasi Sistem",
        };
      }

      // 14. Menunggu Konfirmasi Pekerjaan Selesai (Visit Closed)
      if (
        order.subStatus === "VISIT_CLOSED" ||
        order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" ||
        (execPayment?.status === "PAID" && order.visit?.status === "CLOSED")
      ) {
        const workerName = order.assignment?.workerName || "Teknisi bertugas";
        return {
          title: "Kunjungan Ditutup — Konfirmasi Pekerjaan Telah Selesai",
          subStatusLabel: "Menunggu Konfirmasi Pekerjaan Selesai",
          variant: "success" as const,
          description:
            `Pembayaran Anda telah lunas dan teknisi ${workerName} telah resmi menutup kunjungan. Pastikan kembali hasil pekerjaan sudah rapi dan unit bekerja dengan baik sebelum menekan 'Pekerjaan Telah Selesai'.`,
          responsibleParty: "Pelanggan (Anda)",
          responsibleRole: "CUSTOMER",
          nextStep: hasWarranty
            ? `Klik 'Pekerjaan Telah Selesai' jika Anda sudah puas dengan hasilnya. Status akan menjadi COMPLETED dan garansi resmi ${warrantyDays} hari langsung aktif.`
            : "Klik 'Pekerjaan Telah Selesai' setelah Anda memastikan unit berfungsi normal dan hasilnya memuaskan (layanan ini tanpa tambahan masa garansi).",
          deadline: { label: "Konfirmasi Otomatis", value: "72 Jam Tanpa Komplain" },
          contextChips: [
            { label: "Kunjungan Fisik", value: "Telah Ditutup Teknisi", icon: CheckCircle },
            { label: "Hasil Uji Teknisi", value: order.execution?.testResults || "Fungsi Normal", highlight: true },
            { label: "Jaminan Garansi", value: warrantyText, icon: ShieldCheck },
          ],
          lastCompletedStep: "✓ Teknisi Menutup Kunjungan Fisik Secara Resmi",
          primaryAction: onConfirmCompleted
            ? { label: "Pekerjaan Telah Selesai", icon: CheckCircle, onClick: onConfirmCompleted, variant: "success" as const }
            : undefined,
        };
      }
    }

    // -----------------------------------------------------------------------
    // PROVIDER PERSPECTIVE
    // -----------------------------------------------------------------------
    if (role === "PROVIDER") {
      // 1. Booking Masuk — Perlu Keputusan (Gate C)
      // Strictly when provider has NOT yet made a decision (still PENDING):
      if (order.providerDecisionStatus === "PENDING") {
        return {
          title: "Permohonan Booking Masuk — Perlu Keputusan Mitra",
          subStatusLabel: "Booking Masuk — Perlu Keputusan",
          variant: "warning" as const,
          description:
            "Pelanggan telah mengajukan permohonan servis dan biaya survei telah terverifikasi aman. Silakan tinjau keluhan serta jadwal, lalu putuskan untuk menerima atau menolak order.",
          responsibleParty: "Mitra Penyedia Jasa (Anda)",
          responsibleRole: "PROVIDER",
          nextStep: "Jika diterima, Anda dapat memilih dan menugaskan teknisi. Jika ditolak, dana survei 100% dikembalikan otomatis ke pelanggan.",
          deadline: { label: "Batas Respon Keputusan", value: "2 Jam Operasional", isUrgent: true },
          contextChips: [
            { label: "Layanan Dipesan", value: order.serviceSnapshot.title },
            { label: "Jadwal Kunjungan", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock, highlight: true },
            { label: "Alamat Hunian", value: `${order.addressSnapshot.city}`, icon: MapPin },
          ],
          lastCompletedStep: "✓ Pembayaran Survei Pelanggan Terverifikasi",
          primaryAction: onAcceptOrder
            ? { label: "Terima Order", icon: CheckCircle, onClick: onAcceptOrder, variant: "success" as const }
            : undefined,
          secondaryAction: onRejectOrder
            ? { label: "Tolak Order", icon: XCircle, onClick: onRejectOrder, variant: "danger" as const }
            : undefined,
        };
      }

      // 2. Pesanan Diterima — Pilih Teknisi (Gate D)
      // When provider has ACCEPTED, but technician is not yet assigned:
      if (
        order.providerDecisionStatus === "ACCEPTED" &&
        (!order.assignment || order.assignment.status === "REJECTED" || order.assignment.status === "EXPIRED" || order.subStatus === "UNASSIGNED")
      ) {
        return {
          title: "Pesanan Telah Diterima — Tugaskan Teknisi Resmi",
          subStatusLabel: "Pesanan Diterima — Pilih Teknisi",
          variant: "primary" as const,
          description:
            "Pesanan telah Anda terima. Segera pilih dan tugaskan teknisi bersertifikasi dari daftar tim bengkel Anda untuk jadwal pengerjaan ini.",
          responsibleParty: "Mitra Penyedia Jasa (Anda)",
          responsibleRole: "PROVIDER",
          nextStep: "Pilih teknisi lapangan yang tersedia. Teknisi terpilih akan menerima notifikasi lembar tugas dengan SLA konfirmasi 30 menit.",
          contextChips: [
            { label: "Status Keputusan", value: "Order Diterima", icon: CheckCircle, highlight: true },
            { label: "Jadwal Kunjungan", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock },
            { label: "Alamat Pengerjaan", value: `${order.addressSnapshot.city}`, icon: MapPin },
          ],
          lastCompletedStep: "✓ Mitra Menyetujui Penerimaan Order",
          primaryAction: onAssignWorker
            ? { label: "Pilih & Tugaskan Teknisi", icon: User, onClick: onAssignWorker, variant: "primary" as const }
            : undefined,
        };
      }

      // 3. Menunggu Respons Teknisi
      if (order.assignment?.status === "ASSIGNED" || order.subStatus === "ASSIGNED_PENDING") {
        const workerName = order.assignment?.workerName || "Teknisi";
        return {
          title: "Menunggu Konfirmasi Penerimaan Tugas Teknisi",
          subStatusLabel: "Menunggu Respons Teknisi",
          variant: "info" as const,
          description:
            `Tugas servis telah dikirimkan kepada teknisi ${workerName}. Menunggu teknisi merespon konfirmasi kesiapan penugasan.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: "Jika teknisi tidak merespon dalam batas waktu atau menolak tugas, Anda dapat mengalihkan penugasan ke teknisi lain.",
          deadline: { label: "Batas Respon Tugas", value: "30 Menit SLA", isUrgent: true },
          contextChips: [
            { label: "Teknisi Bertugas", value: workerName, icon: User },
            { label: "Telepon Teknisi", value: order.assignment?.workerPhone || "-" },
          ],
          lastCompletedStep: "✓ Notifikasi Penugasan Terkirim ke Teknisi",
          primaryAction: onAssignWorker
            ? { label: "Tugaskan Ulang Teknisi Lain", icon: ArrowsClockwise, onClick: onAssignWorker, variant: "primary" as const }
            : undefined,
        };
      }

      // 4. Teknisi Siap Berangkat
      if (
        order.subStatus === "WORKER_ACCEPTED" ||
        (order.status === "SCHEDULED" &&
          order.assignment?.status === "ACCEPTED" &&
          order.subStatus !== "WORKER_OTW" &&
          !isPreArrivedTransitioned)
      ) {
        const workerName = order.assignment?.workerName || "Teknisi";
        const todayStr = new Date().toISOString().split("T")[0];
        const isFutureDate = Boolean(order.schedule.date && order.schedule.date > todayStr);

        return {
          title: isFutureDate
            ? "Pesanan Terjadwal — Menunggu Waktu Servis"
            : "Jadwal Hari Ini — Teknisi Bersiap Berangkat",
          subStatusLabel: isFutureDate
            ? `Terjadwal (${order.schedule.date})`
            : "Teknisi Siap Berangkat (Hari Ini)",
          variant: "primary" as const,
          description: isFutureDate
            ? `Teknisi ${workerName} telah mengonfirmasi kesiapan penugasan untuk tanggal ${order.schedule.date} (${order.schedule.timeSlot}). Pesanan masuk antrean jadwal kerja mendatang.`
            : `Teknisi ${workerName} terjadwal hari ini (${order.schedule.timeSlot}) dan bersiap menuju alamat pelanggan.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: isFutureDate
            ? `Menunggu hari-H kunjungan (${order.schedule.date}). Sistem akan memantau keberangkatan teknisi secara otomatis.`
            : "Pantau waktu keberangkatan teknisi menuju alamat pelanggan.",
          contextChips: [
            { label: "Teknisi Terkonfirmasi", value: workerName, icon: User, highlight: true },
            { label: "Jadwal Servis", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock },
            ...(isFutureDate ? [{ label: "Status Waktu", value: "Menunggu Jadwal", icon: CalendarBlank }] : []),
          ],
          lastCompletedStep: "✓ Teknisi Menyetujui Tugas Kunjungan",
        };
      }

      // 5-7. Perjalanan, Ketibaan & Diagnosis
      if (
        order.subStatus === "WORKER_OTW" ||
        order.subStatus === "WORKER_ARRIVED" ||
        order.subStatus === "DIAGNOSING"
      ) {
        const stageLabel =
          order.subStatus === "WORKER_OTW"
            ? "Teknisi Menuju Lokasi"
            : order.subStatus === "WORKER_ARRIVED"
            ? "Teknisi Tiba di Lokasi"
            : "Sedang Melakukan Diagnosis Unit";
        return {
          title: `Operasional Lapangan — ${stageLabel}`,
          subStatusLabel: stageLabel,
          variant: "primary" as const,
          description:
            `Teknisi ${order.assignment?.workerName || "Teknisi"} sedang menjalankan operasional di lapangan. Pantau progres melalui laporan timeline.`,
          responsibleParty: `Teknisi Lapangan (${order.assignment?.workerName || "Teknisi"})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi akan mengunggah laporan hasil diagnosis kerusakan dan rincian biaya perbaikan.",
          contextChips: [
            { label: "Fase Lapangan", value: stageLabel, icon: Wrench, highlight: true },
            { label: "Teknisi", value: order.assignment?.workerName || "Teknisi", icon: User },
          ],
          lastCompletedStep: `✓ Progres Lapangan: ${stageLabel}`,
        };
      }

      // 8-10. Persetujuan & Pengerjaan
      if (
        order.subStatus === "WAITING_CUSTOMER_CONSENT" ||
        order.subStatus === "PRICE_APPROVED" ||
        order.subStatus === "IN_PERSON_CONSENT_RECORDED" ||
        order.subStatus === "EXECUTING" ||
        (order.status === "IN_PROGRESS" && (order.subStatus as string) === "EXECUTION_IN_PROGRESS") ||
        ((order.visit?.status === "EXECUTING" || Boolean(order.execution && !order.execution.finishedAt)) &&
          !isPostExecutionSub)
      ) {
        const isExecuting =
          order.subStatus === "EXECUTING" ||
          (order.status === "IN_PROGRESS" && (order.subStatus as string) === "EXECUTION_IN_PROGRESS") ||
          (!isPostExecutionSub &&
            (order.visit?.status === "EXECUTING" || Boolean(order.execution && !order.execution.finishedAt)));
        const consentLabel =
          order.subStatus === "WAITING_CUSTOMER_CONSENT"
            ? "Menunggu Persetujuan Harga Customer"
            : isExecuting
            ? "Pengerjaan Berlangsung"
            : "Harga Disetujui Customer";
        return {
          title: `Perbaikan Unit — ${consentLabel}`,
          subStatusLabel: consentLabel,
          variant: order.subStatus === "WAITING_CUSTOMER_CONSENT" ? ("warning" as const) : ("primary" as const),
          description:
            order.subStatus === "WAITING_CUSTOMER_CONSENT"
              ? `Estimasi biaya perbaikan senilai ${formatRupiah(execAmount)} telah diajukan teknisi dan sedang menunggu persetujuan pelanggan.`
              : `Pengerjaan fisik unit sedang dilaksanakan oleh teknisi sesuai rincian biaya yang telah disepakati.`,
          responsibleParty:
            order.subStatus === "WAITING_CUSTOMER_CONSENT"
              ? "Pelanggan"
              : `Teknisi (${order.assignment?.workerName || "Teknisi"})`,
          responsibleRole: order.subStatus === "WAITING_CUSTOMER_CONSENT" ? "CUSTOMER" : "WORKER",
          nextStep:
            order.subStatus === "WAITING_CUSTOMER_CONSENT"
              ? "Menunggu pelanggan menyetujui rincian pengerjaan."
              : "Teknisi menyelesaikan perbaikan fisik dan mengunggah dokumentasi hasil uji.",
          contextChips: [
            { label: "Estimasi Biaya", value: formatRupiah(execAmount), highlight: true },
            { label: "Status Biaya", value: consentLabel },
          ],
          lastCompletedStep: "✓ Form Diagnosis & Estimasi Biaya Terbit",
        };
      }

      // 11. Menunggu Pembayaran
      if (
        (order.subStatus === "WORK_FINISHED" ||
          order.subStatus === "EXECUTION_PENDING" ||
          order.subStatus === "PAYMENT_OVERDUE") &&
        execPayment?.status !== "PAID"
      ) {
        return {
          title: "Pekerjaan Fisik Selesai — Menunggu Pembayaran Pelanggan",
          subStatusLabel: "Menunggu Pembayaran",
          variant: "warning" as const,
          description:
            `Teknisi telah menyelesaikan tindakan fisik. Tagihan pelunasan senilai ${formatRupiah(execAmount)} sedang ditagihkan ke pelanggan.`,
          responsibleParty: "Pelanggan",
          responsibleRole: "CUSTOMER",
          nextStep: "Pelanggan melunasi tagihan perbaikan melalui gateway pembayaran SERVIO.",
          contextChips: [
            { label: "Tagihan Pengerjaan", value: formatRupiah(execAmount), highlight: true, icon: CreditCard },
            { label: "Batas Waktu", value: "6 Jam SLA Pembayaran" },
          ],
          lastCompletedStep: "✓ Pengerjaan Fisik Teknisi Selesai",
        };
      }

      // 12. Pembayaran Berhasil — Menunggu Worker Menutup Kunjungan
      if (
        order.subStatus !== "VISIT_CLOSED" &&
        order.subStatus !== "AWAITING_CUSTOMER_CONFIRMATION" &&
        order.visit?.status !== "CLOSED" &&
        (order.subStatus === "WAITING_WORKER_CLOSE_VISIT" || execPayment?.status === "PAID")
      ) {
        const workerName = order.assignment?.workerName || "Teknisi";
        return {
          title: "Pelunasan Diterima — Menunggu Teknisi Menutup Kunjungan",
          subStatusLabel: "Pembayaran Berhasil — Menunggu Worker Menutup Kunjungan",
          variant: "info" as const,
          description:
            `Pelanggan telah melunasi biaya servis. Menunggu teknisi ${workerName} merapikan peralatan dan mengakhiri kunjungan secara resmi di aplikasi.`,
          responsibleParty: `Teknisi Lapangan (${workerName})`,
          responsibleRole: "WORKER",
          nextStep: "Teknisi menekan tombol Akhiri Kunjungan.",
          contextChips: [
            { label: "Status Pelunasan", value: "Lunas di Escrow", icon: CheckCircle, highlight: true },
            { label: "Teknisi", value: workerName, icon: User },
          ],
          lastCompletedStep: "✓ Tagihan Pelunasan Diterima & Diverifikasi",
        };
      }

      // 13. Menunggu Konfirmasi Customer (Visit Closed)
      if (
        order.subStatus === "VISIT_CLOSED" ||
        order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" ||
        (execPayment?.status === "PAID" && order.visit?.status === "CLOSED")
      ) {
        return {
          title: "Kunjungan Ditutup — Menunggu Konfirmasi Akhir Pelanggan",
          subStatusLabel: "Menunggu Konfirmasi Customer",
          variant: "primary" as const,
          description:
            "Teknisi telah menyelesaikan seluruh kunjungan. Menunggu pelanggan mengonfirmasi pekerjaan selesai untuk memproses pesanan ke COMPLETED.",
          responsibleParty: "Pelanggan",
          responsibleRole: "CUSTOMER",
          nextStep: "Jika pelanggan tidak merespons dalam 72 jam, sistem akan menyelesaikan pesanan secara otomatis.",
          deadline: { label: "Auto-Confirm Pelanggan", value: "72 Jam SLA" },
          contextChips: [
            { label: "Kunjungan", value: "Telah Ditutup Teknisi", icon: CheckCircle },
            { label: "Estimasi Hak Mitra", value: formatRupiah(order.paymentSummary?.providerFunds?.netAmount || execAmount), highlight: true },
            { label: "Proteksi Layanan", value: warrantyText, icon: ShieldCheck },
          ],
          lastCompletedStep: "✓ Teknisi Menutup Kunjungan Servis",
        };
      }
    }

    // -----------------------------------------------------------------------
    // WORKER PERSPECTIVE
    // -----------------------------------------------------------------------
    if (role === "WORKER") {
      // 1. Tugas Masuk — Terima/Tolak
      if (order.assignment?.status === "ASSIGNED" || order.subStatus === "ASSIGNED_PENDING") {
        return {
          title: "Tugas Servis Baru Masuk — Konfirmasi Kesiapan Anda",
          subStatusLabel: "Tugas Masuk — Terima/Tolak",
          variant: "warning" as const,
          description:
            `Anda ditugaskan oleh mitra untuk melayani order #${order.orderNumber}. Tinjau keluhan dan slot waktu pengerjaan, lalu konfirmasi kesiapan Anda.`,
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: "Terima tugas untuk mengonfirmasi jadwal atau tolak jika Anda berhalangan agar dapat dialihkan ke teknisi lain.",
          deadline: { label: "Batas Waktu Respon", value: "30 Menit", isUrgent: true },
          contextChips: [
            { label: "Jadwal", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock, highlight: true },
            { label: "Alamat", value: order.addressSnapshot.fullAddress, icon: MapPin },
            { label: "Keluhan", value: order.complaint.description || "Kendala unit" },
          ],
          lastCompletedStep: "✓ Mitra Menugaskan Tugas kepada Anda",
          primaryAction: onAcceptOrder
            ? { label: "Terima Tugas", icon: CheckCircle, onClick: onAcceptOrder, variant: "success" as const }
            : undefined,
          secondaryAction: onRejectOrder
            ? { label: "Tolak Tugas", icon: XCircle, onClick: onRejectOrder, variant: "danger" as const }
            : undefined,
        };
      }

      // 2-3. Terjadwal & Siap Berangkat
      if (
        order.subStatus === "WORKER_ACCEPTED" ||
        (order.status === "SCHEDULED" &&
          order.assignment?.status === "ACCEPTED" &&
          order.subStatus !== "WORKER_OTW" &&
          !isPreArrivedTransitioned)
      ) {
        const todayStr = new Date().toISOString().split("T")[0];
        const isFutureDate = Boolean(order.schedule.date && order.schedule.date > todayStr);

        return {
          title: isFutureDate
            ? "Tugas Terjadwal — Menunggu Waktu Servis"
            : "Jadwal Hari Ini — Bersiap Menuju Lokasi",
          subStatusLabel: isFutureDate
            ? `Terjadwal (${order.schedule.date})`
            : "Siap Berangkat (Hari Ini)",
          variant: "primary" as const,
          description: isFutureDate
            ? `Tugas telah Anda terima dan tercatat dalam jadwal kerja Anda pada ${order.schedule.date} (${order.schedule.timeSlot}). Pastikan perlengkapan kerja telah siap sebelum hari-H.`
            : `Tugas dijadwalkan hari ini: ${order.schedule.date} (${order.schedule.timeSlot}). Siapkan perlengkapan kerja dan mulai perjalanan saat siap.`,
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: isFutureDate
            ? `Menunggu hari pelaksanaan servis sesuai jadwal (${order.schedule.date}). Pada hari-H Anda dapat menekan tombol Mulai Perjalanan.`
            : "Saat Anda mulai berangkat menuju lokasi pelanggan, tekan tombol 'Mulai Perjalanan (Menuju Lokasi)'.",
          contextChips: [
            { label: "Pelanggan", value: order.customerName, icon: User },
            { label: "Jadwal", value: `${order.schedule.date} (${order.schedule.timeSlot})`, icon: Clock, highlight: true },
            { label: "Alamat", value: order.addressSnapshot.fullAddress, icon: MapPin },
            ...(isFutureDate ? [{ label: "Waktu", value: "Tugas Terjadwal", icon: CalendarBlank }] : []),
          ],
          lastCompletedStep: "✓ Anda Menyetujui Tugas Ini",
          primaryAction: onStartTrip
            ? {
                label: isFutureDate ? "Mulai Perjalanan (Hari-H)" : "Mulai Perjalanan (Menuju Lokasi)",
                icon: ArrowRight,
                onClick: onStartTrip,
                variant: "primary" as const,
              }
            : undefined,
        };
      }

      // 4. Menuju Lokasi
      if (
        order.subStatus === "WORKER_OTW" ||
        (order.visit?.status === "ON_THE_WAY" && !isPreArrivedTransitioned)
      ) {
        return {
          title: "Dalam Perjalanan Menuju Alamat Pelanggan",
          subStatusLabel: "Menuju Lokasi",
          variant: "primary" as const,
          description:
            "Anda sedang dalam perjalanan. Utamakan keselamatan berkendara. Sesampainya di alamat hunian pelanggan, segera konfirmasi ketibaan.",
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: "Tekan tombol 'Saya Sudah Tiba di Lokasi' setelah Anda sampai di alamat.",
          contextChips: [
            { label: "Tujuan", value: order.addressSnapshot.fullAddress, icon: MapPin, highlight: true },
            { label: "Kontak Pelanggan", value: order.customerPhone, icon: Phone },
          ],
          lastCompletedStep: "✓ Anda Memulai Perjalanan ke Lokasi",
          primaryAction: onArrive
            ? { label: "Saya Sudah Tiba di Lokasi", icon: MapPin, onClick: onArrive, variant: "primary" as const }
            : undefined,
        };
      }

      // 5. Tiba
      if (
        order.subStatus === "WORKER_ARRIVED" ||
        (order.visit?.status === "ARRIVED" &&
          !order.diagnosis &&
          order.subStatus !== "DIAGNOSING" &&
          order.subStatus !== "WAITING_CUSTOMER_CONSENT" &&
          !isPostConsentSub)
      ) {
        return {
          title: "Tiba di Lokasi — Siap Melakukan Pemeriksaan",
          subStatusLabel: "Tiba",
          variant: "success" as const,
          description:
            "Anda telah tiba di alamat pelanggan. Temui pelanggan, sampaikan identitas diri teknisi Servio, dan mulai investigasi fisik unit.",
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: "Tekan 'Mulai Pemeriksaan Unit' untuk membuka pencatatan diagnosis teknis.",
          contextChips: [
            { label: "Alamat Kunjungan", value: order.addressSnapshot.city, icon: MapPin },
            { label: "Pelanggan", value: order.customerName, icon: User },
          ],
          lastCompletedStep: "✓ Anda Tiba di Alamat Pelanggan",
          primaryAction: onStartDiagnosis
            ? { label: "Mulai Pemeriksaan Unit", icon: Wrench, onClick: onStartDiagnosis, variant: "primary" as const }
            : undefined,
        };
      }

      // 6-7. Mulai Pemeriksaan / Form Diagnosis
      if (order.subStatus === "DIAGNOSING") {
        return {
          title: "Pemeriksaan Unit & Penyusunan Estimasi Biaya",
          subStatusLabel: "Form Diagnosis",
          variant: "primary" as const,
          description:
            "Lakukan pemeriksaan teknis secara cermat. Isi ringkasan temuan kerusakan, tindakan perbaikan, dan rincian biaya pengerjaan serta suku cadang.",
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: "Simpan formulir diagnosis dan ajukan estimasi biaya untuk dimintakan persetujuan pelanggan.",
          contextChips: [
            { label: "Tahap", value: "Input Temuan & Biaya", icon: Wrench, highlight: true },
            { label: "Keluhan Awal", value: order.complaint.description || "-" },
          ],
          lastCompletedStep: "✓ Pemeriksaan Unit Dimulai",
          primaryAction: onOpenDiagnosisForm
            ? { label: "Buka Form Diagnosis & Harga", icon: FileText, onClick: onOpenDiagnosisForm, variant: "primary" as const }
            : undefined,
        };
      }

      // 8. Menunggu Persetujuan Harga
      if (
        order.subStatus === "WAITING_CUSTOMER_CONSENT" ||
        (order.diagnosis?.status === "SUBMITTED" &&
          order.diagnosis?.consent?.type !== "REMOTE_APPROVED" &&
          order.diagnosis?.consent?.type !== "IN_PERSON_RECORDED" &&
          !isPostConsentSub)
      ) {
        return {
          title: "Menunggu Persetujuan Rincian Biaya dari Pelanggan",
          subStatusLabel: "Menunggu Persetujuan Harga",
          variant: "warning" as const,
          description:
            `Estimasi biaya perbaikan senilai ${formatRupiah(execAmount)} telah Anda ajukan. Tunggu persetujuan pelanggan di aplikasi atau catat persetujuan langsung (in-person) di lokasi.`,
          responsibleParty: "Pelanggan / Teknisi (In-Person)",
          responsibleRole: "CUSTOMER",
          nextStep: "Jika pelanggan setuju secara lisan di hadapan Anda, gunakan fitur 'Catat Persetujuan di Lokasi'. JANGAN mulai pengerjaan fisik sebelum disetujui!",
          contextChips: [
            { label: "Estimasi Biaya", value: formatRupiah(execAmount), highlight: true, icon: CreditCard },
            { label: "Status Respon", value: "Menunggu Tanggapan Pelanggan" },
          ],
          lastCompletedStep: "✓ Rincian Biaya Berhasil Diajukan",
          primaryAction: onInPersonConsent
            ? { label: "Catat Persetujuan di Lokasi", icon: CheckCircle, onClick: onInPersonConsent, variant: "primary" as const }
            : undefined,
        };
      }

      // 9-10. Harga Disetujui / Lanjutkan Pengerjaan
      if (
        (order.subStatus === "PRICE_APPROVED" || order.subStatus === "IN_PERSON_CONSENT_RECORDED") &&
        !isPostExecutionSub
      ) {
        return {
          title: "Biaya Disetujui — Mulai Pengerjaan Fisik",
          subStatusLabel: "Harga Telah Disetujui",
          variant: "success" as const,
          description:
            "Pelanggan telah menyetujui rincian biaya perbaikan. Siapkan alat kerja dan suku cadang, lalu mulai perbaikan fisik pada unit.",
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: "Ambil foto kondisi unit sebelum dibongkar/diperbaiki (foto before) sebagai kelengkapan bukti kerja.",
          contextChips: [
            { label: "Biaya Disepakati", value: formatRupiah(execAmount), highlight: true },
            { label: "Persetujuan", value: "Sah & Terverifikasi" },
          ],
          lastCompletedStep: "✓ Persetujuan Biaya Dikonfirmasi Sah",
          primaryAction: onStartExecution
            ? { label: "Mulai Pengerjaan Fisik", icon: Wrench, onClick: onStartExecution, variant: "primary" as const }
            : undefined,
        };
      }

      // 11. Sedang Dikerjakan (Eksekusi Fisik)
      if (
        order.subStatus === "EXECUTING" ||
        (order.status === "IN_PROGRESS" && (order.subStatus as string) === "EXECUTION_IN_PROGRESS") ||
        ((order.visit?.status === "EXECUTING" || Boolean(order.execution && !order.execution.finishedAt)) &&
          !isPostExecutionSub)
      ) {
        return {
          title: "Perbaikan Fisik Sedang Berlangsung",
          subStatusLabel: "Sedang Dikerjakan",
          variant: "primary" as const,
          description:
            "Lakukan perbaikan sesuai standar keselamatan operasional Servio. Uji fungsi unit setelah selesai dan ambil foto bukti hasil perbaikan (foto after).",
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: "Setelah unit beroperasi normal, tekan 'Selesaikan Pengerjaan Fisik' untuk menerbitkan tagihan pelunasan ke pelanggan.",
          contextChips: [
            { label: "Tindakan Fisik", value: "Perbaikan & Pengujian", icon: Wrench, highlight: true },
            { label: "Pelanggan", value: order.customerName },
          ],
          lastCompletedStep: "✓ Pengerjaan Fisik Dimulai",
          primaryAction: onOpenFinishForm
            ? { label: "Selesaikan Pengerjaan Fisik", icon: CheckCircle, onClick: onOpenFinishForm, variant: "primary" as const }
            : undefined,
        };
      }

      // 12-13. Selesai Pengerjaan / Menunggu Pembayaran Pelanggan
      if (
        (order.subStatus === "WORK_FINISHED" ||
          order.subStatus === "EXECUTION_PENDING" ||
          order.subStatus === "PAYMENT_OVERDUE") &&
        execPayment?.status !== "PAID"
      ) {
        return {
          title: "Pekerjaan Fisik Selesai — Menunggu Pelunasan Pelanggan",
          subStatusLabel: "Menunggu Pembayaran Customer",
          variant: "warning" as const,
          description:
            `Dokumentasi dan laporan perbaikan telah Anda selesaikan. Invoice pelunasan senilai ${formatRupiah(execAmount)} telah diterbitkan ke pelanggan. Tunggu pelanggan membayar. JANGAN tutup kunjungan sebelum pembayaran lunas!`,
          responsibleParty: "Pelanggan",
          responsibleRole: "CUSTOMER",
          nextStep: "Setelah pelanggan melunasi tagihan di aplikasi, tombol 'Akhiri Kunjungan' akan otomatis aktif.",
          contextChips: [
            { label: "Tagihan Pelunasan", value: formatRupiah(execAmount), highlight: true, icon: CreditCard },
            { label: "Status Kunjungan", value: "Kunjungan Masih Terbuka (Wajib Pelunasan)", icon: WarningCircle },
          ],
          lastCompletedStep: "✓ Pengerjaan Fisik Selesai & Invoice Terbit",
        };
      }

      // 14. Pembayaran Berhasil — Akhiri Kunjungan
      if (
        order.subStatus !== "VISIT_CLOSED" &&
        order.subStatus !== "AWAITING_CUSTOMER_CONFIRMATION" &&
        order.visit?.status !== "CLOSED" &&
        (order.subStatus === "WAITING_WORKER_CLOSE_VISIT" || execPayment?.status === "PAID")
      ) {
        return {
          title: "Pembayaran Telah Lunas — Akhiri Kunjungan Fisik",
          subStatusLabel: "Pembayaran Berhasil — Akhiri Kunjungan",
          variant: "success" as const,
          description:
            "Pembayaran pengerjaan telah berhasil dilunasi oleh pelanggan dan diverifikasi oleh sistem penampung resmi. Rapikan area kerja dan akhiri kunjungan fisik Anda.",
          responsibleParty: "Teknisi (Anda)",
          responsibleRole: "WORKER",
          nextStep: "Tekan tombol 'Akhiri Kunjungan (Tutup Kunjungan)' untuk menyelesaikan tugas lapangan Anda.",
          contextChips: [
            { label: "Status Pelunasan", value: "Lunas (Terverifikasi Sistem)", icon: CheckCircle, highlight: true },
            { label: "Kunjungan", value: "Siap Ditutup", icon: CheckCircle },
          ],
          lastCompletedStep: "✓ Pembayaran Pelunasan Diterima Sistem",
          primaryAction: onCloseVisit
            ? { label: "Akhiri Kunjungan (Tutup Kunjungan)", icon: CheckCircle, onClick: onCloseVisit, variant: "primary" as const }
            : undefined,
        };
      }

      // 15. Kunjungan Ditutup
      if (
        order.subStatus === "VISIT_CLOSED" ||
        order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" ||
        (execPayment?.status === "PAID" && order.visit?.status === "CLOSED")
      ) {
        return {
          title: "Kunjungan Ditutup — Menunggu Konfirmasi Pelanggan",
          subStatusLabel: "Kunjungan Ditutup",
          variant: "info" as const,
          description:
            "Kunjungan fisik telah resmi Anda tutup. Pesanan akan otomatis berstatus COMPLETED setelah pelanggan mengonfirmasi pekerjaan selesai dengan baik atau melewati batas SLA 72 jam.",
          responsibleParty: "Pelanggan",
          responsibleRole: "CUSTOMER",
          nextStep: "Tugas lapangan Anda telah selesai. Pendapatan kerja Anda akan dialokasikan ke rekap bulanan.",
          contextChips: [
            { label: "Kunjungan", value: "Telah Ditutup", icon: CheckCircle },
            { label: "SLA Konfirmasi", value: "72 Jam Auto-Confirm" },
          ],
          lastCompletedStep: "✓ Anda Telah Menutup Kunjungan Servis",
        };
      }
    }

    // -----------------------------------------------------------------------
    // FALLBACK / ADMIN PERSPECTIVE
    // -----------------------------------------------------------------------
    return {
      title: "Status Operasional Pesanan Jasa",
      subStatusLabel: order.subStatus.replace(/_/g, " "),
      variant: "primary" as const,
      description: `Pesanan berada dalam tahap ${order.subStatus}. Memerlukan koordinasi antar-pihak sesuai SOP Servio.`,
      responsibleParty: "Sistem Operasional",
      responsibleRole: "SYSTEM",
      nextStep: "Proses tahapan berikutnya sesuai alur lifecycle Phase 05B.",
      contextChips: [
        { label: "Status Utama", value: order.status },
        { label: "Substatus", value: order.subStatus },
      ],
      lastCompletedStep: "✓ Aktivitas Operasional Terakhir Tercatat",
    };
  };

  const status = resolveStatusDetails();

  const variantStyles = {
    primary: {
      border: "border-sky-300/80 ring-1 ring-sky-200/50",
      bg: "bg-gradient-to-br from-white via-sky-50/40 to-white",
      pill: "bg-sky-100/90 text-[#0F4C81] border-sky-300 font-extrabold",
      accent: "text-[#0F4C81]",
      iconBg: "bg-sky-100 text-[#0F4C81] ring-2 ring-sky-200",
    },
    success: {
      border: "border-emerald-300/80 ring-1 ring-emerald-200/50",
      bg: "bg-gradient-to-br from-white via-emerald-50/30 to-white",
      pill: "bg-emerald-100/90 text-emerald-800 border-emerald-300 font-extrabold",
      accent: "text-emerald-700",
      iconBg: "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-200",
    },
    warning: {
      border: "border-amber-300/80 ring-1 ring-amber-200/50",
      bg: "bg-gradient-to-br from-white via-amber-50/30 to-white",
      pill: "bg-amber-100/90 text-amber-900 border-amber-300 font-extrabold",
      accent: "text-amber-800",
      iconBg: "bg-amber-100 text-amber-900 ring-2 ring-amber-200",
    },
    danger: {
      border: "border-rose-300/80 ring-1 ring-rose-200/50",
      bg: "bg-gradient-to-br from-white via-rose-50/30 to-white",
      pill: "bg-rose-100/90 text-rose-900 border-rose-300 font-extrabold",
      accent: "text-rose-800",
      iconBg: "bg-rose-100 text-rose-900 ring-2 ring-rose-200",
    },
    info: {
      border: "border-indigo-300/80 ring-1 ring-indigo-200/50",
      bg: "bg-gradient-to-br from-white via-indigo-50/30 to-white",
      pill: "bg-indigo-100/90 text-indigo-900 border-indigo-300 font-extrabold",
      accent: "text-indigo-800",
      iconBg: "bg-indigo-100 text-indigo-900 ring-2 ring-indigo-200",
    },
    neutral: {
      border: "border-slate-300/80 ring-1 ring-slate-200/50",
      bg: "bg-gradient-to-br from-white via-slate-50 to-white",
      pill: "bg-slate-100 text-slate-800 border-slate-300 font-extrabold",
      accent: "text-slate-800",
      iconBg: "bg-slate-100 text-slate-800 ring-2 ring-slate-200",
    },
  }[status.variant];

  return (
    <div
      className={`rounded-3xl border-2 ${variantStyles.border} ${variantStyles.bg} p-6 sm:p-7 shadow-xs hover:shadow-sm space-y-4 font-body transition-all`}
    >
      {/* 1. Header Bar: Main Status & Substatus Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${variantStyles.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
            {status.variant === "success" ? (
              <CheckCircle size={20} weight="fill" />
            ) : status.variant === "danger" ? (
              <XCircle size={20} weight="fill" />
            ) : status.variant === "warning" ? (
              <WarningCircle size={20} weight="fill" />
            ) : (
              <Wrench size={20} weight="duotone" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block font-mono">
                Ringkasan Status Aktif &bull; {role}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black font-display text-slate-900 leading-tight tracking-tight">
              {status.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-3xs flex items-center gap-1.5 ${variantStyles.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-current ${!isCompleted && !isCancelled ? "animate-pulse" : ""}`} />
            <span>{status.subStatusLabel}</span>
          </span>
        </div>
      </div>

      {/* 2. Plain Language Explanation */}
      <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/70 shadow-3xs">
        <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-medium">
          {status.description}
        </p>
      </div>

      {/* 3. Responsible Party & Contextual Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {/* Responsible Party Chip */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-3xs hover:border-slate-300 transition-all space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
            Pihak Bertanggung Jawab
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate font-display">
            <User size={14} weight="bold" className="text-primary shrink-0" />
            <span className="truncate">{status.responsibleParty}</span>
          </div>
        </div>

        {/* Dynamic Context Chips */}
        {status.contextChips.map((chip, idx) => {
          const IconComp = chip.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border shadow-3xs transition-all space-y-1 ${
                chip.highlight
                  ? "bg-gradient-to-br from-sky-50/80 to-indigo-50/30 border-primary/40 ring-1 ring-primary/20"
                  : "bg-white border-slate-200/90 hover:border-slate-300"
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                {chip.label}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate font-display">
                {IconComp && <IconComp size={14} weight="bold" className={chip.highlight ? "text-primary shrink-0" : "text-slate-500 shrink-0"} />}
                <span className={chip.highlight ? "text-primary truncate" : "truncate"}>
                  {chip.value}
                </span>
              </div>
            </div>
          );
        })}

        {/* Deadline Chip if Available */}
        {status.deadline && (
          <div
            className={`p-3.5 rounded-2xl border shadow-3xs transition-all space-y-1 ${
              status.deadline.isUrgent
                ? "bg-rose-50/90 border-rose-200 text-rose-900 ring-1 ring-rose-200/60"
                : "bg-white border-slate-200/90 hover:border-slate-300"
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
              {status.deadline.label}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold truncate font-display">
              <Clock size={14} weight="bold" className={status.deadline.isUrgent ? "text-rose-600 shrink-0" : "text-primary shrink-0"} />
              <span className="truncate">{status.deadline.value}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Next Step & Last Completed */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-3xs space-y-2.5 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <ArrowRight size={13} weight="bold" />
          </div>
          <div className="text-xs leading-relaxed flex-1">
            <strong className="text-slate-900 font-extrabold uppercase text-[10px] tracking-wider block text-primary mb-0.5">
              Langkah Operasional Berikutnya
            </strong>
            <span className="text-slate-700 font-medium">{status.nextStep}</span>
          </div>
        </div>
        {status.lastCompletedStep && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <CheckCircle size={13} weight="fill" className="text-emerald-600" />
              <span>{status.lastCompletedStep}</span>
            </span>
          </div>
        )}
      </div>

      {/* 5. Primary / Secondary Action CTAs */}
      {(status.secondaryAction || status.primaryAction) && (
        <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
          {status.secondaryAction && (
            <button
              type="button"
              disabled={isActionLoading || Boolean((status.secondaryAction as any).disabled)}
              onClick={status.secondaryAction.onClick}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 ${
                (status.secondaryAction as any).variant === "danger"
                  ? "border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 hover:border-rose-400"
                  : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              {React.createElement(status.secondaryAction.icon, { size: 15, weight: "bold" })}
              <span>{status.secondaryAction.label}</span>
            </button>
          )}

          {status.primaryAction && (
            <button
              type="button"
              disabled={isActionLoading || Boolean((status.primaryAction as any).disabled)}
              onClick={status.primaryAction.onClick}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition shadow-xs hover:shadow active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                (status.primaryAction as any).variant === "success"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : (status.primaryAction as any).variant === "warning"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : (status.primaryAction as any).variant === "danger"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-[#0F4C81] hover:bg-[#0A365C] text-white"
              }`}
            >
              {isActionLoading ? (
                <ArrowsClockwise size={15} weight="bold" className="animate-spin" />
              ) : (
                React.createElement(status.primaryAction.icon, { size: 15, weight: "bold" })
              )}
              <span>{status.primaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

