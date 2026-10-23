/**
 * SERVIO — PHASE 05A ORDER BARANG
 * Pure Calculation & Formatting Utilities
 */

import { MockShippingRateTier } from "@/types/order-barang";

export function formatRupiah(amount: number): string {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
}

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "00:00:00";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export function formatDateTimeIndo(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Calculates shipping fee based on tiered distance configuration
 */
export function calculateTieredShippingFee(
  distanceKm: number,
  tiers: MockShippingRateTier[],
  maxRadiusKm: number = 10
): { fee: number; isCovered: boolean; tierMatched?: MockShippingRateTier } {
  if (distanceKm > maxRadiusKm) {
    return { fee: 0, isCovered: false };
  }
  const matched = tiers.find(
    (t) => distanceKm >= t.minKm && distanceKm <= t.maxKm
  );
  if (matched) {
    return { fee: matched.rate, isCovered: true, tierMatched: matched };
  }
  return { fee: 0, isCovered: false };
}

/**
 * Calculates 12 Merchant Operating Hours SLA deadline (LOCKED)
 * Operating Hours: Mon - Sat, 09:00 - 17:00 (8 operating hours/day)
 */
export function addOperatingHours(startDate: Date, operatingHoursToAdd: number): Date {
  const result = new Date(startDate.getTime());
  let remainingHours = operatingHoursToAdd;

  while (remainingHours > 0) {
    // Check if Sunday (0) -> skip to Monday 09:00
    if (result.getDay() === 0) {
      result.setDate(result.getDate() + 1);
      result.setHours(9, 0, 0, 0);
      continue;
    }

    const currentHour = result.getHours();
    if (currentHour < 9) {
      result.setHours(9, 0, 0, 0);
      continue;
    }

    if (currentHour >= 17) {
      // Move to next day at 09:00
      result.setDate(result.getDate() + 1);
      result.setHours(9, 0, 0, 0);
      continue;
    }

    // Within operating hours (9 - 17): max 8 hours available in current day
    const hoursLeftToday = 17 - currentHour;
    if (remainingHours <= hoursLeftToday) {
      result.setHours(result.getHours() + remainingHours);
      remainingHours = 0;
    } else {
      remainingHours -= hoursLeftToday;
      result.setDate(result.getDate() + 1);
      result.setHours(9, 0, 0, 0);
    }
  }

  return result;
}
