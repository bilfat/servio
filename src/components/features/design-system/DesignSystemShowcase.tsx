"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { DynamicFieldRenderer, FieldSchema } from "@/components/form/DynamicFieldRenderer";
import { SchedulePicker } from "@/components/form/SchedulePicker";
import { LocationPicker } from "@/components/form/LocationPicker";
import { UploadDropzone } from "@/components/form/UploadDropzone";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { TagSelector } from "@/components/ui/Chip";
import { Card } from "@/components/data-display/Card";
import { DataTable, ColumnDef } from "@/components/data-display/DataTable";
import { Timeline, TimelineEvent } from "@/components/data-display/Timeline";
import { OrderStepper, StepItem } from "@/components/data-display/OrderStepper";
import { PriceBreakdown, PriceItem } from "@/components/data-display/PriceBreakdown";
import { MediaGallery, MediaItem } from "@/components/data-display/MediaGallery";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { ProviderCard, ProviderCardData } from "@/components/features/providers/ProviderCard";
import { ProductCard, ProductCardData } from "@/components/features/products/ProductCard";
import { ChatThread, ChatMessage } from "@/components/features/chat/ChatThread";
import { ChatComposer } from "@/components/features/chat/ChatComposer";

import {
  Sparkle,
  ChatCircleText,
} from "@phosphor-icons/react";

