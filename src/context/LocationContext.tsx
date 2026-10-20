"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getCurrentGpsPosition, reverseGeocodeLocation, formatStoreDistance } from "@/lib/geoUtils";
import { profileApi, ApiAddress } from "@/lib/servioApi";
import { useActiveRole } from "@/context/RoleContext";

export interface ActiveLocation {
  displayName: string;
  city: string;
  district?: string;
  province?: string;
  postalCode?: string;
  street?: string;
  latitude?: number;
  longitude?: number;
  isGps: boolean;
  source: "GPS" | "CUSTOMER_ADDRESS" | "MANUAL_SELECT" | "DEFAULT";
  addressLabel?: string;
  addressId?: string;
}

export interface DeliveryCheckResult {
  isDeliverable: boolean;
  isSameCity: boolean;
  userCity: string;
  merchantCity: string;
  reason?: string;
}

export interface LocationContextType {
  location: ActiveLocation;
  activeLocation: ActiveLocation;
  savedAddresses: ApiAddress[];
  isDetectingGps: boolean;
  isLoadingAddresses: boolean;
  locationFeedback: string | null;
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  detectGps: () => Promise<ActiveLocation | null>;
  setManualCity: (cityName: string, provinceName?: string) => void;
  selectSavedAddress: (address: ApiAddress) => void;
  refreshAddresses: () => Promise<void>;
  checkDeliveryAvailability: (merchantCity?: string) => DeliveryCheckResult;
  getStoreDistance: (merchant?: {
    city?: string;
    latitude?: number;
    longitude?: number;
    id?: string;
    name?: string;
    district?: string;
  }) => string;
}

const DEFAULT_LOCATION: ActiveLocation = {
  displayName: "Jakarta Selatan (Kebayoran Baru)",
  city: "Jakarta Selatan",
  district: "Kebayoran Baru",
  province: "DKI Jakarta",
  postalCode: "12150",
  street: "Jl. Gandaria Tengah IV No. 12",
  latitude: -6.2415,
  longitude: 106.7932,
  isGps: false,
  source: "DEFAULT",
};

export const POPULAR_CITIES = [
  { city: "Jakarta Selatan", province: "DKI Jakarta" },
  { city: "Jakarta Barat", province: "DKI Jakarta" },
  { city: "Jakarta Pusat", province: "DKI Jakarta" },
  { city: "Jakarta Timur", province: "DKI Jakarta" },
  { city: "Jakarta Utara", province: "DKI Jakarta" },
  { city: "Tangerang Selatan", province: "Banten" },
  { city: "Tangerang", province: "Banten" },
  { city: "Depok", province: "Jawa Barat" },
  { city: "Bekasi", province: "Jawa Barat" },
  { city: "Bogor", province: "Jawa Barat" },
  { city: "Bandung", province: "Jawa Barat" },
  { city: "Surabaya", province: "Jawa Timur" },
  { city: "Semarang", province: "Jawa Tengah" },
  { city: "Yogyakarta", province: "DI Yogyakarta" },
  { city: "Medan", province: "Sumatera Utara" },
  { city: "Denpasar", province: "Bali" },
];

