"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AdminOrderDetailEntity,
  AdminOrderCounts,
  orderBarangApi,
} from "@/lib/orderBarangApi";
import {
  Package,
  MagnifyingGlass,
  SlidersHorizontal,
  ArrowClockwise,
  Eye,
  CheckCircle,
  Truck,
  WarningCircle,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdminProductOrderDetailModal } from "./AdminProductOrderDetailModal";

interface AdminProductOrdersTabProps {
  onCountsUpdated?: (counts: AdminOrderCounts) => void;
}

export function AdminProductOrdersTab({
  onCountsUpdated,
}: AdminProductOrdersTabProps) {
  const [orders, setOrders] = useState<AdminOrderDetailEntity[]>([]);
  const [counts, setCounts] = useState<AdminOrderCounts | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selected order for modal detail view
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderData, setSelectedOrderData] = useState<AdminOrderDetailEntity | null>(null);

  // Load counts
  const loadCounts = useCallback(async () => {
    try {
      const res = await orderBarangApi.admin.getOrderCounts();
      if (res.data) {
        setCounts(res.data);
        if (onCountsUpdated) {
          onCountsUpdated(res.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch product order counts:", err);
    }
  }, [onCountsUpdated]);

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderBarangApi.admin.getOrders({
        search: searchQuery || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        payment_status: paymentStatusFilter !== "ALL" ? paymentStatusFilter : undefined,
        page,
        per_page: perPage,
      });

      if (res.data) {
        setOrders(res.data.data || []);
        setTotalPages(res.data.last_page || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch admin product orders:", err);
      setError(err?.message || "Gagal memuat transaksi Product Orders dari server.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, paymentStatusFilter, page, perPage]);

  // Initial load and on filter change
  useEffect(() => {
    loadCounts();
    loadOrders();
  }, [loadCounts, loadOrders]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadCounts();
      loadOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadCounts, loadOrders]);

  // Mask phone number for privacy
  const maskPhone = (phone?: string) => {
    if (!phone) return "-";
    const cleaned = phone.trim();
    if (cleaned.length < 8) return cleaned;
    const start = cleaned.slice(0, 4);
    const end = cleaned.slice(-4);
    return `${start}-****-${end}`;
  };

  // Render Canonical Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "CREATED":
      case "PAYMENT_PENDING":
        return <Badge variant="warning" size="sm">Belum Bayar</Badge>;
      case "CONFIRMED":
        return <Badge variant="primary" size="sm">Masuk</Badge>;
      case "PROCESSING":
        return <Badge variant="primary" size="sm">Diproses</Badge>;
      case "PACKED":
        return <Badge variant="secondary" size="sm">Dikemas</Badge>;
      case "DELIVERING":
        return <Badge variant="primary" size="sm">Dikirim</Badge>;
      case "DELIVERED":
        return <Badge variant="success" size="sm">Diterima</Badge>;
      case "COMPLETED":
        return <Badge variant="success" size="sm">Selesai</Badge>;
      case "CANCELLED":
        return <Badge variant="danger" size="sm">Batal</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  // Render Payment Badge
  const renderPaymentBadge = (paymentStatus?: string | null) => {
    const s = (paymentStatus || "").toUpperCase();
    switch (s) {
      case "PAID":
        return <Badge variant="success" size="sm">PAID</Badge>;
      case "PENDING":
        return <Badge variant="warning" size="sm">PENDING</Badge>;
      case "EXPIRED":
        return <Badge variant="neutral" size="sm">EXPIRED</Badge>;
      case "FAILED":
        return <Badge variant="danger" size="sm">FAILED</Badge>;
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return <Badge variant="secondary" size="sm">{s}</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{s || "-"}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Status Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari Merchant Order ID, CheckoutGroup, Nama Toko, Pelanggan, atau Produk..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Pesanan Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setOrderStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status Pesanan ({counts?.total ?? "-"})</option>
              <option value="BELUM_BAYAR">Belum Bayar ({counts?.belum_bayar ?? "-"})</option>
              <option value="CONFIRMED">Masuk ({counts?.masuk ?? "-"})</option>
              <option value="PROCESSING">Diproses ({counts?.diproses ?? "-"})</option>
              <option value="PACKED">Dikemas ({counts?.dikemas ?? "-"})</option>
              <option value="DELIVERING">Dikirim ({counts?.dikirim ?? "-"})</option>
              <option value="DELIVERED">Diterima ({counts?.diterima ?? "-"})</option>
              <option value="COMPLETED">Selesai ({counts?.selesai ?? "-"})</option>
              <option value="CANCELLED">Batal ({counts?.batal ?? "-"})</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="w-full md:w-auto">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium w-full"
            >
              <option value="ALL">Semua Pembayaran</option>
              <option value="PENDING">Payment PENDING</option>
              <option value="PAID">Payment PAID</option>
              <option value="EXPIRED">Payment EXPIRED</option>
              <option value="FAILED">Payment FAILED</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              loadCounts();
              loadOrders();
            }}
            disabled={loading}
            title="Perbarui Data"
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowClockwise size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">No. Order &amp; Item</th>
                <th className="px-4 py-3">Pembeli &amp; Alamat</th>
                <th className="px-4 py-3">Total Transaksi</th>
                <th className="px-4 py-3">Kurir &amp; Resi</th>
                <th className="px-4 py-3">Status Pesanan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ArrowClockwise size={24} className="animate-spin inline mr-2 text-indigo-600" />
                    <span>Memuat data Product Orders dari database...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-rose-600">
                    <div className="flex flex-col items-center gap-2">
                      <WarningCircle size={24} />
                      <span className="font-semibold">{error}</span>
                      <Button variant="secondary" size="sm" onClick={() => loadOrders()} className="mt-1">
                        Coba Lagi
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 rounded-2xl bg-slate-100 text-slate-400">
                        <Package size={32} weight="duotone" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">Tidak ada Product Orders yang cocok</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Tidak ada transaksi pesanan barang di database yang memenuhi kriteria pencarian atau filter status yang dipilih.
                      </p>
                      {(statusFilter !== "ALL" || paymentStatusFilter !== "ALL" || searchQuery) && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setOrderStatusFilter("ALL");
                            setPaymentStatusFilter("ALL");
                            setPage(1);
                          }}
                          className="mt-2 text-xs text-indigo-600 hover:underline font-bold"
                        >
                          Reset Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const firstItem = o.items?.[0];
                  const totalItemsQty = o.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
                  const otherCount = (o.items?.length || 0) - 1;
                  const isUnpaidOrder = o.status === "CREATED" || o.status === "PAYMENT_PENDING";
                  const createdAtMs = new Date(o.created_at).getTime();
                  const isExpiredOrder = (isUnpaidOrder && Date.now() >= createdAtMs + 6 * 3600 * 1000) || o.payment_status_projection === "EXPIRED";
                  const effectiveStatus = (o.status === "CANCELLED" || isExpiredOrder) ? "CANCELLED" : o.status;
                  const effectivePaymentStatus = isExpiredOrder ? "EXPIRED" : o.payment_status_projection;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. NO. ORDER & ITEM */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-2.5">
                          {/* Thumbnail Product */}
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                            {firstItem?.product_image_ref ? (
                              <img
                                src={firstItem.product_image_ref}
                                alt={firstItem.product_snapshot?.name || "Produk"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package size={18} className="text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">{o.order_number}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{o.checkout_group_id.slice(-6)}
                              </span>
                            </div>

                            <p className="text-[11px] font-medium text-indigo-600 line-clamp-1 mt-0.5">
                              {o.merchant_display_snapshot?.name || "Toko Merchant"}
                            </p>

                            <p className="text-[11px] text-slate-700 line-clamp-1 mt-0.5">
                              {firstItem?.product_snapshot?.name || firstItem?.name || "Produk Suku Cadang"}
                              {otherCount > 0 && (
                                <span className="ml-1 text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-semibold">
                                  +{otherCount} lainnya
                                </span>
                              )}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>Total: {totalItemsQty} item</span>
                              <span>•</span>
                              <span>
                                {new Date(o.created_at).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. PEMBELI & ALAMAT */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800">
                          {o.recipient_snapshot?.recipient_name || o.address_snapshot?.recipient_name || "Pelanggan"}
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {o.address_snapshot?.city || o.address_snapshot?.district || "-"}
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          {o.address_snapshot?.address_line || "-"}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {maskPhone(o.recipient_snapshot?.recipient_phone || o.address_snapshot?.recipient_phone)}
                        </p>
                      </td>

                      {/* 3. TOTAL TRANSAKSI */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-slate-900 text-xs">
                            Rp {(o.customer_total_idr || 0).toLocaleString("id-ID")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Subtotal: Rp {(o.product_subtotal_idr || 0).toLocaleString("id-ID")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Ongkir: Rp {(o.shipping_customer_idr || 0).toLocaleString("id-ID")}
                          </p>
                          <div className="mt-1">
                            {renderPaymentBadge(effectivePaymentStatus)}
                          </div>
                        </div>
                      </td>

                      {/* 4. KURIR & RESI */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-700">
                          Kurir Toko Pribadi
                        </span>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]">
                          {o.delivery?.booking_reference || (o.delivery?.status === "NOT_STARTED" ? "Belum Dikirim" : "Menunggu Resi")}
                        </p>
                        <div className="mt-1">
                          <Badge
                            variant={
                              o.delivery?.status === "DELIVERED"
                                ? "success"
                                : o.delivery?.status === "IN_TRANSIT"
                                ? "primary"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {o.delivery?.status || "NOT_STARTED"}
                          </Badge>
                        </div>
                      </td>

                      {/* 5. STATUS PESANAN */}
                      <td className="px-4 py-3.5">
                        {renderStatusBadge(effectiveStatus)}
                        {effectiveStatus === "CANCELLED" && (
                          <p className="text-[10px] text-rose-600 font-medium mt-1 leading-tight">
                            {o.cancel_reason_code || o.cancel_reason || "Belum menyelesaikan pembayaran"}
                          </p>
                        )}
                      </td>

                      {/* 6. AKSI */}
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderId(o.id);
                            setSelectedOrderData(o);
                          }}
                        >
                          <Eye size={12} className="mr-1" /> Lihat Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Menampilkan{" "}
              <span className="font-bold text-slate-800">
                {(page - 1) * perPage + 1} - {Math.min(page * perPage, totalCount)}
              </span>{" "}
              dari <span className="font-bold text-slate-800">{totalCount}</span> Merchant Orders
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretLeft size={14} />
              </button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrderId && (
        <AdminProductOrderDetailModal
          orderId={selectedOrderId}
          initialOrder={selectedOrderData}
          onClose={() => {
            setSelectedOrderId(null);
            setSelectedOrderData(null);
          }}
        />
      )}
    </div>
  );
}
