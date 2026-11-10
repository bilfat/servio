"use client";

import React from "react";
import {
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Lightbulb,
  Plugs,
  Drop,
  ShieldCheck,
  PaintBrush,
  Hammer,
  Truck,
  Fire,
  Scissors,
  Desktop,
  Television,
  Camera,
  Lock,
  WifiHigh,
  Package,
  Fan,
  Lightning,
  Cube,
  Tag,
  Cpu,
  Plug,
  Barcode,
  Storefront,
  Sliders,
  BatteryCharging,
  HardDrives,
  Gauge,
  Toolbox,
  Folder,
} from "@phosphor-icons/react";

export const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  // Service Presets
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Lightbulb,
  Plugs,
  Drop,
  ShieldCheck,
  PaintBrush,
  Hammer,
  Truck,
  Fire,
  Scissors,
  Desktop,
  Television,
  Camera,
  Lock,
  WifiHigh,
  Folder,
  // Product / Sparepart Presets
  Package,
  Fan,
  Lightning,
  Cube,
  Tag,
  Cpu,
  Plug,
  Barcode,
  Storefront,
  Sliders,
  BatteryCharging,
  HardDrives,
  Gauge,
  Toolbox,
};

export const AVAILABLE_SERVICE_ICONS = [
  { name: "Wrench", icon: Wrench, label: "Repair & Servis", isDefault: true },
  { name: "HouseLine", icon: HouseLine, label: "Home & Renovasi", isDefault: true },
  { name: "Broom", icon: Broom, label: "Cleaning & Kebersihan", isDefault: true },
  { name: "GearSix", icon: GearSix, label: "Maintenance & Mesin", isDefault: true },
  { name: "TreeEvergreen", icon: TreeEvergreen, label: "Lingkungan & Taman", isDefault: true },
  { name: "Car", icon: Car, label: "Otomotif & Kendaraan", isDefault: true },
  { name: "Lightbulb", icon: Lightbulb, label: "Lampu & Penerangan" },
  { name: "Plugs", icon: Plugs, label: "Kelistrikan & Steker" },
  { name: "Drop", icon: Drop, label: "Plumbing & Saluran Air" },
  { name: "PaintBrush", icon: PaintBrush, label: "Pengecatan & Dinding" },
  { name: "Hammer", icon: Hammer, label: "Pertukangan & Kayu" },
  { name: "Truck", icon: Truck, label: "Logistik & Angkutan" },
  { name: "Desktop", icon: Desktop, label: "Komputer & IT" },
  { name: "Television", icon: Television, label: "Elektronik & TV" },
  { name: "Camera", icon: Camera, label: "CCTV & Keamanan" },
  { name: "Lock", icon: Lock, label: "Kunci & Brankas" },
  { name: "WifiHigh", icon: WifiHigh, label: "Jaringan Internet" },
  { name: "Folder", icon: Folder, label: "Umum / Lainnya" },
];

export const AVAILABLE_PRODUCT_ICONS = [
  { name: "Package", icon: Package, label: "Semua Suku Cadang", isDefault: true },
  { name: "Fan", icon: Fan, label: "AC & Pendingin", isDefault: true },
  { name: "Lightning", icon: Lightning, label: "Komponen Elektrik", isDefault: true },
  { name: "Wrench", icon: Wrench, label: "Perkakas & Alat Kerja", isDefault: true },
  { name: "HouseLine", icon: HouseLine, label: "Material Bangunan", isDefault: true },
  { name: "Car", icon: Car, label: "Suku Cadang Otomotif", isDefault: true },
  { name: "Broom", icon: Broom, label: "Perlengkapan Cleaning" },
  { name: "GearSix", icon: GearSix, label: "Gir, Bearing & Transmisi" },
  { name: "Cube", icon: Cube, label: "Material & Baut" },
  { name: "Tag", icon: Tag, label: "Aksesoris & Retail" },
  { name: "Cpu", icon: Cpu, label: "Modul PCB & Elektronika" },
  { name: "Plug", icon: Plug, label: "Kabel & Steker" },
  { name: "BatteryCharging", icon: BatteryCharging, label: "Aki & Baterai" },
  { name: "Gauge", icon: Gauge, label: "Pressure Gauge & Meteran" },
  { name: "Toolbox", icon: Toolbox, label: "Toolbox & Kotak Perkakas" },
  { name: "ShieldCheck", icon: ShieldCheck, label: "Komponen Proteksi & MCB" },
];

export function isCustomImageIcon(iconName?: string | null): boolean {
  if (!iconName) return false;
  const str = iconName.trim().toLowerCase();
  return (
    str.startsWith("/") ||
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:image/") ||
    str.includes(".png") ||
    str.includes(".jpg") ||
    str.includes(".jpeg") ||
    str.includes(".webp") ||
    str.includes(".svg")
  );
}

export function resolveCategoryIconComponent(
  iconName?: string | null,
  categoryName?: string | null,
  fallback?: React.ElementType
): React.ElementType {
  if (iconName && !isCustomImageIcon(iconName)) {
    // Exact or case-insensitive match
    if (CATEGORY_ICON_MAP[iconName]) return CATEGORY_ICON_MAP[iconName];
    const foundKey = Object.keys(CATEGORY_ICON_MAP).find(
      (k) => k.toLowerCase() === iconName.toLowerCase()
    );
    if (foundKey && CATEGORY_ICON_MAP[foundKey]) return CATEGORY_ICON_MAP[foundKey];
  }

  // Keyword fallback
  const norm = (categoryName || "").toLowerCase();
  if (norm.includes("ac") || norm.includes("pendingin") || norm.includes("freon")) return Fan;
  if (norm.includes("listrik") || norm.includes("elektrik") || norm.includes("kabel")) return Lightning;
  if (norm.includes("otomotif") || norm.includes("mobil") || norm.includes("motor") || norm.includes("ban")) return Car;
  if (norm.includes("clean") || norm.includes("bersih") || norm.includes("cuci")) return Broom;
  if (norm.includes("bangunan") || norm.includes("material") || norm.includes("atap") || norm.includes("rumah")) return HouseLine;
  if (norm.includes("perkakas") || norm.includes("alat") || norm.includes("repair") || norm.includes("teknis")) return Wrench;
  if (norm.includes("maint") || norm.includes("rawat") || norm.includes("mesin")) return GearSix;
  if (norm.includes("lingkungan") || norm.includes("hama") || norm.includes("taman") || norm.includes("pohon")) return TreeEvergreen;

  return fallback || Package;
}

interface CategoryIconRendererProps {
  iconName?: string | null;
  categoryName?: string | null;
  size?: number;
  weight?: "regular" | "bold" | "duotone" | "fill";
  className?: string;
  fallbackIcon?: React.ElementType;
}

export function CategoryIconRenderer({
  iconName,
  categoryName,
  size = 20,
  weight = "duotone",
  className = "",
  fallbackIcon = Package,
}: CategoryIconRendererProps) {
  // If it's an uploaded image / custom illustration URL
  if (isCustomImageIcon(iconName)) {
    return (
      <img
        src={iconName!}
        alt={categoryName || "Ikon Kategori"}
        width={size}
        height={size}
        className={`object-contain shrink-0 rounded-sm ${className}`}
        style={{ width: `${size}px`, height: `${size}px`, maxWidth: `${size}px`, maxHeight: `${size}px` }}
      />
    );
  }

  // Otherwise, render the Phosphor icon component
  const IconComponent = resolveCategoryIconComponent(iconName, categoryName, fallbackIcon);
  return <IconComponent size={size} weight={weight} className={`shrink-0 ${className}`} />;
}