export function normalizeCityName(city?: string | null): string {
  if (!city) return "";
  return city
    .toLowerCase()
    .replace(/^(kota|kabupaten|kab\.|adm\.)\s+/i, "")
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

export function isSameCity(city1?: string | null, city2?: string | null): boolean {
  const c1 = normalizeCityName(city1);
  const c2 = normalizeCityName(city2);
  if (!c1 || !c2) return true; // Graceful fallback if unknown
  if (c1 === c2) return true;
  if (c1.startsWith("jakarta") && c2.startsWith("jakarta")) return true;
  return c1.includes(c2) || c2.includes(c1);
}

export function calculateStoreDistance(
  userLoc: ActiveLocation,
  merchant?: {
    city?: string;
    latitude?: number;
    longitude?: number;
    id?: string;
    name?: string;
    district?: string;
  }
): string {
  const mCity = merchant?.city || "Jakarta Selatan";
  if (!isSameCity(mCity, userLoc.city)) {
    return "Luar Kota";
  }

  return formatStoreDistance(
    userLoc.latitude,
    userLoc.longitude,
    merchant?.latitude,
    merchant?.longitude,
    `${merchant?.id || merchant?.name || "merch"}-${userLoc.city}-${userLoc.district || ""}`
  );
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user, activeRole, isAuthenticated, isPublicGuest } = useActiveRole();
  const isCustomer = (activeRole === "CUSTOMER" || user.activeRole === "CUSTOMER") && isAuthenticated && !isPublicGuest;
  const [location, setLocation] = useState<ActiveLocation>(DEFAULT_LOCATION);
  const [savedAddresses, setSavedAddresses] = useState<ApiAddress[]>([]);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // 1. Initial Load: Try reading customer default address if logged in, or localStorage
  useEffect(() => {
    let hasLoadedCustomerDefault = false;

    // Check if customer addresses are available
    if (isCustomer && user.id && user.id !== "guest") {
      setIsLoadingAddresses(true);
      profileApi
        .getAddresses()
        .then((res) => {
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            setSavedAddresses(res.data);
            const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
            if (defaultAddr) {
              hasLoadedCustomerDefault = true;
              setLocation({
                displayName: `${defaultAddr.city} (${defaultAddr.district || defaultAddr.label})`,
                city: defaultAddr.city,
                district: defaultAddr.district,
                province: defaultAddr.province || "DKI Jakarta",
                postalCode: defaultAddr.postalCode,
                street: defaultAddr.addressLine,
                latitude: defaultAddr.latitude != null ? defaultAddr.latitude : undefined,
                longitude: defaultAddr.longitude != null ? defaultAddr.longitude : undefined,
                isGps: false,
                source: "CUSTOMER_ADDRESS",
                addressLabel: defaultAddr.label,
                addressId: defaultAddr.id,
              });
            }
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingAddresses(false));
    }

    // If not loaded from customer address book, restore from localStorage
    if (!hasLoadedCustomerDefault) {
      try {
        const saved = localStorage.getItem("servio_user_location");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.city) {
            setLocation({
              displayName: parsed.name || `${parsed.city}${parsed.district ? ` (${parsed.district})` : ""}`,
              city: parsed.city,
              district: parsed.district,
              province: parsed.province,
              postalCode: parsed.postalCode,
              street: parsed.street,
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              isGps: Boolean(parsed.isGps),
              source: parsed.isGps ? "GPS" : "MANUAL_SELECT",
            });
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }, [isCustomer, user.id]);

  // Save changes to localStorage when location changes
  const saveToLocalStorage = useCallback((loc: ActiveLocation) => {
    try {
      localStorage.setItem(
        "servio_user_location",
        JSON.stringify({
          name: loc.displayName,
          city: loc.city,
          district: loc.district,
          province: loc.province,
          postalCode: loc.postalCode,
          street: loc.street,
          latitude: loc.latitude,
          longitude: loc.longitude,
          isGps: loc.isGps,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore storage quota error
    }
  }, []);

  // 2. Trigger browser GPS detection
  const detectGps = useCallback(async (): Promise<ActiveLocation | null> => {
    setIsDetectingGps(true);
    setLocationFeedback(null);
    try {
      const pos = await getCurrentGpsPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const geo = await reverseGeocodeLocation(lat, lng);

      const newLoc: ActiveLocation = {
        displayName: geo.displayName,
        city: geo.city,
        district: geo.district,
        province: geo.province,
        postalCode: geo.postalCode,
        street: geo.street,
        latitude: lat,
        longitude: lng,
        isGps: true,
        source: "GPS",
      };

      setLocation(newLoc);
      saveToLocalStorage(newLoc);
      setLocationFeedback(`GPS Aktif: Wilayah terdeteksi di ${geo.displayName}`);
      setTimeout(() => setLocationFeedback(null), 4000);
      return newLoc;
    } catch (err: any) {
      const msg = err?.message || "Izin lokasi GPS ditolak atau tidak didukung.";
      setLocationFeedback(msg);
      setTimeout(() => setLocationFeedback(null), 5000);
      return null;
    } finally {
      setIsDetectingGps(false);
    }
  }, [saveToLocalStorage]);

  // 3. Set manual city selection
  const setManualCity = useCallback(
    (cityName: string, provinceName?: string) => {
      const newLoc: ActiveLocation = {
        displayName: cityName,
        city: cityName,
        province: provinceName || "Indonesia",
        isGps: false,
        source: "MANUAL_SELECT",
      };
      setLocation(newLoc);
      saveToLocalStorage(newLoc);
      setLocationFeedback(`Wilayah pengiriman diubah ke ${cityName}`);
      setTimeout(() => setLocationFeedback(null), 3000);
    },
    [saveToLocalStorage]
  );

  // 4. Select from customer's saved address book
  const selectSavedAddress = useCallback(
    (address: ApiAddress) => {
      const newLoc: ActiveLocation = {
        displayName: `${address.city} (${address.district || address.label})`,
        city: address.city,
        district: address.district,
        province: address.province || "DKI Jakarta",
        postalCode: address.postalCode,
        street: address.addressLine,
        latitude: address.latitude != null ? address.latitude : undefined,
        longitude: address.longitude != null ? address.longitude : undefined,
        isGps: false,
        source: "CUSTOMER_ADDRESS",
        addressLabel: address.label,
        addressId: address.id,
      };
      setLocation(newLoc);
      saveToLocalStorage(newLoc);
      setLocationFeedback(`Alamat aktif diubah ke [${address.label}] ${address.city}`);
      setTimeout(() => setLocationFeedback(null), 3000);
    },
    [saveToLocalStorage]
  );

  // 5. Refresh customer addresses
  const refreshAddresses = useCallback(async () => {
    if (!isCustomer || !user.id || user.id === "guest") return;
    setIsLoadingAddresses(true);
    try {
      const res = await profileApi.getAddresses();
      if (res.data) {
        setSavedAddresses(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [isCustomer, user.id]);

  // 6. Core Delivery Verification: In-City vs Out-of-City Check
  const checkDeliveryAvailability = useCallback(
    (merchantCity?: string): DeliveryCheckResult => {
      const uCity = location.city || "Jakarta Selatan";
      const mCity = merchantCity || "Jakarta Selatan";

      const same = isSameCity(uCity, mCity);

      if (same) {
        return {
          isDeliverable: true,
          isSameCity: true,
          userCity: uCity,
          merchantCity: mCity,
        };
      }

      return {
        isDeliverable: false,
        isSameCity: false,
        userCity: uCity,
        merchantCity: mCity,
        reason: `Toko ini berlokasi di ${mCity} dan saat ini HANYA melayani pengiriman dalam kota. Lokasi Anda saat ini terdeteksi di ${uCity}.`,
      };
    },
    [location.city]
  );

  // 7. Calculate distance to merchant
  const getStoreDistance = useCallback(
    (merchant?: {
      city?: string;
      latitude?: number;
      longitude?: number;
      id?: string;
      name?: string;
      district?: string;
    }): string => {
      return calculateStoreDistance(location, merchant);
    },
    [location]
  );

  const value = useMemo(
    () => ({
      location,
      activeLocation: location,
      savedAddresses,
      isDetectingGps,
      isLoadingAddresses,
      locationFeedback,
      isLocationModalOpen,
      openLocationModal: () => setIsLocationModalOpen(true),
      closeLocationModal: () => setIsLocationModalOpen(false),
      detectGps,
      setManualCity,
      selectSavedAddress,
      refreshAddresses,
      checkDeliveryAvailability,
      getStoreDistance,
    }),
    [
      location,
      savedAddresses,
      isDetectingGps,
      isLoadingAddresses,
      locationFeedback,
      isLocationModalOpen,
      detectGps,
      setManualCity,
      selectSavedAddress,
      refreshAddresses,
      checkDeliveryAvailability,
      getStoreDistance,
    ]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useActiveLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useActiveLocation must be used within a LocationProvider");
  }
  return context;
}

export const useLocation = useActiveLocation;

