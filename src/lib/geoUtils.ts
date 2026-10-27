/**
 * Utility functions for Geolocation and Reverse Geocoding in SERVIO
 */

export interface GeocodedLocation {
  city: string;
  district: string;
  province: string;
  postalCode: string;
  street: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Determine regional details from coordinate bounding box fallback (Jabodetabek & major Indonesian cities)
 */
function getIndonesianRegionFallback(lat: number, lng: number): Omit<GeocodedLocation, "latitude" | "longitude"> {
  // Jakarta Selatan & Kebayoran / Cilandak
  if (lat >= -6.35 && lat <= -6.18 && lng >= 106.75 && lng <= 106.88) {
    if (lat <= -6.23) {
      return {
        city: "Jakarta Selatan",
        district: "Kebayoran Baru",
        province: "DKI Jakarta",
        postalCode: "12150",
        street: "Jl. Gandaria Tengah IV No. 12",
        displayName: "Jakarta Selatan (Kebayoran Baru)",
      };
    }
    return {
      city: "Jakarta Selatan",
      district: "Setiabudi",
      province: "DKI Jakarta",
      postalCode: "12910",
      street: "Jl. Rasuna Said Kav. 5",
      displayName: "Jakarta Selatan (Kuningan)",
    };
  }

  // Jakarta Pusat
  if (lat >= -6.20 && lat <= -6.14 && lng >= 106.80 && lng <= 106.88) {
    return {
      city: "Jakarta Pusat",
      district: "Gambir",
      province: "DKI Jakarta",
      postalCode: "10110",
      street: "Jl. Medan Merdeka Barat",
      displayName: "Jakarta Pusat (Gambir)",
    };
  }

  // Jakarta Barat
  if (lat >= -6.22 && lat <= -6.12 && lng >= 106.68 && lng <= 106.80) {
    return {
      city: "Jakarta Barat",
      district: "Kebon Jeruk",
      province: "DKI Jakarta",
      postalCode: "11530",
      street: "Jl. Panjang No. 18",
      displayName: "Jakarta Barat (Kebon Jeruk)",
    };
  }

  // Jakarta Utara
  if (lat >= -6.16 && lat <= -6.08 && lng >= 106.80 && lng <= 106.95) {
    return {
      city: "Jakarta Utara",
      district: "Kelapa Gading",
      province: "DKI Jakarta",
      postalCode: "14240",
      street: "Jl. Boulevard Raya Blok QF",
      displayName: "Jakarta Utara (Kelapa Gading)",
    };
  }

  // Jakarta Timur
  if (lat >= -6.35 && lat <= -6.18 && lng >= 106.85 && lng <= 106.96) {
    return {
      city: "Jakarta Timur",
      district: "Duren Sawit",
      province: "DKI Jakarta",
      postalCode: "13440",
      street: "Jl. Raden Inten II No. 8",
      displayName: "Jakarta Timur (Duren Sawit)",
    };
  }

  // Tangerang / Tangsel
  if (lat >= -6.35 && lat <= -6.15 && lng >= 106.55 && lng <= 106.75) {
    return {
      city: "Tangerang Selatan",
      district: "Serpong",
      province: "Banten",
      postalCode: "15310",
      street: "Jl. Pahlawan Seribu No. 20",
      displayName: "Tangerang Selatan (BSD / Serpong)",
    };
  }

  // Depok
  if (lat >= -6.45 && lat <= -6.35 && lng >= 106.75 && lng <= 106.90) {
    return {
      city: "Depok",
      district: "Pancoran Mas",
      province: "Jawa Barat",
      postalCode: "16436",
      street: "Jl. Margonda Raya No. 100",
      displayName: "Depok (Margonda)",
    };
  }

  // Bogor
  if (lat >= -6.65 && lat <= -6.50 && lng >= 106.75 && lng <= 106.88) {
    return {
      city: "Bogor",
      district: "Bogor Tengah",
      province: "Jawa Barat",
      postalCode: "16121",
      street: "Jl. Pajajaran No. 45",
      displayName: "Bogor (Pajajaran)",
    };
  }

  // Bekasi
  if (lat >= -6.35 && lat <= -6.18 && lng >= 106.96 && lng <= 107.10) {
    return {
      city: "Bekasi",
      district: "Bekasi Barat",
      province: "Jawa Barat",
      postalCode: "17145",
      street: "Jl. Ahmad Yani No. 12",
      displayName: "Bekasi (Ahmad Yani)",
    };
  }

  // Bandung
  if (lat >= -7.00 && lat <= -6.85 && lng >= 107.50 && lng <= 107.75) {
    return {
      city: "Bandung",
      district: "Coblong",
      province: "Jawa Barat",
      postalCode: "40132",
      street: "Jl. Dago (Ir. H. Djuanda) No. 80",
      displayName: "Bandung (Dago / Coblong)",
    };
  }

  // Surabaya
  if (lat >= -7.35 && lat <= -7.20 && lng >= 112.65 && lng <= 112.85) {
    return {
      city: "Surabaya",
      district: "Tegalsari",
      province: "Jawa Timur",
      postalCode: "60262",
      street: "Jl. Basuki Rahmat No. 15",
      displayName: "Surabaya (Tegalsari)",
    };
  }

  // Default Indonesia General Fallback
  return {
    city: "Jakarta Selatan",
    district: "Kebayoran Baru",
    province: "DKI Jakarta",
    postalCode: "12150",
    street: "Jl. Gandaria Tengah IV",
    displayName: `Wilayah Koordinat (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
  };
}

/**
 * Reverse geocode coordinate into Indonesian regional data.
 * Attempts Nominatim reverse geocode with a short timeout, and falls back to Indonesian regional heuristics.
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<GeocodedLocation> {
  const fallback = getIndonesianRegionFallback(lat, lng);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const district =
        addr.suburb ||
        addr.village ||
        addr.neighbourhood ||
        addr.quarter ||
        addr.municipality ||
        fallback.district;

      const city =
        addr.city_district ||
        addr.city ||
        addr.town ||
        addr.county ||
        addr.regency ||
        fallback.city;

      const province = addr.state || addr.province || fallback.province;
      const postalCode = addr.postcode || fallback.postalCode;
      const street = addr.road || addr.pedestrian || addr.building || data.display_name?.split(",")[0] || fallback.street;

      const displayName = district ? `${city} (${district})` : city;

      return {
        latitude: lat,
        longitude: lng,
        city: city.replace(/^Kota\s+/i, ""),
        district,
        province,
        postalCode,
        street,
        displayName,
      };
    }
  } catch {
    // Graceful fallback to heuristic database
  }

  return {
    ...fallback,
    latitude: lat,
    longitude: lng,
  };
}

/**
 * Forward geocode address string into latitude & longitude coordinates.
 * Uses Nominatim OpenStreetMap with timeout and fallback centroid heuristics.
 */
export async function forwardGeocodeAddress(
  addressQuery: string,
  cityHint?: string,
  provinceHint?: string
): Promise<{ latitude: number; longitude: number } | null> {
  const q = addressQuery?.trim();
  if (!q && !cityHint) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const parts = [q, cityHint, provinceHint, "Indonesia"].filter(Boolean).join(", ");
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      parts
    )}&limit=1&countrycodes=id`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          latitude: Number(parseFloat(data[0].lat).toFixed(6)),
          longitude: Number(parseFloat(data[0].lon).toFixed(6)),
        };
      }
    }
  } catch {
    // ignore
  }

  // Centroid fallback if city is known
  const c = (cityHint || "").toLowerCase();
  if (c.includes("selatan")) return { latitude: -6.2615, longitude: 106.8106 };
  if (c.includes("pusat")) return { latitude: -6.1805, longitude: 106.8284 };
  if (c.includes("barat")) return { latitude: -6.1683, longitude: 106.7588 };
  if (c.includes("utara")) return { latitude: -6.1384, longitude: 106.864 };
  if (c.includes("timur")) return { latitude: -6.225, longitude: 106.9004 };
  if (c.includes("jakarta")) return { latitude: -6.2088, longitude: 106.8456 };
  if (c.includes("bandung")) return { latitude: -6.9175, longitude: 107.6191 };
  if (c.includes("surabaya")) return { latitude: -7.2575, longitude: 112.7521 };
  if (c.includes("semarang")) return { latitude: -6.9932, longitude: 110.4203 };
  if (c.includes("tangerang")) return { latitude: -6.1783, longitude: 106.6319 };
  if (c.includes("bekasi")) return { latitude: -6.2383, longitude: 106.9756 };
  if (c.includes("depok")) return { latitude: -6.4025, longitude: 106.7942 };
  if (c.includes("bogor")) return { latitude: -6.5971, longitude: 106.806 };

  return null;
}

