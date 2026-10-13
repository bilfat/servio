"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, registrationApi, DocumentRequirement } from "@/lib/servioApi";
import {
  UserCircle,
  Briefcase,
  Storefront,
  Truck,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  UploadSimple,
  ShieldCheck,
  Buildings,
  IdentificationCard,
  FileText,
  Clock,
  Sparkle,
  Paperclip,
} from "@phosphor-icons/react";

type RegistrationFamily = "SELECT" | "CUSTOMER" | "BUSINESS_SELECT" | "BUSINESS_FLOW";
type BusinessType = "SERVICE_PROVIDER" | "MERCHANT" | "SUPPLIER";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");

  const [family, setFamily] = useState<RegistrationFamily>("SELECT");
  const [businessType, setBusinessType] = useState<BusinessType>("SERVICE_PROVIDER");

  // Customer Form State
  const [custStep, setCustStep] = useState<1 | 2 | 3>(1);
  const [custData, setCustData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    nik: "",
  });
  const [custKtpFile, setCustKtpFile] = useState<File | null>(null);
  const [custOtp, setCustOtp] = useState("");
  const [custVerificationInfo, setCustVerificationInfo] = useState<{ id?: string; debugOtp?: string } | null>(null);

  // Business Form State (6 Steps)
  const [bizStep, setBizStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [bizAccount, setBizAccount] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [bizPic, setBizPic] = useState({
    fullName: "",
    nik: "",
    position: "Direktur / Pemilik",
    phone: "",
    email: "",
  });
  const [bizLegal, setBizLegal] = useState({
    legalName: "",
    brandName: "",
    businessType: "PT",
    nib: "",
    npwp: "",
    email: "",
    phone: "",
    address: "",
    province: "DKI Jakarta",
    city: "Jakarta Barat",
    district: "Kebon Jeruk",
    postalCode: "11530",
  });
  const [bizSpecialized, setBizSpecialized] = useState<Record<string, string>>({});
  const [bizAppId, setBizAppId] = useState<string | null>(null);
  const [bizRegNumber, setBizRegNumber] = useState<string | null>(null);

  // Dynamic Document Requirements
  const [docReqs, setDocReqs] = useState<DocumentRequirement[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { file: File; uploaded: boolean; error?: string }>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialType === "customer") {
      setFamily("CUSTOMER");
    } else if (initialType === "business") {
      setFamily("BUSINESS_SELECT");
    } else if (initialType === "provider") {
      setBusinessType("SERVICE_PROVIDER");
      setFamily("BUSINESS_FLOW");
    } else if (initialType === "merchant") {
      setBusinessType("MERCHANT");
      setFamily("BUSINESS_FLOW");
    } else if (initialType === "supplier") {
      setBusinessType("SUPPLIER");
      setFamily("BUSINESS_FLOW");
    }
  }, [initialType]);

  // Load document requirements when entering business flow
  useEffect(() => {
    if (family === "BUSINESS_FLOW") {
      setLoadingDocs(true);
      registrationApi
        .getDocumentRequirements(businessType)
        .then((res) => {
          if (res.data) setDocReqs(res.data);
        })
        .catch(() => {})
        .finally(() => setLoadingDocs(false));
    }
  }, [family, businessType]);

  /* =========================================================================
     CUSTOMER HANDLERS
     ========================================================================= */

  const handleCustomerStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (custData.password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }
    if (custData.password !== custData.password_confirmation) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }
    setErrorMsg(null);
    setCustStep(2);
  };

  const handleCustomerStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custData.nik && custData.nik.length !== 16) {
      setErrorMsg("NIK harus berjumlah 16 digit.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("fullName", custData.fullName);
      formData.append("email", custData.email);
      formData.append("phone", custData.phone);
      formData.append("password", custData.password);
      formData.append("password_confirmation", custData.password_confirmation);
      if (custData.nik) formData.append("nik", custData.nik);
      if (custKtpFile) formData.append("ktpFile", custKtpFile);

      const res = await authApi.registerCustomer(formData);
      if (res.data?.verification) {
        setCustVerificationInfo(res.data.verification);
      }
      setCustStep(3);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal melakukan pendaftaran pelanggan.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custOtp || custOtp.length < 6) {
      setErrorMsg("Masukkan 6 digit kode OTP.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await authApi.verifyCode(custOtp, "EMAIL_VERIFICATION");
      router.push("/?welcome=1");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Kode OTP tidak valid atau kadaluarsa.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================================
     BUSINESS HANDLERS
     ========================================================================= */

  const startBusinessRegistration = (type: BusinessType) => {
    setBusinessType(type);
    setFamily("BUSINESS_FLOW");
    setBizStep(1);
    setErrorMsg(null);
  };

  // Step 1: Account
  const handleBizStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (bizAccount.password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }
    if (bizAccount.password !== bizAccount.password_confirmation) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }
    // Pre-fill PIC with account name/phone/email
    if (!bizPic.fullName) {
      setBizPic((prev) => ({
        ...prev,
        fullName: bizAccount.fullName,
        phone: bizAccount.phone,
        email: bizAccount.email,
      }));
    }
    setErrorMsg(null);
    setBizStep(2);
  };

  // Step 2: PIC
  const handleBizStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (bizPic.nik && bizPic.nik.length !== 16) {
      setErrorMsg("NIK Penanggung Jawab harus 16 digit.");
      return;
    }
    setErrorMsg(null);
    setBizStep(3);
  };

  // Step 3: Legal & Business
  const handleBizStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizLegal.legalName || !bizLegal.brandName || !bizLegal.nib) {
      setErrorMsg("Nama legal usaha, nama brand, dan NIB wajib diisi.");
      return;
    }
    setErrorMsg(null);
    setBizStep(4);
  };

  // Step 4: Specialized Data -> Create Application draft in backend
  const handleBizStep4 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!bizAppId) {
        // Create application draft in Laravel backend
        const res = await registrationApi.createApplication({
          applicantType: businessType,
          account: bizAccount,
          picData: bizPic,
          businessData: bizLegal,
          specializedData: bizSpecialized,
        });
        if (res.data?.application) {
          setBizAppId(res.data.application.id);
          setBizRegNumber(res.data.application.registrationNumber);
        }
      } else {
        // Update draft
        await registrationApi.updateApplication(bizAppId, {
          picData: bizPic,
          businessData: bizLegal,
          specializedData: bizSpecialized,
        });
      }
      setBizStep(5);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal menyimpan draf pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Document Upload
  const handleFileSelect = (docType: string, file: File) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [docType]: { file, uploaded: false },
    }));
  };

  const handleUploadSingleDoc = async (docType: string) => {
    const item = uploadedFiles[docType];
    if (!item || !bizAppId) return;

    try {
      await registrationApi.uploadDocument(bizAppId, docType, item.file);
      setUploadedFiles((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], uploaded: true, error: undefined },
      }));
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setUploadedFiles((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], error: error.message || "Gagal upload" },
      }));
    }
  };

  const handleBizStep5 = async () => {
    // Validate required documents
    const requiredDocs = docReqs.filter((d) => d.required);
    for (const req of requiredDocs) {
      const item = uploadedFiles[req.documentType];
      if (!item) {
        setErrorMsg(`Dokumen wajib "${req.label}" belum dipilih.`);
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Upload any pending files
      if (bizAppId) {
        for (const [docType, item] of Object.entries(uploadedFiles)) {
          if (!item.uploaded) {
            await registrationApi.uploadDocument(bizAppId, docType, item.file);
            setUploadedFiles((prev) => ({
              ...prev,
              [docType]: { ...prev[docType], uploaded: true },
            }));
          }
        }
      }
      setBizStep(6);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengunggah dokumen pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Review & Final Submit
  const handleBizFinalSubmit = async () => {
    if (!bizAppId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      await registrationApi.submitApplication(bizAppId);
      router.push(`/registration/status?id=${bizRegNumber || bizAppId}`);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengirim pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* =========================================================================
            ENTRY VIEW: PELANGGAN VS BISNIS (Section 3.1 & 43)
            ========================================================================= */}
        {family === "SELECT" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6 text-center animate-fadeIn">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-sky border border-sky-200">
                Pendaftaran Ekosistem SERVIO
              </span>
              <h1 className="text-2xl font-bold font-display text-neutral-dark mt-2">
                Pilih Jenis Pendaftaran
              </h1>
              <p className="text-xs text-neutral-slate mt-1 max-w-md mx-auto">
                Silakan tentukan apakah Anda mendaftar sebagai pelanggan perorangan atau pemilik bisnis mitra.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
              <button
                type="button"
                onClick={() => setFamily("CUSTOMER")}
                className="p-6 rounded-2xl border-2 border-slate-200 hover:border-primary hover:bg-sky/15 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserCircle size={28} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-dark group-hover:text-primary transition-colors">
                      PELANGGAN
                    </h3>
                    <p className="text-xs text-neutral-muted mt-1 leading-relaxed">
                      Pesan ratusan layanan jasa servis AC, pendingin, mekanikal, serta pembelian sparepart original.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Daftar Sebagai Pelanggan</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFamily("BUSINESS_SELECT")}
                className="p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50/20 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Buildings size={28} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-dark group-hover:text-blue-600 transition-colors">
                      BISNIS & MITRA
                    </h3>
                    <p className="text-xs text-neutral-muted mt-1 leading-relaxed">
                      Daftar sebagai penyedia jasa perbaikan, toko sparepart (merchant), atau supplier B2B manufaktur.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>Pilih Jenis Bisnis</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-neutral-slate flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div>
                <span>Sudah memiliki akun? </span>
                <Link href="/auth/login" className="font-bold text-primary hover:underline">
                  Masuk ke Akun
                </Link>
              </div>
              <div>
                <Link
                  href="/registration/status"
                  className="font-semibold text-slate-600 hover:text-primary transition inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-50"
                >
                  <FileText size={14} weight="bold" />
                  <span>Cek Status Pendaftaran Bisnis</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            BUSINESS TYPE SELECTOR (Section 3.1 & 43)
            ========================================================================= */}
        {family === "BUSINESS_SELECT" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6 text-center animate-fadeIn">
            <button
              type="button"
              onClick={() => setFamily("SELECT")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-slate hover:text-neutral-dark"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Pilihan Awal</span>
            </button>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                Pilih Jenis Bisnis
              </span>
              <h1 className="text-2xl font-bold font-display text-neutral-dark mt-2">
                Daftar Sebagai Mitra Bisnis
              </h1>
              <p className="text-xs text-neutral-slate mt-1 max-w-md mx-auto">
                Tentukan kategori entitas usaha Anda di platform SERVIO untuk menyesuaikan formulir dan persyaratan legal.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <button
                type="button"
                onClick={() => startBusinessRegistration("SERVICE_PROVIDER")}
                className="w-full p-5 rounded-2xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                    <Briefcase size={26} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-dark">Provider Jasa</p>
                    <p className="text-xs text-neutral-muted">Bengkel, perusahaan teknik & mitra teknisi perbaikan HVAC/mesin</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-neutral-slate group-hover:text-blue-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => startBusinessRegistration("MERCHANT")}
                className="w-full p-5 rounded-2xl border border-slate-200 hover:border-purple-600 hover:bg-purple-50/30 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                    <Storefront size={26} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-dark">Merchant (Toko Sparepart)</p>
                    <p className="text-xs text-neutral-muted">Toko retail & distributor lokal suku cadang dengan sistem stok real-time</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-neutral-slate group-hover:text-purple-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => startBusinessRegistration("SUPPLIER")}
                className="w-full p-5 rounded-2xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/30 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                    <Truck size={26} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-dark">Supplier / B2B</p>
                    <p className="text-xs text-neutral-muted">Pabrikan & importir suku cadang volume besar yang memasok Merchant</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-neutral-slate group-hover:text-emerald-600 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            CUSTOMER REGISTRATION (3 Steps: Account -> KTP/NIK -> OTP) (Section 5)
            ========================================================================= */}
        {family === "CUSTOMER" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setFamily("SELECT")}
                  className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark inline-flex items-center gap-1 mb-1"
                >
                  <ArrowLeft size={12} /> Ganti Pilihan
                </button>
                <h2 className="text-xl font-bold font-display text-neutral-dark">
                  Pendaftaran Pelanggan
                </h2>
              </div>
              {/* Stepper Badge */}
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${custStep >= 1 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>1</span>
                <span className="w-4 h-0.5 bg-slate-200" />
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${custStep >= 2 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>2</span>
                <span className="w-4 h-0.5 bg-slate-200" />
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${custStep >= 3 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>3</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={18} className="shrink-0 text-rose-600" weight="fill" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Account Data */}
            {custStep === 1 && (
              <form onSubmit={handleCustomerStep1} className="space-y-4">
                <div className="text-xs text-neutral-slate">
                  Langkah 1 dari 3: <strong>Data Akun Utama</strong>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Nama Lengkap Sesuai KTP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={custData.fullName}
                    onChange={(e) => setCustData({ ...custData, fullName: e.target.value })}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Alamat Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={custData.email}
                      onChange={(e) => setCustData({ ...custData, email: e.target.value })}
                      placeholder="budi@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Nomor Telepon (WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={custData.phone}
                      onChange={(e) => setCustData({ ...custData, phone: e.target.value })}
                      placeholder="+628123456789"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={custData.password}
                      onChange={(e) => setCustData({ ...custData, password: e.target.value })}
                      placeholder="Minimal 8 karakter"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={custData.password_confirmation}
                      onChange={(e) => setCustData({ ...custData, password_confirmation: e.target.value })}
                      placeholder="Ulangi kata sandi"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Verifikasi Identitas</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* Step 2: NIK & KTP */}
            {custStep === 2 && (
              <form onSubmit={handleCustomerStep2Submit} className="space-y-4">
                <div className="text-xs text-neutral-slate">
                  Langkah 2 dari 3: <strong>Identitas Pelanggan (NIK & KTP)</strong>
                </div>

                <div className="p-3 bg-sky/20 border border-sky-200 rounded-2xl text-xs text-neutral-dark flex items-start gap-2.5">
                  <IdentificationCard size={22} className="text-primary shrink-0 mt-0.5" weight="duotone" />
                  <p className="leading-relaxed">
                    Data NIK dienkripsi secara aman dan hanya digunakan untuk validasi proteksi garansi dan pesanan terverifikasi.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Nomor Induk Kependudukan (NIK 16 Digit)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={custData.nik}
                    onChange={(e) => setCustData({ ...custData, nik: e.target.value.replace(/\D/g, "") })}
                    placeholder="3201xxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Upload Foto KTP (Opsional / Dapat Diunggah Nanti)
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 hover:bg-sky/10">
                    <UploadSimple size={24} className="text-neutral-slate mb-1" />
                    <span className="text-xs font-semibold text-neutral-dark">
                      {custKtpFile ? custKtpFile.name : "Pilih File Foto KTP"}
                    </span>
                    <span className="text-[11px] text-neutral-slate mt-0.5">
                      Format JPG, PNG atau PDF (Maks. 5MB)
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setCustKtpFile(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCustStep(1)}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <SpinnerGap size={18} className="animate-spin" />
                        <span>Mendaftarkan Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim & Minta Kode OTP</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: OTP Verification */}
            {custStep === 3 && (
              <form onSubmit={handleCustomerVerifyOtp} className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-neutral-dark">
                    Masukkan Kode Verifikasi
                  </h3>
                  <p className="text-xs text-neutral-slate mt-1 max-w-sm mx-auto">
                    Kode OTP telah dikirimkan ke <strong>{custData.email}</strong>.
                  </p>
                </div>

                {/* Local Debug OTP Helper */}
                {custVerificationInfo?.debugOtp && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[11px] text-neutral-slate block mb-1">
                      Mode Pengujian Lokal: Kode OTP Anda
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustOtp(custVerificationInfo.debugOtp || "")}
                      className="text-base font-bold font-mono tracking-widest text-primary hover:underline"
                    >
                      {custVerificationInfo.debugOtp} (Klik untuk Mengisi)
                    </button>
                  </div>
                )}

                <div className="max-w-xs mx-auto">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={custOtp}
                    onChange={(e) => setCustOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full text-center text-xl tracking-[0.5em] font-mono py-3 bg-slate-50 border border-slate-200 rounded-xl text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifikasi & Masuk ke Ekosistem</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            BUSINESS REGISTRATION (6-Step Stepper) (Sections 6-10, 44)
            ========================================================================= */}
        {family === "BUSINESS_FLOW" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6">
            {/* Header with Title and Type */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setFamily("BUSINESS_SELECT")}
                  className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark inline-flex items-center gap-1 mb-1"
                >
                  <ArrowLeft size={12} /> Ganti Jenis Mitra
                </button>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-display text-neutral-dark">
                    Pendaftaran Mitra {businessType === "SERVICE_PROVIDER" ? "Provider Jasa" : businessType === "MERCHANT" ? "Merchant" : "Supplier B2B"}
                  </h2>
                </div>
              </div>

              {/* Step indicator */}
              <div className="text-right">
                <span className="text-xs font-bold text-primary">Langkah {bizStep} / 6</span>
                <p className="text-[11px] text-neutral-slate">
                  {bizStep === 1 && "Akun"}
                  {bizStep === 2 && "Penanggung Jawab"}
                  {bizStep === 3 && "Data Bisnis"}
                  {bizStep === 4 && (businessType === "SERVICE_PROVIDER" ? "Data Layanan" : businessType === "MERCHANT" ? "Data Toko" : "Info Pasokan")}
                  {bizStep === 5 && "Dokumen Dinamis"}
                  {bizStep === 6 && "Review & Submit"}
                </p>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(bizStep / 6) * 100}%` }}
              />
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={18} className="shrink-0 text-rose-600" weight="fill" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: AKUN */}
            {bizStep === 1 && (
              <form onSubmit={handleBizStep1} className="space-y-4">
                <div className="text-xs font-semibold text-neutral-slate">
                  01. Data Akun Pengguna Utama
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Nama Lengkap Pemohon <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bizAccount.fullName}
                    onChange={(e) => setBizAccount({ ...bizAccount, fullName: e.target.value })}
                    placeholder="Nama perwakilan / pemohon"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Alamat Email Akun <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={bizAccount.email}
                      onChange={(e) => setBizAccount({ ...bizAccount, email: e.target.value })}
                      placeholder="kontak@mitra.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Nomor Telepon Seluler <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={bizAccount.phone}
                      onChange={(e) => setBizAccount({ ...bizAccount, phone: e.target.value })}
                      placeholder="+628123456789"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={bizAccount.password}
                      onChange={(e) => setBizAccount({ ...bizAccount, password: e.target.value })}
                      placeholder="Minimal 8 karakter"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={bizAccount.password_confirmation}
                      onChange={(e) => setBizAccount({ ...bizAccount, password_confirmation: e.target.value })}
                      placeholder="Ulangi kata sandi"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Penanggung Jawab</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* STEP 2: PENANGGUNG JAWAB */}
            {bizStep === 2 && (
              <form onSubmit={handleBizStep2} className="space-y-4">
                <div className="text-xs font-semibold text-neutral-slate">
                  02. Data Penanggung Jawab (PIC Operasional)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Nama PIC / Penanggung Jawab <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bizPic.fullName}
                      onChange={(e) => setBizPic({ ...bizPic, fullName: e.target.value })}
                      placeholder="Nama sesuai KTP"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Jabatan / Posisi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bizPic.position}
                      onChange={(e) => setBizPic({ ...bizPic, position: e.target.value })}
                      placeholder="Direktur / Pemilik / Manager"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    NIK Penanggung Jawab (16 Digit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={bizPic.nik}
                    onChange={(e) => setBizPic({ ...bizPic, nik: e.target.value.replace(/\D/g, "") })}
                    placeholder="3201xxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Nomor HP PIC <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={bizPic.phone}
                      onChange={(e) => setBizPic({ ...bizPic, phone: e.target.value })}
                      placeholder="+628123456789"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Email PIC <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={bizPic.email}
                      onChange={(e) => setBizPic({ ...bizPic, email: e.target.value })}
                      placeholder="pic@mitra.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBizStep(1)}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover flex items-center justify-center gap-2"
                  >
                    <span>Lanjut ke Data Bisnis</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: DATA BISNIS */}
            {bizStep === 3 && (
              <form onSubmit={handleBizStep3} className="space-y-4">
                <div className="text-xs font-semibold text-neutral-slate">
                  03. Data Bisnis & Legalitas Entitas
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Nama Legal Perusahaan / Badan Usaha <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bizLegal.legalName}
                      onChange={(e) => setBizLegal({ ...bizLegal, legalName: e.target.value })}
                      placeholder="Contoh: PT Servio Mitra Mandiri"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Nama Brand / Toko Komersial <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bizLegal.brandName}
                      onChange={(e) => setBizLegal({ ...bizLegal, brandName: e.target.value })}
                      placeholder="Contoh: Servio AC Workshop"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      Bentuk Usaha <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bizLegal.businessType}
                      onChange={(e) => setBizLegal({ ...bizLegal, businessType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    >
                      <option value="PT">PT (Perseroan Terbatas)</option>
                      <option value="CV">CV (Persekutuan Komanditer)</option>
                      <option value="Firma">Firma / Koperasi</option>
                      <option value="Perorangan">Perorangan / Usaha Mikro</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      NIB (Nomor Induk Berusaha) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bizLegal.nib}
                      onChange={(e) => setBizLegal({ ...bizLegal, nib: e.target.value })}
                      placeholder="Nomor NIB OSS"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">
                      NPWP (Opsional / Kondisional)
                    </label>
                    <input
                      type="text"
                      value={bizLegal.npwp}
                      onChange={(e) => setBizLegal({ ...bizLegal, npwp: e.target.value })}
                      placeholder="NPWP Badan / Pemilik"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Alamat Lengkap Usaha / Kantor <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={bizLegal.address}
                    onChange={(e) => setBizLegal({ ...bizLegal, address: e.target.value })}
                    placeholder="Nama jalan, nomor ruko/gedung, RT/RW"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">Provinsi</label>
                    <input
                      type="text"
                      value={bizLegal.province}
                      onChange={(e) => setBizLegal({ ...bizLegal, province: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">Kota/Kabupaten</label>
                    <input
                      type="text"
                      value={bizLegal.city}
                      onChange={(e) => setBizLegal({ ...bizLegal, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">Kecamatan</label>
                    <input
                      type="text"
                      value={bizLegal.district}
                      onChange={(e) => setBizLegal({ ...bizLegal, district: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-dark">Kode Pos</label>
                    <input
                      type="text"
                      value={bizLegal.postalCode}
                      onChange={(e) => setBizLegal({ ...bizLegal, postalCode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBizStep(2)}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover flex items-center justify-center gap-2"
                  >
                    <span>Lanjut ke Detail Khusus Bisnis</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: DETAIL KHUSUS BISNIS (Provider / Merchant / Supplier) */}
            {bizStep === 4 && (
              <form onSubmit={handleBizStep4} className="space-y-4">
                <div className="text-xs font-semibold text-neutral-slate">
                  04. Data Operasional Khusus (
                  {businessType === "SERVICE_PROVIDER" ? "Layanan Jasa" : businessType === "MERCHANT" ? "Data Toko & Stok" : "Pasokan & Pergudangan"}
                  )
                </div>

                {businessType === "SERVICE_PROVIDER" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Kategori Jasa Utama</label>
                        <select
                          value={bizSpecialized.serviceCategory || "HVAC_REFRIGERATION"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, serviceCategory: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark"
                        >
                          <option value="HVAC_REFRIGERATION">Pendingin & Tata Udara (AC / Chiller / Cold Storage)</option>
                          <option value="ELECTRICAL">Kelistrikan & Pompa Industri</option>
                          <option value="PLUMBING">Sistem Perpipaan & Sanitasi</option>
                          <option value="APPLIANCE">Elektronik & Alat Berat Ringan</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Metode Servis</label>
                        <select
                          value={bizSpecialized.serviceMethod || "BOTH"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, serviceMethod: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark"
                        >
                          <option value="ON_SITE">Kunjungan Lokasi (On-Site Servis)</option>
                          <option value="WORKSHOP">Servis di Workshop Bengkel</option>
                          <option value="BOTH">Kombinasi (On-Site & Workshop)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Cakupan Wilayah / Area Layanan</label>
                        <input
                          type="text"
                          value={bizSpecialized.serviceArea || "Jabodetabek"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, serviceArea: e.target.value })}
                          placeholder="Contoh: Jakarta Barat, Tangerang Kota"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Estimasi Jumlah Teknisi</label>
                        <input
                          type="number"
                          min={1}
                          value={bizSpecialized.technicianCount || "5"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, technicianCount: e.target.value })}
                          placeholder="Jumlah teknisi aktif"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {businessType === "MERCHANT" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-dark">Nama Toko Sparepart</label>
                      <input
                        type="text"
                        value={bizSpecialized.storeName || bizLegal.brandName}
                        onChange={(e) => setBizSpecialized({ ...bizSpecialized, storeName: e.target.value })}
                        placeholder="Nama gerai / toko suku cadang"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Kategori Produk yang Dijual</label>
                        <input
                          type="text"
                          value={bizSpecialized.productCategory || "Kompresor, Pipa Tembaga, Freon"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, productCategory: e.target.value })}
                          placeholder="Suku cadang pendingin, PCB, freon, dll"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Metode Pemenuhan (Fulfillment)</label>
                        <select
                          value={bizSpecialized.fulfillmentMethod || "DELIVERY_AND_PICKUP"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, fulfillmentMethod: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark"
                        >
                          <option value="DELIVERY_AND_PICKUP">Pengiriman Kurir & Ambil di Toko</option>
                          <option value="DELIVERY_ONLY">Hanya Pengiriman Kurir</option>
                          <option value="PICKUP_ONLY">Hanya Ambil di Toko</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {businessType === "SUPPLIER" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Jenis Pasokan / Supply</label>
                        <select
                          value={bizSpecialized.supplyType || "MANUFACTURER"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, supplyType: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark"
                        >
                          <option value="MANUFACTURER">Pabrikan / Manufaktur Langsung</option>
                          <option value="AUTHORIZED_DISTRIBUTOR">Distributor Tunggal / Resmi</option>
                          <option value="IMPORTER">Importir & Wholesaler</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Wilayah Pasokan Utama</label>
                        <input
                          type="text"
                          value={bizSpecialized.supplyRegion || "Nasional (Seluruh Indonesia)"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, supplyRegion: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Lead Time Pengiriman Rata-rata</label>
                        <input
                          type="text"
                          value={bizSpecialized.leadTime || "1-3 Hari Kerja"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, leadTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-dark">Ketentuan Minimum Order (MOQ)</label>
                        <input
                          type="text"
                          value={bizSpecialized.minOrder || "1 Dus / 10 Unit"}
                          onChange={(e) => setBizSpecialized({ ...bizSpecialized, minOrder: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBizStep(3)}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <SpinnerGap size={18} className="animate-spin" />
                        <span>Menyimpan Draf...</span>
                      </>
                    ) : (
                      <>
                        <span>Lanjut ke Upload Dokumen</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 5: DOKUMEN DINAMIS (Section 10 & 36) */}
            {bizStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-slate">
                      05. Dokumen Legalitas & Verifikasi
                    </div>
                    <p className="text-[11px] text-neutral-slate mt-0.5">
                      Daftar dokumen dimuat secara dinamis dari database sesuai konfigurasi mitra.
                    </p>
                  </div>
                  {bizRegNumber && (
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 rounded-lg text-primary">
                      {bizRegNumber}
                    </span>
                  )}
                </div>

                {loadingDocs ? (
                  <div className="py-8 text-center text-xs text-neutral-slate flex items-center justify-center gap-2">
                    <SpinnerGap size={20} className="animate-spin text-primary" />
                    <span>Memuat persyaratan dokumen...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {docReqs.map((req) => {
                      const item = uploadedFiles[req.documentType];
                      return (
                        <div
                          key={req.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-neutral-dark">{req.label}</span>
                                {req.required ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                                    Wajib
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    Kondisional / Opsional
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-slate mt-0.5">{req.description}</p>
                            </div>

                            {item?.uploaded ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                                <CheckCircle size={14} weight="fill" /> Terunggah
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <label className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-primary cursor-pointer text-xs text-neutral-dark">
                              <span className="truncate flex items-center gap-1.5">
                                <Paperclip size={14} className="text-neutral-slate" />
                                {item?.file ? item.file.name : "Pilih berkas..."}
                              </span>
                              <span className="text-[10px] font-semibold text-primary ml-2 shrink-0">Browse</span>
                              <input
                                type="file"
                                accept={req.allowedExtensions.map((e) => `.${e}`).join(",")}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileSelect(req.documentType, e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>

                            {item?.file && !item.uploaded && (
                              <button
                                type="button"
                                onClick={() => handleUploadSingleDoc(req.documentType)}
                                className="py-2 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shrink-0"
                              >
                                Upload
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBizStep(4)}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleBizStep5}
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <SpinnerGap size={18} className="animate-spin" />
                        <span>Mengunggah Dokumen...</span>
                      </>
                    ) : (
                      <>
                        <span>Lanjut ke Review Data</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW & SUBMIT (Section 7.6, 8.6, 9.6) */}
            {bizStep === 6 && (
              <div className="space-y-5">
                <div className="text-xs font-semibold text-neutral-slate">
                  06. Tinjau Kembali Seluruh Data Sebelum Dikirim
                </div>

                <div className="space-y-3 text-xs">
                  {/* Akun */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-neutral-dark block text-xs">Akun Pemohon</span>
                    <p className="text-neutral-slate">Nama: {bizAccount.fullName}</p>
                    <p className="text-neutral-slate">Email: {bizAccount.email} | Telepon: {bizAccount.phone}</p>
                  </div>

                  {/* PIC */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-neutral-dark block text-xs">Penanggung Jawab (PIC)</span>
                    <p className="text-neutral-slate">Nama: {bizPic.fullName} ({bizPic.position})</p>
                    <p className="text-neutral-slate">NIK: {bizPic.nik} | HP: {bizPic.phone}</p>
                  </div>

                  {/* Bisnis */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-neutral-dark block text-xs">Informasi Usaha</span>
                    <p className="text-neutral-slate">Legal: {bizLegal.legalName} ({bizLegal.businessType})</p>
                    <p className="text-neutral-slate">Brand: {bizLegal.brandName} | NIB: {bizLegal.nib}</p>
                    <p className="text-neutral-slate">Alamat: {bizLegal.address}, {bizLegal.city}</p>
                  </div>

                  {/* Dokumen Terunggah */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="font-bold text-neutral-dark block text-xs">Dokumen Dilampirkan</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(uploadedFiles).map((docType) => (
                        <span key={docType} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                          <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                          {docType}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                  <Clock size={20} className="text-blue-600 shrink-0 mt-0.5" weight="duotone" />
                  <p className="leading-relaxed">
                    Setelah Anda menekan <strong>Kirim Pendaftaran</strong>, aplikasi bisnis Anda akan berstatus <strong>UNDER_REVIEW</strong> dan ditinjau oleh Tim Operasional Admin SERVIO.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBizStep(5)}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                  >
                    Ubah Data / Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={handleBizFinalSubmit}
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <SpinnerGap size={18} className="animate-spin" />
                        <span>Mengirimkan Pendaftaran...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Pendaftaran (Submit)</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-neutral-slate">Memuat formulir pendaftaran...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
