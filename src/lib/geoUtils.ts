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
