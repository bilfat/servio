"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  Vault,
  ArrowsLeftRight,
  FileText,
  ShieldCheck,
  CheckCircle,
  Eye,
  EyeSlash,
  Clock,
  Check,
  Info,
  ArrowRight,
  Plus,
  FloppyDisk,
  Key,
  Trash,
  Sparkle,
  WarningCircle,
  ArrowsClockwise,
  CheckFat,
  Buildings,
} from "@phosphor-icons/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { paymentConfigApi } from "@/lib/servioApi";

type PaymentConfigTab = "methods" | "accounts" | "channels" | "instructions";

interface PaymentMethodItem {
  code: string;
  name: string;
  currency: string;
  status: "ACTIVE" | "INACTIVE";
}

interface CollectionAccountItem {
  id: string;
  purpose: string;
  institution: string;
  accountNumber: string;
  accountName: string;
  status: "VERIFIED" | "PENDING";
  currency: string;
}

interface GatewayChannelItem {
  code: string;
  name: string;
  method: string;
  processor: string;
  status: "ACTIVE" | "INACTIVE";
}

interface GatewayCredentials {
  gatewayProvider: string;
  environment: "SANDBOX" | "PRODUCTION";
  merchantId: string;
  clientKey: string;
  serverKey: string;
  webhookUrl: string;
  isDummyMode: boolean;
  channels: GatewayChannelItem[];
}

function PaymentConfigurationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as PaymentConfigTab) || "methods";
  const [activeTab, setActiveTab] = useState<PaymentConfigTab>(tabParam);
  const [showFullAccount, setShowFullAccount] = useState<Record<string, boolean>>({});
  const [showServerKey, setShowServerKey] = useState(false);

  // Status & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Payment Methods State
  const [methodsList, setMethodsList] = useState<PaymentMethodItem[]>([
    { code: "BANK_TRANSFER", name: "Bank Transfer (Manual / VA)", currency: "IDR", status: "ACTIVE" },
    { code: "VIRTUAL_ACCOUNT", name: "Virtual Account Multi-Bank", currency: "IDR", status: "ACTIVE" },
    { code: "QRIS", name: "QRIS Dinamis (GPN / Nasional)", currency: "IDR", status: "ACTIVE" },
    { code: "E_WALLET", name: "E-Wallet (GoPay, OVO, ShopeePay)", currency: "IDR", status: "ACTIVE" },
    { code: "CARD", name: "Kartu Kredit / Debit Online", currency: "IDR", status: "INACTIVE" },
  ]);
  const [newMethodModal, setNewMethodModal] = useState(false);
  const [newMethodForm, setNewMethodForm] = useState({
    code: "",
    name: "",
    currency: "IDR",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  // 2. Accounts State
  const [accountsList, setAccountsList] = useState<CollectionAccountItem[]>([
    {
      id: "acc-escrow-bca",
      purpose: "Rekening Utama Escrow Resmi (Jasa & Pesanan)",
      institution: "Bank Central Asia (BCA)",
      accountNumber: "883019283742",
      accountName: "PT SERVIO TEKNOLOGI INDONESIA - ESCROW",
      status: "VERIFIED",
      currency: "IDR",
    },
    {
      id: "acc-fee-mandiri",
      purpose: "Rekening Penampung Application & Platform Fee",
      institution: "Bank Mandiri",
      accountNumber: "137009823401",
      accountName: "PT SERVIO TEKNOLOGI INDONESIA - REVENUE",
      status: "VERIFIED",
      currency: "IDR",
    },
  ]);
  const [newAccountModal, setNewAccountModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    purpose: "",
    institution: "Bank Central Asia (BCA)",
    accountNumber: "",
    accountName: "",
    currency: "IDR",
  });

  // 3. Gateway & Channel State
  const [gatewayConfig, setGatewayConfig] = useState<GatewayCredentials>({
    gatewayProvider: "Midtrans (Sandbox / Dummy Simulator)",
    environment: "SANDBOX",
    merchantId: "G-SERVIO-DUMMY-88",
    clientKey: "SB-Mid-client-88a91b2c3d4e5f",
    serverKey: "SB-Mid-server-99x87y65z43w21",
    webhookUrl: "https://api.servio.id/api/v1/payments/webhook",
    isDummyMode: true,
    channels: [
      { code: "BCA_VA", name: "BCA Virtual Account", method: "VIRTUAL_ACCOUNT", processor: "Midtrans", status: "ACTIVE" },
      { code: "MANDIRI_VA", name: "Mandiri Virtual Account", method: "VIRTUAL_ACCOUNT", processor: "Midtrans", status: "ACTIVE" },
      { code: "BRI_VA", name: "BRI Virtual Account", method: "VIRTUAL_ACCOUNT", processor: "Midtrans", status: "ACTIVE" },
      { code: "BNI_VA", name: "BNI Virtual Account", method: "VIRTUAL_ACCOUNT", processor: "Midtrans", status: "ACTIVE" },
      { code: "QRIS", name: "QRIS Dinamis", method: "QR_PAYMENT", processor: "QRIS Aggregator", status: "ACTIVE" },
      { code: "GOPAY", name: "GoPay / GoPay Later", method: "E_WALLET", processor: "Midtrans Direct", status: "ACTIVE" },
      { code: "SHOPEEPAY", name: "ShopeePay", method: "E_WALLET", processor: "Midtrans Direct", status: "ACTIVE" },
    ],
  });

  // 4. Instructions State
  const [instructionDeadline, setInstructionDeadline] = useState(24);
  const [instructionSteps, setInstructionSteps] = useState<string[]>([
    "Pilih metode pembayaran yang didukung dan salin kode transaksi / nomor Virtual Account resmi.",
    "Selesaikan transfer dana sesuai nominal tagihan yang tertera sebelum batas waktu kedaluwarsa.",
    "Sistem SERVIO akan memverifikasi dana secara otomatis ke rekening Escrow platform.",
  ]);

  // Load Data from Database API
  const loadConfigurationData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await paymentConfigApi.getConfigurations();
      const cfgData = res?.data as Record<string, { configuration?: Record<string, unknown> }> | undefined;
      if (cfgData) {
        // Methods
        if (cfgData.PAYMENT_METHODS?.configuration?.methods) {
          setMethodsList(cfgData.PAYMENT_METHODS.configuration.methods as PaymentMethodItem[]);
        }
        // Accounts
        if (cfgData.COLLECTION_ACCOUNTS?.configuration?.accounts) {
          setAccountsList(cfgData.COLLECTION_ACCOUNTS.configuration.accounts as CollectionAccountItem[]);
        }
        // Gateway & Channels
        if (cfgData.GATEWAY_CHANNELS?.configuration) {
          const gc = cfgData.GATEWAY_CHANNELS.configuration as unknown as GatewayCredentials;
          setGatewayConfig((prev) => ({
            ...prev,
            ...gc,
            channels: gc.channels || prev.channels,
          }));
        }
        // Instructions
        if (cfgData.PAYMENT_INSTRUCTIONS?.configuration) {
          const cfg = cfgData.PAYMENT_INSTRUCTIONS.configuration as { deadlineHours?: number; instructions?: string[] };
          if (cfg.deadlineHours) setInstructionDeadline(cfg.deadlineHours);
          if (Array.isArray(cfg.instructions)) setInstructionSteps(cfg.instructions);
        }
      }
    } catch (err) {
      console.warn("Payment configuration load warning:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigurationData();
  }, [loadConfigurationData]);

  const toggleMask = (id: string) => {
    setShowFullAccount((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTabChange = (tab: PaymentConfigTab) => {
    setActiveTab(tab);
    router.push(`/finance/payment-configuration?tab=${tab}`);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- SAVE ACTIONS TO DATABASE ---

  // 1. Save Methods
  const handleSaveMethods = async (newList: PaymentMethodItem[]) => {
    setIsSaving(true);
    try {
      await paymentConfigApi.saveConfiguration("PAYMENT_METHODS", {
        type: "METHODS",
        name: "Metode Pembayaran",
        configuration: { methods: newList },
        status: "ACTIVE",
        isDummy: true,
      });
      setMethodsList(newList);
      showNotification("Daftar Metode Pembayaran berhasil disimpan ke database!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan metode pembayaran");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMethod = async () => {
    if (!newMethodForm.code.trim() || !newMethodForm.name.trim()) {
      alert("Kode dan Nama Metode pembayaran wajib diisi.");
      return;
    }
    const formattedCode = newMethodForm.code.trim().toUpperCase().replace(/\s+/g, "_");
    const updated = [
      ...methodsList,
      {
        code: formattedCode,
        name: newMethodForm.name.trim(),
        currency: newMethodForm.currency,
        status: newMethodForm.status,
      },
    ];
    await handleSaveMethods(updated);
    setNewMethodModal(false);
    setNewMethodForm({ code: "", name: "", currency: "IDR", status: "ACTIVE" });
  };

  const handleToggleMethodStatus = async (index: number) => {
    const updated = [...methodsList];
    updated[index].status = updated[index].status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await handleSaveMethods(updated);
  };

  const handleDeleteMethod = async (index: number) => {
    if (!confirm(`Hapus metode pembayaran '${methodsList[index].name}'?`)) return;
    const updated = methodsList.filter((_, i) => i !== index);
    await handleSaveMethods(updated);
  };

  // 2. Save Accounts
  const handleSaveAccounts = async (newList: CollectionAccountItem[]) => {
    setIsSaving(true);
    try {
      await paymentConfigApi.saveConfiguration("COLLECTION_ACCOUNTS", {
        type: "ACCOUNTS",
        name: "Rekening Penampung & Escrow",
        configuration: { accounts: newList },
        status: "ACTIVE",
        isDummy: true,
      });
      setAccountsList(newList);
      showNotification("Rekening penampung berhasil disimpan ke database!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan rekening penampung");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountForm.purpose.trim() || !newAccountForm.accountNumber.trim() || !newAccountForm.accountName.trim()) {
      alert("Seluruh field rekening penampung wajib diisi.");
      return;
    }
    const newAcc: CollectionAccountItem = {
      id: `acc-${Date.now()}`,
      purpose: newAccountForm.purpose.trim(),
      institution: newAccountForm.institution,
      accountNumber: newAccountForm.accountNumber.trim(),
      accountName: newAccountForm.accountName.trim().toUpperCase(),
      status: "VERIFIED",
      currency: newAccountForm.currency,
    };
    const updated = [...accountsList, newAcc];
    await handleSaveAccounts(updated);
    setNewAccountModal(false);
    setNewAccountForm({
      purpose: "",
      institution: "Bank Central Asia (BCA)",
      accountNumber: "",
      accountName: "",
      currency: "IDR",
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Hapus rekening penampung ini dari database?")) return;
    const updated = accountsList.filter((a) => a.id !== id);
    await handleSaveAccounts(updated);
  };

  // 3. Save Gateway & Channel API Credentials
  const handleSaveGateway = async () => {
    setIsSaving(true);
    try {
      await paymentConfigApi.saveConfiguration("GATEWAY_CHANNELS", {
        type: "GATEWAY",
        name: "Channel & Gateway API Setup",
        configuration: gatewayConfig as unknown as Record<string, unknown>,
        status: "ACTIVE",
        isDummy: true,
      });
      showNotification("Konfigurasi API Payment Gateway berhasil disimpan ke database!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan API Payment Gateway");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChannelStatus = (index: number) => {
    const updatedChannels = [...gatewayConfig.channels];
    updatedChannels[index].status = updatedChannels[index].status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setGatewayConfig({ ...gatewayConfig, channels: updatedChannels });
  };

  return (
    <div className="space-y-6 font-body pb-20">
      <PageHeader
        title="Konfigurasi Pembayaran Platform"
        description="Tata kelola metode pembayaran, rekening penampung (Escrow), channel gateway, dan API credentials (Mode Simulator / Dummy)"
        breadcrumbs={[
          { label: "Finance & Ops", href: "/finance/dashboard" },
          { label: "Payment Setup", href: "/finance/payment-configuration" },
        ]}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F4C81] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-sky-300 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle size={22} weight="fill" className="text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: "methods", label: "Metode Pembayaran", icon: CreditCard },
          { key: "accounts", label: "Rekening Penampung (Escrow)", icon: Vault },
          { key: "channels", label: "Channel & Gateway API", icon: ArrowsLeftRight },
          { key: "instructions", label: "Instruksi Pembayaran", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as PaymentConfigTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} weight={isActive ? "bold" : "regular"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAYMENT METHODS */}
      {activeTab === "methods" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Metode Pembayaran Platform</h3>
              <p className="text-xs text-slate-500">
                Pilih dan tambahkan metode pembayaran yang dapat digunakan konsumen saat checkout.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={() => setNewMethodModal(true)}
              >
                <Plus size={16} weight="bold" />
                Tambah Metode Pembayaran
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Metode Pembayaran</th>
                    <th className="p-4">Kode Sistem</th>
                    <th className="p-4">Mata Uang</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {methodsList.map((m, idx) => (
                    <tr key={m.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0F4C81] flex items-center justify-center font-bold">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <span>{m.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">Tersimpan di Database</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">{m.code}</td>
                      <td className="p-4 font-bold text-slate-800">{m.currency}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleMethodStatus(idx)}
                          className="cursor-pointer transition hover:opacity-80"
                          title="Klik untuk mengubah status"
                        >
                          <Badge variant={m.status === "ACTIVE" ? "success" : "neutral"} className="text-[10px]">
                            {m.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleMethodStatus(idx)}
                          >
                            {m.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                          <button
                            onClick={() => handleDeleteMethod(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Metode"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLLECTION ACCOUNTS */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rekening Penampung & Escrow Operasional</h3>
              <p className="text-xs text-slate-500">
                Daftar rekening bank penampung dana pembayaran transaksi konsumen dan biaya platform.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5"
              onClick={() => setNewAccountModal(true)}
            >
              <Plus size={16} weight="bold" />
              Tambah Rekening Penampung
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountsList.map((acc) => {
              const isRevealed = showFullAccount[acc.id];
              const masked = acc.accountNumber.length > 4
                ? acc.accountNumber.slice(0, 4) + "-XXXX-XX" + acc.accountNumber.slice(-2)
                : acc.accountNumber;

              return (
                <div key={acc.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      {acc.institution}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="success" className="text-[10px]">
                        {acc.status}
                      </Badge>
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Rekening"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{acc.purpose}</h4>
                  <div className="text-xs text-slate-600 font-semibold">{acc.accountName}</div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 font-mono text-xs">
                    <span className="text-slate-800 tracking-wider font-bold">
                      {isRevealed ? acc.accountNumber : masked}
                    </span>
                    <button
                      onClick={() => toggleMask(acc.id)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                      title={isRevealed ? "Sembunyikan nomor" : "Lihat nomor lengkap"}
                    >
                      {isRevealed ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Mata Uang: {acc.currency}</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle size={14} weight="fill" /> Terverifikasi
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT CHANNELS & GATEWAY API CREDENTIALS */}
      {activeTab === "channels" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key size={20} weight="fill" className="text-[#0F4C81]" />
                  <h3 className="text-sm font-bold text-slate-900">API Credentials Payment Gateway (Sandbox / Dummy Simulator)</h3>
                </div>
                <p className="text-xs text-slate-600">
                  Masukkan kunci API dan Webhook dari payment gateway (contoh: Midtrans / Xendit). Saat ini berjalan dalam <strong>Mode Simulator / Dummy</strong>.
                </p>
              </div>
              <Badge variant="warning" className="text-[11px] uppercase tracking-wider font-bold">
                {gatewayConfig.environment} DUMMY MODE
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/80 p-4 rounded-xl border border-sky-100 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Payment Gateway Provider</label>
                <input
                  type="text"
                  value={gatewayConfig.gatewayProvider}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, gatewayProvider: e.target.value })}
                  placeholder="Contoh: Midtrans / Xendit"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Merchant ID</label>
                <input
                  type="text"
                  value={gatewayConfig.merchantId}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, merchantId: e.target.value })}
                  placeholder="G-SERVIO-XXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Client Key (Public)</label>
                <input
                  type="text"
                  value={gatewayConfig.clientKey}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, clientKey: e.target.value })}
                  placeholder="SB-Mid-client-xxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Server Key (Secret)</label>
                  <button
                    type="button"
                    onClick={() => setShowServerKey(!showServerKey)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                  >
                    {showServerKey ? <EyeSlash size={14} /> : <Eye size={14} />}
                    {showServerKey ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <input
                  type={showServerKey ? "text" : "password"}
                  value={gatewayConfig.serverKey}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, serverKey: e.target.value })}
                  placeholder="SB-Mid-server-xxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="font-bold text-slate-700">Webhook Notification URL</label>
                <input
                  type="text"
                  value={gatewayConfig.webhookUrl}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, webhookUrl: e.target.value })}
                  placeholder="https://api.domain.com/api/v1/payments/webhook"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 italic">
                * Kredensial ini disimpan aman di database platform SERVIO.
              </span>
              <Button
                variant="primary"
                size="sm"
                className="gap-2"
                onClick={handleSaveGateway}
                disabled={isSaving}
              >
                <FloppyDisk size={16} weight="bold" />
                {isSaving ? "Menyimpan..." : "Simpan Pengaturan Gateway"}
              </Button>
            </div>
          </div>

          {/* Channels Mapping Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Pemetaan Channel Gateway Aktif</h3>
              <span className="text-xs text-slate-400">Total {gatewayConfig.channels.length} channel terdaftar</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Nama Channel</th>
                    <th className="p-4">Kode Channel</th>
                    <th className="p-4">Metode Terkait</th>
                    <th className="p-4">Processor / Gateway</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {gatewayConfig.channels.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{row.name}</td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">{row.code}</td>
                      <td className="p-4 font-mono text-[11px] text-[#0F4C81] font-semibold">{row.method}</td>
                      <td className="p-4 text-slate-600">{row.processor}</td>
                      <td className="p-4">
                        <Badge variant={row.status === "ACTIVE" ? "success" : "neutral"} className="text-[10px]">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleChannelStatus(i)}
                        >
                          {row.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT INSTRUCTIONS */}
      {activeTab === "instructions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Instruksi Pembayaran Dinamis (Server Authoritative)</h3>
              <p className="text-xs text-slate-500">
                Panduan tata cara transfer yang ditampilkan pada konsumen saat membuat pesanan.
              </p>
            </div>
            <Badge variant="neutral" className="text-[11px]">
              Batas Waktu: {instructionDeadline} Jam (Server-Controlled)
            </Badge>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText size={22} weight="bold" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="text-sm font-bold text-slate-900">Langkah Instruksi Bayar Konsumen</h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 leading-relaxed">
                  {instructionSteps.map((step, idx) => (
                    <li key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
              <span>
                Server memegang otoritas penuh atas batas waktu pembayaran (deadline). Frontend tidak dapat memalsukan batas waktu transfer.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Tambah Metode Pembayaran */}
      <Modal
        isOpen={newMethodModal}
        onClose={() => setNewMethodModal(false)}
        title="Tambah Metode Pembayaran Baru"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700">Nama Metode Pembayaran</label>
            <input
              type="text"
              placeholder="Contoh: QRIS Dynamic Shopee / Direct Debit BRI"
              value={newMethodForm.name}
              onChange={(e) => {
                const name = e.target.value;
                setNewMethodForm({
                  ...newMethodForm,
                  name,
                  code: name.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
                });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700">Kode Sistem (System Identifier)</label>
            <input
              type="text"
              placeholder="QRIS_DYNAMIC / DIRECT_DEBIT"
              value={newMethodForm.code}
              onChange={(e) => setNewMethodForm({ ...newMethodForm, code: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-[#0F4C81] bg-slate-50 focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Mata Uang</label>
              <input
                type="text"
                value={newMethodForm.currency}
                onChange={(e) => setNewMethodForm({ ...newMethodForm, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Status Awal</label>
              <select
                value={newMethodForm.status}
                onChange={(e) => setNewMethodForm({ ...newMethodForm, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE (Aktif)</option>
                <option value="INACTIVE">INACTIVE (Nonaktif)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setNewMethodModal(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddMethod} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan ke Database"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Tambah Rekening Penampung */}
      <Modal
        isOpen={newAccountModal}
        onClose={() => setNewAccountModal(false)}
        title="Tambah Rekening Penampung (Escrow)"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700">Tujuan Rekening (Purpose)</label>
            <input
              type="text"
              placeholder="Contoh: Rekening Escrow Penampung Jasa Servis AC"
              value={newAccountForm.purpose}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, purpose: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700">Institusi Bank</label>
            <select
              value={newAccountForm.institution}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, institution: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
            >
              <option value="Bank Central Asia (BCA)">Bank Central Asia (BCA)</option>
              <option value="Bank Mandiri">Bank Mandiri</option>
              <option value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</option>
              <option value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</option>
              <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
              <option value="Bank CIMB Niaga">Bank CIMB Niaga</option>
            </select>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700">Nomor Rekening</label>
            <input
              type="text"
              placeholder="883019283742"
              value={newAccountForm.accountNumber}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, accountNumber: e.target.value.replace(/[^0-9]/g, "") })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700">Atas Nama Pemilik Rekening</label>
            <input
              type="text"
              placeholder="PT SERVIO TEKNOLOGI INDONESIA"
              value={newAccountForm.accountName}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, accountName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setNewAccountModal(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddAccount} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan ke Database"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function PaymentConfigurationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Memuat konfigurasi pembayaran...</div>}>
      <PaymentConfigurationContent />
    </Suspense>
  );
}