export function DesignSystemShowcase() {
  const [subTab, setSubTab] = useState<"atoms" | "data" | "domain">("atoms");

  // Form State Demos
  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectValue, setSelectValue] = useState("ac-service");
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("flat");
  const [toggleActive, setToggleActive] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>(["ac", "bergaransi"]);

  // Dynamic Form Schema Demo
  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>({
    serialNumber: "SN-DKN-2026-X9",
    symptom: "bocor",
    hasWarrantyCard: true,
  });

  const dynamicFields: FieldSchema[] = [
    {
      id: "serialNumber",
      type: "text",
      label: "Nomor Seri Unit Elektronik",
      placeholder: "Cth: SN-DKN-2026-X9",
      helperText: "Dapat ditemukan pada stiker barcode di bagian samping unit.",
      required: true,
    },
    {
      id: "symptom",
      type: "select",
      label: "Gejala Kerusakan Utama",
      options: [
        { value: "bocor", label: "Air Menetes / Bocor ke Dalam Ruangan" },
        { value: "tidak-dingin", label: "Hembusan Angin Tidak Dingin" },
        { value: "berisik", label: "Outdoor Unit Bergetar Keras / Bising" },
        { value: "mati-total", label: "Mati Total / Lampu Indikator Kedip" },
      ],
      required: true,
    },
    {
      id: "hasWarrantyCard",
      type: "checkbox",
      label: "Kartu Garansi Resmi Masih Berlaku",
      helperText: "Centang jika unit masih dalam masa klaim garansi pabrik.",
    },
  ];

  // Modals & Dialogs State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // DataTable Mock Data
  interface JobRow extends Record<string, unknown> {
    id: string;
    customer: string;
    service: string;
    status: "success" | "warning" | "info" | "error";
    statusLabel: string;
    total: string;
  }

  const tableData: JobRow[] = [
    { id: "ORD-8821", customer: "Ahmad Pratama", service: "Cuci AC Split Daikin Inverter", status: "success", statusLabel: "Selesai", total: "Rp 125.000" },
    { id: "ORD-8822", customer: "Siti Rahma", service: "Perbaikan Kompresor Bocor Freon", status: "info", statusLabel: "Dikerjakan", total: "Rp 450.000" },
    { id: "ORD-8823", customer: "Bambang Wijaya", service: "Instalasi Water Heater Listrik", status: "warning", statusLabel: "Menunggu Jadwal", total: "Rp 250.000" },
    { id: "ORD-8824", customer: "Dewi Lestari", service: "Deep Cleaning Kasur & Sofa 3 Seater", status: "success", statusLabel: "Selesai", total: "Rp 320.000" },
    { id: "ORD-8825", customer: "Hendro Kusumo", service: "Penggantian Pipa Tembaga AC", status: "error", statusLabel: "Sengketa", total: "Rp 180.000" },
  ];

  const tableColumns: ColumnDef<JobRow>[] = [
    { key: "id", header: "ID Order", sortable: true, width: "110px" },
    { key: "customer", header: "Pelanggan", sortable: true },
    { key: "service", header: "Layanan Jasa", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} label={row.statusLabel} size="sm" />,
    },
    { key: "total", header: "Total Nilai", sortable: true, align: "right" },
  ];

  // Timeline Events Mock
  const timelineEvents: TimelineEvent[] = [
    {
      id: "ev-1",
      title: "Order Dibuat & Escrow Diverifikasi",
      description: "Pembayaran dana Rp 150.000 diamankan dalam rekening penampung Servio Protection.",
      timestamp: "21 Sep 2026, 09:30 WIB",
      status: "completed",
      author: "Sistem Escrow",
    },
    {
      id: "ev-2",
      title: "Teknisi Tiba di Alamat Pelanggan",
      description: "Dedi Supriyadi (Teknisi HVAC) telah mengonfirmasi kedatangan dengan GPS check-in.",
      timestamp: "21 Sep 2026, 10:15 WIB",
      status: "completed",
      author: "Dedi Supriyadi",
    },
    {
      id: "ev-3",
      title: "Pengerjaan Pembersihan Evaporator Berlangsung",
      description: "Sedang dilakukan pembongkaran filter, pencucian sirip pendingin, dan cek tekanan freon.",
      timestamp: "21 Sep 2026, 10:45 WIB",
      status: "current",
      author: "Dedi Supriyadi",
    },
    {
      id: "ev-4",
      title: "Konfirmasi Bukti & Penyelesaian Transaksi",
      description: "Menunggu foto bukti before/after diunggah dan ditandatangani pelanggan.",
      timestamp: "Est. 11:30 WIB",
      status: "pending",
    },
  ];

  // Stepper Mock
  const orderSteps: StepItem[] = [
    { id: "s1", title: "Booking", description: "Reservasi jadwal", status: "completed" },
    { id: "s2", title: "Penugasan", description: "Mitra ditunjuk", status: "completed" },
    { id: "s3", title: "Pengerjaan", description: "Teknisi di lokasi", status: "current" },
    { id: "s4", title: "Verifikasi", description: "Bukti selesai", status: "upcoming" },
    { id: "s5", title: "Garansi", description: "Proteksi aktif", status: "upcoming" },
  ];

  // Price Items Mock
  const priceItems: PriceItem[] = [
    { id: "pi-1", label: "Jasa Cuci AC Split 1/2 - 1 PK", amount: 100000, subtitle: "Pembersihan indoor & outdoor" },
    { id: "pi-2", label: "Pengisian Freon R32 (Tekanan 140 PSI)", amount: 150000, subtitle: "Material refrigeran original" },
  ];

  // Media Gallery Mock
  const galleryItems: MediaItem[] = [
    {
      id: "mg-1",
      title: "Pembersihan Evaporator AC Split Daikin 1 PK",
      beforeUrl: "/brand/logo.png",
      afterUrl: "/brand/logo.png",
      serviceCategory: "AC & Pendingin",
    },
    {
      id: "mg-2",
      title: "Restorasi Nat & Polishing Keramik Kamar Mandi",
      beforeUrl: "/brand/logo.png",
      afterUrl: "/brand/logo.png",
      serviceCategory: "Kebersihan & Sanitasi",
    },
  ];

  // Domain Cards Mock
  const sampleService: ServiceCardData = {
    id: "srv-ac-01",
    title: "Servis & Cuci AC Split Inverter (Termasuk Cek Kebocoran)",
    category: "AC & Pendingin",
    price: 95000,
    pricingModel: "PER_UNIT",
    rating: 4.9,
    reviewCount: 384,
    warrantyDays: 30,
    providerName: "PT Servio Mandiri Teknik",
    isVerifiedProvider: true,
  };

  const sampleProvider: ProviderCardData = {
    id: "prov-budi-01",
    name: "Bintang Teknik Mandiri (Workshop Resmi)",
    businessType: "WORKSHOP",
    avatarInitials: "BT",
    rating: 4.9,
    completedJobs: 1420,
    operationalHours: "08:00 – 19:00 WIB",
    workRadiusKm: 15,
    city: "Jakarta Utara",
    specialties: ["AC Daikin & Panasonic", "Kelistrikan Rumah", "Pipa Bocor"],
    isVerified: true,
  };

  const sampleProduct: ProductCardData = {
    id: "prod-cap-01",
    title: "Kapasitor AC Dual Run 35uF + 5uF Shizuki Original Jepang",
    category: "Spare Part AC",
    price: 135000,
    stock: 2,
    compatibilityTags: ["Daikin", "Panasonic", "Sharp 1-2 PK"],
    merchantName: "Toko Suku Cadang Makmur Jaya",
    rating: 4.8,
  };

  // Chat Mock
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      senderId: "tech-1",
      senderName: "Dedi Supriyadi",
      senderRole: "worker",
      message: "Selamat pagi Pak Ahmad. Saya teknisi Servio, sedang dalam perjalanan menuju lokasi Anda. Estimasi sampai 15 menit lagi.",
      timestamp: "10:05 WIB",
      isRead: true,
    },
    {
      id: "msg-2",
      senderId: "cust-1",
      senderName: "Ahmad Pratama",
      senderRole: "customer",
      message: "Baik Mas Dedi, posisi rumah pagar hitam nomor 24 persis di sebelah mini market ya.",
      timestamp: "10:08 WIB",
      isRead: true,
    },
    {
      id: "msg-3",
      senderId: "tech-1",
      senderName: "Dedi Supriyadi",
      senderRole: "worker",
      message: "Siap Pak, saya sudah tiba di depan gerbang. Mohon dibukakan pintu garasinya ya.",
      timestamp: "10:20 WIB",
      attachmentName: "foto_kedatangan_di_lokasi.jpg",
      attachmentUrl: "/brand/logo.png",
      isRead: true,
    },
  ]);

  const handleSendChatMessage = (text: string, attachmentName?: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "cust-1",
      senderName: "Ahmad Pratama",
      senderRole: "customer",
      message: text || "Lampiran dikirim",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      attachmentName,
      attachmentUrl: attachmentName ? "/brand/logo.png" : undefined,
      isRead: false,
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  return (
    <div className="space-y-8 font-body">
      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold font-display text-neutral-dark">
            Milestone 2 — Atomic Design System & Reusable Components
          </h3>
          <p className="text-xs text-neutral-slate">
            Uji kelayakan seluruh atom formulir, visual data display, dan kartu domain kanonikal SERVIO.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setSubTab("atoms")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === "atoms"
                ? "bg-white text-primary shadow-servio-xs"
                : "text-neutral-slate hover:text-neutral-dark"
            }`}
          >
            2.1 Form & Atoms
          </button>
          <button
            type="button"
            onClick={() => setSubTab("data")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === "data"
                ? "bg-white text-primary shadow-servio-xs"
                : "text-neutral-slate hover:text-neutral-dark"
            }`}
          >
            2.2 Data Display & Feedback
          </button>
          <button
            type="button"
            onClick={() => setSubTab("domain")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === "domain"
                ? "bg-white text-primary shadow-servio-xs"
                : "text-neutral-slate hover:text-neutral-dark"
            }`}
          >
            2.3 Domain Units & Chat
          </button>
        </div>
      </div>

      {/* ===================== SUBTAB 1: ATOMS & FORM ===================== */}
      {subTab === "atoms" && (
        <div className="space-y-8">
          {/* 1. Buttons */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
              1. Button Atoms (7 Varian Desain)
            </h4>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Deep Blue</Button>
              <Button variant="secondary">Secondary Coral</Button>
              <Button variant="gradient" leftIcon={<Sparkle size={16} weight="fill" />}>
                Gradient Hero & AI
              </Button>
              <Button variant="outline">Outline</Button>
              <Button variant="soft">Soft Tint</Button>
              <Button variant="ghost">Ghost Action</Button>
              <Button variant="danger">Danger Red</Button>
              <Button variant="primary" isLoading>
                Loading State
              </Button>
            </div>
          </div>

          {/* 2. Inputs, Search & Textarea */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                2. Input & SearchInput
              </h4>

              <SearchInput
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onClear={() => setSearchValue("")}
                placeholder="Cari jasa, provider, produk, atau ceritakan masalahmu..."
              />

              <Input
                label="Nama Lengkap Pemesan"
                required
                placeholder="Masukkan nama lengkap"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Nama ini akan tertera pada surat tugas teknisi."
              />

              <Input
                label="Nomor Telepon WhatsApp"
                placeholder="0812xxxxxxxx"
                error={inputValue.length > 0 && inputValue.length < 3 ? "Format nomor terlalu pendek" : undefined}
                leftIcon={<span className="text-xs font-bold font-mono">+62</span>}
              />
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                3. Select, Textarea & Toggles
              </h4>

              <Select
                label="Kategori Layanan"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={[
                  { value: "ac-service", label: "AC & Pendingin Ruangan" },
                  { value: "plumbing", label: "Instalasi Listrik & Pipa" },
                  { value: "cleaning", label: "Kebersihan & Sanitasi" },
                ]}
              />

              <Textarea
                label="Deskripsi Kendala Kerusakan"
                placeholder="Jelaskan kendala yang dialami secara rinci..."
                showCount
                maxLength={200}
                rows={2}
              />

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <Checkbox
                  label="Kebutuhan Darurat (Sameday Service)"
                  description="Prioritaskan kedatangan teknisi dalam waktu 2 jam ke depan."
                  checked={checkboxChecked}
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                />

                <ToggleSwitch
                  label="Aktifkan Notifikasi WhatsApp Realtime"
                  description="Dapatkan pembaruan status teknisi dan bukti pengerjaan via WhatsApp."
                  checked={toggleActive}
                  onChange={setToggleActive}
                />
              </div>
            </div>
          </div>

          {/* 3. RadioGroup & DynamicFieldRenderer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                4. RadioGroup (Card Variant)
              </h4>
              <RadioGroup
                label="Pilih Model Pembayaran"
                value={radioValue}
                onChange={setRadioValue}
                orientation="cards"
                options={[
                  {
                    value: "flat",
                    label: "Tarif Tetap (Flat Rate)",
                    description: "Harga pasti di awal, bebas biaya tak terduga.",
                    badge: "Populer",
                  },
                  {
                    value: "survey",
                    label: "Estimasi Pasca Survei",
                    description: "Teknisi cek kondisi fisik sebelum menetapkan penawaran harga final.",
                  },
                ]}
              />
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                5. DynamicFieldRenderer (Schema-Driven)
              </h4>
              <DynamicFieldRenderer
                fields={dynamicFields}
                values={dynamicValues}
                onChange={(fieldId, val) =>
                  setDynamicValues((prev) => ({ ...prev, [fieldId]: val }))
                }
              />
            </div>
          </div>

          {/* 4. SchedulePicker, LocationPicker & UploadDropzone */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
              6. SchedulePicker (Pilihan Tanggal & Slot Waktu)
            </h4>
            <SchedulePicker
              onSelectSchedule={(date, slot) => console.log("Schedule picked:", date, slot)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                7. LocationPicker (GPS Pinpoint & Alamat)
              </h4>
              <LocationPicker onChange={(data) => console.log("Location updated:", data)} />
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                8. UploadDropzone (Drag & Drop Bukti Media)
              </h4>
              <UploadDropzone />
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 2: DATA DISPLAY & FEEDBACK ===================== */}
      {subTab === "data" && (
        <div className="space-y-8">
          {/* Badges, Status & Chips */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
              1. StatusBadges, Badges & Interactive TagSelector
            </h4>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status="success" label="Selesai & Bergaransi" />
              <StatusBadge status="warning" label="Menunggu Konfirmasi" />
              <StatusBadge status="error" label="Sengketa Terbuka" />
              <StatusBadge status="info" label="Teknisi Menuju Lokasi" />
              <StatusBadge status="neutral" label="Draf Penawaran" />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <Badge type="verified" />
              <Badge type="popular" />
              <Badge type="ai-match" />
              <Badge type="low-stock" />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-neutral-dark mb-2">TagSelector Filter:</p>
              <TagSelector
                tags={[
                  { id: "ac", label: "AC Split", count: 42 },
                  { id: "bergaransi", label: "Garansi 30 Hari", count: 18 },
                  { id: "sameday", label: "Sameday 2 Jam", count: 7 },
                  { id: "bintang-5", label: "Rating 4.8+", count: 31 },
                ]}
                selectedIds={selectedTags}
                onChange={setSelectedTags}
              />
            </div>
          </div>

          {/* Cards & Spotlight Demo */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
              2. Card Variants (Base, Elevated, Glass & Interactive Spotlight)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="base">
                <p className="text-xs font-bold text-neutral-dark font-display">Base Card</p>
                <p className="text-[11px] text-neutral-slate mt-1">Border halus 1px slate-200 dengan bayangan lembut.</p>
              </Card>

              <Card variant="elevated">
                <p className="text-xs font-bold text-neutral-dark font-display">Elevated Card</p>
                <p className="text-[11px] text-neutral-slate mt-1">Elevasi md untuk kontainer fokus transaksi.</p>
              </Card>

              <Card variant="glass">
                <p className="text-xs font-bold text-neutral-dark font-display">Glass Card</p>
                <p className="text-[11px] text-neutral-slate mt-1">Backdrop blur 14px dengan translusensi premium.</p>
              </Card>

              <Card variant="spotlight" interactive>
                <p className="text-xs font-bold text-primary font-display">Spotlight Card</p>
                <p className="text-[11px] text-neutral-slate mt-1">Arahkan mouse di sini untuk melihat efek pantulan radial.</p>
              </Card>
            </div>
          </div>

          {/* DataTable */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
              3. DataTable Operasional (Sort, Filter, Pagination)
            </h4>
            <DataTable data={tableData} columns={tableColumns} />
          </div>

          {/* Stepper & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                4. OrderStepper (Progress Alur Servis)
              </h4>
              <OrderStepper steps={orderSteps} />
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                5. Vertical Timeline (Jejak Aktivitas)
              </h4>
              <Timeline events={timelineEvents} />
            </div>
          </div>

          {/* PriceBreakdown & MediaGallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PriceBreakdown
              items={priceItems}
              applicationFee={2500}
              discountTotal={20000}
              escrowProtected
            />

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
                6. MediaGallery (Komparasi Hasil Sebelum vs Sesudah)
              </h4>
              <MediaGallery items={galleryItems} />
            </div>
          </div>

          {/* Modals, Drawer & Dialog Triggers */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
              7. Dialog, Modal & Drawer Overlays (Framer Motion)
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
                Buka Modal Standard
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(true)}>
                Buka Bottom Drawer
              </Button>
              <Button variant="danger" size="sm" onClick={() => setIsConfirmOpen(true)}>
                Uji Confirmation Dialog
              </Button>
            </div>
          </div>

          {/* Standard Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Detail Jaminan Servio Protection"
            description="Informasi perlindungan escrow dan garansi pengerjaan ulang."
            footer={
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
                Saya Mengerti
              </Button>
            }
          >
            <p className="text-xs text-neutral-slate leading-relaxed">
              Dana yang Anda bayarkan tidak langsung ditransfer ke rekening penyedia jasa. Sistem Servio menahan dana tersebut hingga Anda menyetujui hasil pengerjaan atau hingga batas otomatisasi selesai tercapai.
            </p>
          </Modal>

          {/* Bottom Drawer */}
          <Drawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            title="Pilih Metode Pembayaran Escrow"
            description="Transaksi dilindungi rekening penampung resmi Servio."
            footer={
              <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(false)}>
                Pilih & Lanjutkan
              </Button>
            }
          >
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-primary bg-sky/30 font-semibold text-neutral-dark">
                QRIS Dinamis (BCA, Mandiri, GoPay, OVO, Dana)
              </div>
              <div className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-neutral-slate">
                Virtual Account Bank Mandiri
              </div>
              <div className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-neutral-slate">
                Virtual Account BCA Otomatis
              </div>
            </div>
          </Drawer>

          {/* Confirmation Dialog */}
          <ConfirmationDialog
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={() => {
              alert("Aksi destruktif dikonfirmasi.");
              setIsConfirmOpen(false);
            }}
            intent="danger"
            title="Batalkan Booking Jasa Ini?"
            message="Pembatalan setelah teknisi menuju lokasi dapat dikenakan biaya pengganti transportasi sebesar Rp 25.000 sesuai kebijakan platform."
            confirmLabel="Ya, Batalkan Booking"
            cancelLabel="Kembali"
          />
        </div>
      )}

      {/* ===================== SUBTAB 3: DOMAIN REUSABLE UNITS ===================== */}
      {subTab === "domain" && (
        <div className="space-y-8">
          {/* Domain Cards Row */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
              1. Domain Reusable Cards (ServiceCard, ProviderCard, ProductCard)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ServiceCard
                service={sampleService}
                onBook={(id) => alert(`Booking layanan ID: ${id}`)}
              />
              <ProviderCard
                provider={sampleProvider}
                onBook={(id) => alert(`Booking teknisi dari Provider: ${id}`)}
              />
              <ProductCard
                product={sampleProduct}
                onAddToCart={(id) => alert(`Produk ID: ${id} ditambahkan ke keranjang!`)}
              />
            </div>
          </div>

          {/* Contextual Chat Experience */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display flex items-center gap-1.5">
              <ChatCircleText size={16} className="text-primary" weight="duotone" />
              2. Contextual Messenger (ChatThread & ChatComposer Berikat Transaksi)
            </h4>

            <div className="max-w-2xl mx-auto h-[480px] flex flex-col rounded-2xl border border-slate-200 shadow-servio-md overflow-hidden bg-white">
              <ChatThread
                orderId="ORD-2026-8821"
                orderTitle="Servis & Cuci AC Daikin 1 PK"
                orderStatus="Teknisi di Lokasi"
                messages={chatMessages}
                currentUserId="cust-1"
                className="flex-1"
              />
              <ChatComposer onSendMessage={handleSendChatMessage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
