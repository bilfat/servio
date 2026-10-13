"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart, CheckCircle, Warning, Package, ShieldCheck } from "@phosphor-icons/react";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";

export interface ProductCardData {
  id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  compatibilityTags: string[];
  merchantName: string;
  rating: number;
  thumbnailUrl?: string;
  warrantyMonths?: number;
}

export interface ProductCardProps {
  product: ProductCardData;
  onAddToCart?: (id: string) => void;
  className?: string;
}

export function ProductCard({
  product,
  onAddToCart,
  className = "",
}: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-servio-xs hover:shadow-servio-md transition-all flex flex-col justify-between font-body text-left group ${className}`}>
      {/* Product Image Box */}
      <div className="relative h-40 bg-slate-50 p-3 flex flex-col justify-between border-b border-slate-100">
        <div className="flex items-center justify-between z-10 gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-neutral-slate border border-slate-200 truncate">
            {product.category}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={12} weight="fill" className="text-emerald-600" />
              Garansi {product.warrantyMonths ?? 12} Bln
            </span>
            {isOutOfStock ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-neutral-slate">
                Habis
              </span>
            ) : isLowStock ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Warning size={12} weight="fill" /> {product.stock}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                <CheckCircle size={12} weight="fill" /> Siap
              </span>
            )}
          </div>
        </div>

        {/* Product Graphic Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:scale-105 transition-transform duration-300">
          <Package size={56} weight="duotone" className="text-primary" />
        </div>

        <div className="z-10 text-[11px] text-neutral-slate truncate">
          {product.merchantName}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <Link
            href={`/products/${product.id}`}
            className="text-xs font-bold font-display text-neutral-dark hover:text-primary transition-colors line-clamp-2 leading-snug"
          >
            {product.title}
          </Link>

          {/* Compatibility Tag Pill */}
          {product.compatibilityTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.compatibilityTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-sky text-primary border border-sky-200 truncate max-w-[150px]"
                >
                  Cocok: {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price & Add to Cart */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-neutral-slate font-medium">Harga Resmi</p>
            <p className="text-sm font-bold font-display text-primary leading-tight">
              {formatRupiah(product.price)}
            </p>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onAddToCart?.(product.id)}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center min-w-[38px] min-h-[38px] ${
              isOutOfStock
                ? "bg-slate-100 text-neutral-disabled cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary-dark shadow-servio-xs cursor-pointer"
            }`}
            title="Tambah ke Keranjang"
            aria-label="Tambah ke Keranjang"
          >
            <ShoppingCart size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
