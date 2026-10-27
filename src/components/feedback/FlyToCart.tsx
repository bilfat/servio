"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface FlyItem {
  id: string;
  imageUrl: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

type FlyListener = (item: FlyItem) => void;
let listeners: FlyListener[] = [];

/**
 * Triggers a 3D Parabolic "Fly-to-Cart" animation from sourceElement to the navbar cart icon.
 */
export function triggerFlyToCart(params: {
  sourceElement?: HTMLElement | null;
  imageUrl?: string;
  targetSelector?: string;
}) {
  if (typeof window === "undefined") return;

  // 1. Locate the cart icon in navbar
  const target =
    document.getElementById("navbar-cart-button") ||
    document.querySelector(params.targetSelector || '[aria-label="Keranjang Belanja"]') ||
    document.querySelector('a[href="/cart"]');

  if (!target) return;

  // Mark flight active and broadcast start event so badge waits for landing
  (window as any).__servio_cart_flight_active = true;
  window.dispatchEvent(new CustomEvent("servio:cart-flight-start"));

  const targetRect = target.getBoundingClientRect();
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;

  // 2. Locate the starting point (product image or clicked button)
  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 2;

  if (params.sourceElement) {
    const srcRect = params.sourceElement.getBoundingClientRect();
    startX = srcRect.left + srcRect.width / 2;
    startY = srcRect.top + srcRect.height / 2;
  }

  const flyItem: FlyItem = {
    id: `fly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    imageUrl: params.imageUrl || "/brand/logo.png",
    startX,
    startY,
    targetX,
    targetY,
  };

  listeners.forEach((fn) => fn(flyItem));
}

/**
 * Renders the flying clones over the page.
 */
export function FlyToCartHost() {
  const [flyingItems, setFlyingItems] = useState<FlyItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const listener: FlyListener = (item) => {
      setFlyingItems((prev) => [...prev, item]);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((fn) => fn !== listener);
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
      {flyingItems.map((item) => (
        <FlyingItemView
          key={item.id}
          item={item}
          onDone={() => {
            setFlyingItems((prev) => {
              const remaining = prev.filter((i) => i.id !== item.id);
              if (remaining.length === 0 && typeof window !== "undefined") {
                (window as any).__servio_cart_flight_active = false;
              }
              return remaining;
            });
            window.dispatchEvent(new CustomEvent("servio:cart-item-landed"));
          }}
        />
      ))}
    </div>,
    document.body
  );
}

function FlyingItemView({ item, onDone }: { item: FlyItem; onDone: () => void }) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    left: `${item.startX}px`,
    top: `${item.startY}px`,
    width: "72px",
    height: "72px",
    transform: "translate(-50%, -50%) scale(1) rotate(0deg)",
    opacity: 1,
    transition: "none",
  });

  useEffect(() => {
    // Stage 1: Graceful, clearly visible upward rise and float
    const popTimer = setTimeout(() => {
      // Calculate gentle arc apex (lifts up and shifts slightly toward cart)
      const apexX = item.startX + (item.targetX - item.startX) * 0.12;
      const apexY = Math.max(30, item.startY - 70);

      setStyle({
        position: "fixed",
        left: `${apexX}px`,
        top: `${apexY}px`,
        width: "68px",
        height: "68px",
        transform: "translate(-50%, -50%) scale(1.12) rotate(-6deg)",
        opacity: 1,
        transition: "all 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }, 15);

    // Stage 2: Parabolic swoosh dive straight into the cart after reaching peak
    const flightTimer = setTimeout(() => {
      setStyle({
        position: "fixed",
        left: `${item.targetX}px`,
        top: `${item.targetY}px`,
        width: "68px",
        height: "68px",
        transform: "translate(-50%, -50%) scale(0.2) rotate(360deg)",
        opacity: 0.1,
        transition: "all 0.44s cubic-bezier(0.25, 0.85, 0.35, 1)",
      });
    }, 340);

    // Stage 3: Landing at cart icon & trigger bounce feedback
    const doneTimer = setTimeout(() => {
      onDone();
    }, 780);

    return () => {
      clearTimeout(popTimer);
      clearTimeout(flightTimer);
      clearTimeout(doneTimer);
    };
  }, [item, onDone]);

  return (
    <div
      style={style}
      className="rounded-2xl bg-white border-2 border-[#0F4C81] shadow-2xl p-1.5 flex items-center justify-center overflow-hidden ring-4 ring-[#0F4C81]/25 backdrop-blur-xs select-none"
    >
      <img
        src={item.imageUrl}
        alt="Barang Masuk Keranjang"
        className="w-full h-full object-contain rounded-xl"
        onError={(e) => {
          e.currentTarget.src = "/brand/logo.png";
        }}
      />
    </div>
  );
}
