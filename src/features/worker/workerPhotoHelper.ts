"use client";

import { useState, useEffect } from "react";

export const WORKER_PHOTO_STORAGE_KEY = "servio_worker_profile_photo";
export const WORKER_PHOTO_EVENT = "servio:worker-photo-updated";

// Default verified server avatar path from identity storage
export const DEFAULT_SERVER_AVATAR = "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg";

const KNOWN_WORKER_IDS = [
  "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
  "eb61b49d-d917-4f68-bda2-d52637643573",
  "wrk-active",
];

export function getStoredWorkerPhoto(workerId?: string): string | null {
  if (typeof window === "undefined") return DEFAULT_SERVER_AVATAR;
  try {
    if (workerId) {
      const specific = localStorage.getItem(`${WORKER_PHOTO_STORAGE_KEY}_${workerId}`);
      if (specific) return specific;

      // Check known aliases
      if (KNOWN_WORKER_IDS.includes(workerId)) {
        for (const alias of KNOWN_WORKER_IDS) {
          const aliasVal = localStorage.getItem(`${WORKER_PHOTO_STORAGE_KEY}_${alias}`);
          if (aliasVal) return aliasVal;
        }
      }
    }

    const general = localStorage.getItem(WORKER_PHOTO_STORAGE_KEY);
    if (general) return general;

    // Default fallback to server avatar
    return DEFAULT_SERVER_AVATAR;
  } catch {}
  return DEFAULT_SERVER_AVATAR;
}

export function saveStoredWorkerPhoto(photoUrl: string, workerId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKER_PHOTO_STORAGE_KEY, photoUrl);
    if (workerId) {
      localStorage.setItem(`${WORKER_PHOTO_STORAGE_KEY}_${workerId}`, photoUrl);
    }
    // Also save under all known aliases so cross-module queries always succeed
    for (const alias of KNOWN_WORKER_IDS) {
      localStorage.setItem(`${WORKER_PHOTO_STORAGE_KEY}_${alias}`, photoUrl);
    }

    window.dispatchEvent(
      new CustomEvent(WORKER_PHOTO_EVENT, { detail: { photoUrl, workerId } })
    );
    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("servio_worker_photo_channel");
        bc.postMessage({ photoUrl, workerId });
        bc.close();
      }
    } catch {}
  } catch {}
}

export function removeStoredWorkerPhoto(workerId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WORKER_PHOTO_STORAGE_KEY);
    if (workerId) {
      localStorage.removeItem(`${WORKER_PHOTO_STORAGE_KEY}_${workerId}`);
    }
    for (const alias of KNOWN_WORKER_IDS) {
      localStorage.removeItem(`${WORKER_PHOTO_STORAGE_KEY}_${alias}`);
    }
    window.dispatchEvent(
      new CustomEvent(WORKER_PHOTO_EVENT, { detail: { photoUrl: null, workerId } })
    );
  } catch {}
}

export function useWorkerPhoto(workerId?: string, fallbackUrl?: string) {
  const [photo, setPhoto] = useState<string | null>(() => {
    return getStoredWorkerPhoto(workerId) || fallbackUrl || DEFAULT_SERVER_AVATAR;
  });

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const updatedUrl = e.detail?.photoUrl;
      const targetWorkerId = e.detail?.workerId;
      if (!targetWorkerId || !workerId || targetWorkerId === workerId || KNOWN_WORKER_IDS.includes(workerId)) {
        setPhoto(updatedUrl || fallbackUrl || DEFAULT_SERVER_AVATAR);
      }
    };

    window.addEventListener(WORKER_PHOTO_EVENT, handleUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("servio_worker_photo_channel");
        bc.onmessage = (msg) => {
          if (!msg.data?.workerId || !workerId || msg.data?.workerId === workerId || KNOWN_WORKER_IDS.includes(workerId)) {
            setPhoto(msg.data?.photoUrl || fallbackUrl || DEFAULT_SERVER_AVATAR);
          }
        };
      }
    } catch {}

    // Check again in case of initial hydration mismatch
    const current = getStoredWorkerPhoto(workerId);
    if (current && current !== photo) {
      setPhoto(current);
    }

    return () => {
      window.removeEventListener(WORKER_PHOTO_EVENT, handleUpdate);
      if (bc) bc.close();
    };
  }, [workerId, fallbackUrl, photo]);

  return photo;
}