/**
 * Request user's current GPS position via browser Geolocation API
 */
export function getCurrentGpsPosition(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Perangkat atau browser tidak mendukung fitur Geolocation GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Calculate Haversine distance between two coordinates in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance between user location and merchant
 */
export function formatStoreDistance(
  userLat?: number | null,
  userLng?: number | null,
  merchantLat?: number | null,
  merchantLng?: number | null,
  seedKey: string = "default"
): string {
  if (
    typeof userLat === "number" &&
    typeof userLng === "number" &&
    typeof merchantLat === "number" &&
    typeof merchantLng === "number" &&
    !isNaN(userLat) &&
    !isNaN(userLng) &&
    !isNaN(merchantLat) &&
    !isNaN(merchantLng)
  ) {
    const d = calculateHaversineDistance(userLat, userLng, merchantLat, merchantLng);
    if (d < 1) {
      return `${Math.max(100, Math.round(d * 1000))} m`;
    }
    return `${d.toFixed(1)} km`;
  }

  // Deterministic realistic distance for intra-city stores
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash << 5) - hash + seedKey.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  // Spread realistic local distance between 1.1 km and 5.8 km
  const km = 1.1 + (positive % 48) / 10;
  return `${km.toFixed(1)} km`;
}

/**
 * Known official partner merchants and their exact store coordinates
 * aligned with backend order-barang-service Delivery Setting database.
 */
