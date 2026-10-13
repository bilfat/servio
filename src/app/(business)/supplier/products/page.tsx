"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Package,
  Plus,
  MagnifyingGlass,
  Funnel,
  Eye,
  Clock,
  CheckCircle,
  WarningCircle,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { supplierProductsApi, productsApi } from "@/lib/servioApi";
import type { ApiSupplierProduct, ApiProduct, ApiProductVariant } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

function SupplierProductsContent() {
  const [supplierProducts, setSupplierProducts] = useState<ApiSupplierProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("q", "");
  const [statusFilter, setStatusFilter] = useUrlQueryState<string>("status", "ALL");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [suppRes, prodRes] = await Promise.all([
        supplierProductsApi.list({ status: statusFilter }),
        productsApi.list({ scope: "public" }),
      ]);
      const suppData = Array.isArray(suppRes.data)
        ? suppRes.data
        : (suppRes.data && Array.isArray((suppRes.data as any).products) ? (suppRes.data as any).products : []);
      const prodData = Array.isArray(prodRes.data)
        ? prodRes.data
        : (prodRes.data && Array.isArray((prodRes.data as any).products) ? (prodRes.data as any).products : []);
      setSupplierProducts(suppData);
      setAvailableProducts(prodData);
      if (prodData && prodData.length > 0 && !selectedProductId) {
        setSelectedProductId(prodData[0].productId);
        if (prodData[0].variants && prodData[0].variants.length > 0) {
          setSelectedVariantId(prodData[0].variants[0].variantId);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load supplier products:", err);
      setSupplierProducts([]);
      setAvailableProducts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displaySupplierProducts = (Array.isArray(supplierProducts) ? supplierProducts : []).filter((sp) => {
    if (!searchQuery?.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sp.supplierProductCode?.toLowerCase().includes(q) ||
      sp.supplierProductName?.toLowerCase().includes(q) ||
      sp.product?.name?.toLowerCase().includes(q)
    );
  });

  const currentSelectedProduct = availableProducts.find((p) => p.productId === selectedProductId);

  const handleCreateSupplierProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedVariantId || !code.trim()) {
      setFormError("Pilih produk, varian, dan isi kode referensi supplier.");
      return;
    }

    try {
      await supplierProductsApi.create({
        productId: selectedProductId,
        variantId: selectedVariantId,
        supplierProductCode: code.trim(),
        supplierProductName: name.trim() || undefined,
        supplierDescription: description.trim() || undefined,
        status: "ACTIVE",
      });

      setIsAddModalOpen(false);
      setCode("");
      setName("");
      setDescription("");
      setFormError(null);
      setToastMessage("Pasokan suku cadang berhasil didaftarkan ke katalog pasokan Anda!");
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || "Gagal mendaftarkan produk pasokan.");
    }
  };

  const handleToggleStatus = async (sp: ApiSupplierProduct) => {
    try {
      if (sp.status === "ACTIVE") {
        await supplierProductsApi.deactivate(sp.supplierProductId);
        setToastMessage(`Pasokan ${sp.supplierProductCode} dinonaktifkan.`);
      } else {
        await supplierProductsApi.activate(sp.supplierProductId);
        setToastMessage(`Pasokan ${sp.supplierProductCode} diaktifkan.`);
      }
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal mengubah status pasokan.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-primary">
                  <Package size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Katalog Pasokan Suku Cadang Resmi Supplier
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hubungkan pasokan komponen resmi Anda dengan varian suku cadang katalog platform
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={18} weight="bold" />
              <span>Daftarkan Pasokan Baru</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Search & Filter */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari kode pasokan supplier atau nama produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ALL">Semua Status Pasokan</option>
              <option value="ACTIVE">Aktif (Tersedia)</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Memuat katalog pasokan supplier...</div>
          ) : displaySupplierProducts.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              Belum ada pasokan terdaftar. Klik &quot;Daftarkan Pasokan Baru&quot; untuk menghubungkan suku cadang.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6">Kode &amp; Nama Pasokan</th>
                  <th className="p-4">Varian Suku Cadang Terhubung</th>
                  <th className="p-4">Deskripsi Pasokan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySupplierProducts.map((sp) => (
                  <tr key={sp.supplierProductId} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-900 font-mono">{sp.supplierProductCode}</div>
                      <div className="text-[11px] text-slate-500">{sp.supplierProductName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#0F4C81]">
                        {sp.product?.name || sp.productId}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Varian: {sp.variant?.name || sp.variantId}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">
                      {sp.supplierDescription || "-"}
                    </td>
                    <td className="p-4">
                      <Badge variant={sp.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {sp.status}
                      </Badge>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        variant={sp.status === "ACTIVE" ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => handleToggleStatus(sp)}
                        className="text-[11px]"
                      >
                        {sp.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Supplier Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hubungkan Pasokan Suku Cadang</h2>
              <p className="text-xs text-slate-500 mt-1">
                Pilih produk katalog resmi dan tautkan kode pasokan internal supplier Anda
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSupplierProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Produk Katalog *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = availableProducts.find((x) => x.productId === e.target.value);
                    if (p && p.variants && p.variants.length > 0) {
                      setSelectedVariantId(p.variants[0].variantId);
                    }
                  }}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {availableProducts.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.name} ({p.brandName || "Universal"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Varian Produk *</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {currentSelectedProduct?.variants?.map((v) => (
                    <option key={v.variantId} value={v.variantId}>
                      {v.name} &bull; Rp{v.price.toLocaleString("id-ID")}
                    </option>
                  )) || <option value="">Tidak ada varian</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Produk Supplier *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: SUPP-FR32-24KG-KARTON"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pasokan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Freon R32 2.4kg Kemasan Workshop"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Pasokan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kelayakan pasokan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#0F4C81] text-white">
                  Daftarkan Pasokan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupplierProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat pasokan supplier...</div>}>
      <SupplierProductsContent />
    </Suspense>
  );
}
