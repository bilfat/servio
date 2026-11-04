"use client";

import React, { useState, useEffect } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import {
  ShoppingCart,
  Wrench,
  Package,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { AdminServiceOrdersTab } from "@/features/order-jasa/components/admin/AdminServiceOrdersTab";
import { AdminProductOrdersTab } from "@/features/admin/components/AdminProductOrdersTab";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { AdminOrderCounts, orderBarangApi } from "@/lib/orderBarangApi";

export default function AdminGlobalOrdersPage() {
  const { orders: serviceOrders05B } = useOrderJasa();
  const {
    orderTypeTab,
    setOrderTypeTab,
  } = useAdminOperations();

  // Normalize active tab so it only ever points to SERVICE or PRODUCT
  const activeTab: "SERVICE" | "PRODUCT" =
    orderTypeTab === "PRODUCT" ? "PRODUCT" : "SERVICE";

  // Real backend Product Orders counts
  const [productCounts, setProductCounts] = useState<AdminOrderCounts | null>(null);

  useEffect(() => {
    orderBarangApi.admin
      .getOrderCounts()
      .then((res) => {
        if (res.data) setProductCounts(res.data);
      })
      .catch((err) => {
        console.warn("Failed to fetch initial product order counts:", err);
      });
  }, []);

  // Live Counts
  const serviceCount = serviceOrders05B.length;
  const productCount = productCounts?.total ?? 0;
  const totalTransactions = serviceCount + productCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <ShoppingCart size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Operasi Pesanan Global Platform (Global Orders)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan komprehensif transaksi platform: Pesanan Jasa Servis &amp; Perbaikan serta Pesanan Barang &amp; Suku Cadang Merchant.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="md">
              Total {totalTransactions} Transaksi Terdaftar
            </Badge>
          </div>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Tab 1: Pesanan Jasa (Service Orders) */}
        <button
          type="button"
          onClick={() => setOrderTypeTab("SERVICE")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "SERVICE"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Wrench size={18} weight="duotone" />
              <span className="text-xs font-bold font-heading">Pesanan Jasa Servis</span>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                activeTab === "SERVICE"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {serviceCount}
            </span>
          </div>
          <p
            className={`text-[11px] mt-1 line-clamp-1 ${
              activeTab === "SERVICE" ? "text-indigo-100" : "text-slate-500"
            }`}
          >
            Order Jasa Phase 05B &amp; Teknisi Lapangan
          </p>
        </button>

        {/* Tab 2: Pesanan Barang Merchant (Product Orders) */}
        <button
          type="button"
          onClick={() => setOrderTypeTab("PRODUCT")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "PRODUCT"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Package size={18} weight="duotone" />
              <span className="text-xs font-bold font-heading">Pesanan Barang &amp; Suku Cadang</span>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                activeTab === "PRODUCT"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {productCount}
            </span>
          </div>
          <p
            className={`text-[11px] mt-1 line-clamp-1 ${
              activeTab === "PRODUCT" ? "text-indigo-100" : "text-slate-500"
            }`}
          >
            Order Barang Merchant &amp; Pengiriman Kurir
          </p>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "SERVICE" ? (
        <AdminServiceOrdersTab />
      ) : (
        <AdminProductOrdersTab onCountsUpdated={setProductCounts} />
      )}
    </div>
  );
}