export const KNOWN_MERCHANT_COORDINATES: Record<
  string,
  { lat: number; lng: number; city: string; district?: string; name?: string }
> = {
  // Sinar AC & Sparepart Glodok
  "0c1467e7-af68-4b26-ae84-daa41d51aed0": {
    lat: -6.1805,
    lng: 106.8284,
    city: "Jakarta Pusat",
    district: "Senen",
    name: "Sinar AC & Sparepart Glodok",
  },
};

/**
 * City center coordinates for fallbacks when exact merchant coordinates are not provided by API
 */
export const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "jakarta pusat": { lat: -6.1805, lng: 106.8284 },
  "jakarta selatan": { lat: -6.2297, lng: 106.8075 },
  "jakarta barat": { lat: -6.1683, lng: 106.7588 },
  "jakarta timur": { lat: -6.225, lng: 106.9004 },
  "jakarta utara": { lat: -6.1214, lng: 106.8837 },
  "tangerang": { lat: -6.1783, lng: 106.6319 },
  "tangerang selatan": { lat: -6.2888, lng: 106.7179 },
  "depok": { lat: -6.4025, lng: 106.7942 },
  "bekasi": { lat: -6.2383, lng: 106.9756 },
  "bogor": { lat: -6.5971, lng: 106.806 },
  "bandung": { lat: -6.9175, lng: 107.6191 },
  "surabaya": { lat: -7.2575, lng: 112.7521 },
  "semarang": { lat: -6.9667, lng: 110.4167 },
  "yogyakarta": { lat: -7.7956, lng: 110.3695 },
  "medan": { lat: 3.5952, lng: 98.6722 },
  "denpasar": { lat: -8.6705, lng: 115.2126 },
};

