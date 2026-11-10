import mysql from "mysql2/promise";
import { getDbPool } from "@/lib/devMonitor/db";
import type {
  RecommendedProductCard,
  RecommendedServiceCard,
} from "./types";

const SERVICE_API_BASE = "http://127.0.0.1:8004/api/v1";
const PRODUCT_API_BASE = "http://127.0.0.1:8003/api/v1";

function formatIdr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function tokenizeQuery(query: string): string[] {
  const stopWords = new Set([
    "dan",
    "atau",
    "yang",
    "untuk",
    "pada",
    "dari",
    "dengan",
    "kira",
    "berapa",
    "bagus",
    "cocok",
    "apa",
    "saya",
    "aku",
    "tolong",
    "butuh",
    "beli",
    "cari",
    "jasa",
    "layanan",
    "barang",
    "sparepart",
    "sperpat",
    "rumah",
    "saja",
    "ada",
  ]);
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

function scoreMatch(haystack: string, tokens: string[], rawQuery: string): number {
  const h = haystack.toLowerCase();
  const q = rawQuery.toLowerCase().trim();
  let score = 0;
  if (q && h.includes(q)) score += 12;
  for (const tok of tokens) {
    if (h.includes(tok)) {
      score += tok.length >= 4 ? 5 : 3;
    }
  }
  return score;
}

function parseWarrantyLabel(warrantyConfig: unknown): string {
  try {
    const cfg =
      typeof warrantyConfig === "string"
        ? JSON.parse(warrantyConfig)
        : (warrantyConfig as Record<string, unknown> | null);
    if (!cfg) return "Proteksi Standar Servio";
    const days = Number(cfg.duration_days ?? cfg.durationDays ?? 0);
    const enabled = Boolean(cfg.warranty_enabled ?? cfg.warrantyEnabled ?? days > 0);
    if (enabled && days > 0) {
      return `Garansi ${days} Hari`;
    }
  } catch {
    // ignore parse failure
  }
  return "Proteksi Standar Servio";
}

function formatDurationLabel(minVal: unknown, maxVal: unknown, unit: unknown): string {
  const minN = Number(minVal || 1);
  const maxN = Number(maxVal || minN);
  const unitMap: Record<string, string> = {
    MINUTE: "Menit",
    MINUTES: "Menit",
    HOUR: "Jam",
    HOURS: "Jam",
    DAY: "Hari",
    DAYS: "Hari",
  };
  const unitLabel = unitMap[String(unit || "HOUR").toUpperCase()] || "Jam";
  return minN === maxN ? `${minN} ${unitLabel}` : `${minN}–${maxN} ${unitLabel}`;
}

function mapHttpServiceItem(raw: Record<string, unknown>): RecommendedServiceCard {
  const id = String(raw.id || "");
  const pricing = (raw.pricing || {}) as Record<string, unknown>;
  const provider = (raw.provider || {}) as Record<string, unknown>;
  const cat = (raw.category || {}) as Record<string, unknown>;
  const subcat = (raw.subcategory || {}) as Record<string, unknown>;
  const dur = (raw.duration || {}) as Record<string, unknown>;
  const primaryMedia = (raw.primary_media || null) as Record<string, unknown> | null;

  const model = String(pricing.model || "RANGE");
  const minPrice = pricing.min_price_idr != null ? Number(pricing.min_price_idr) : null;
  const maxPrice = pricing.max_price_idr != null ? Number(pricing.max_price_idr) : null;

  let estimatedCostLabel = "Setelah Survei";
  if (model === "FREE") {
    estimatedCostLabel = "Gratis Survei / Konsultasi";
  } else if (minPrice != null && maxPrice != null && maxPrice > minPrice) {
    estimatedCostLabel = `${formatIdr(minPrice)} – ${formatIdr(maxPrice)}`;
  } else if (minPrice != null && minPrice > 0) {
    estimatedCostLabel = `Mulai ${formatIdr(minPrice)}`;
  }

  return {
    id,
    title: String(raw.display_name || "Layanan Servio"),
    description: raw.description ? String(raw.description) : null,
    providerName: String(provider.store_name || provider.display_name || "Mitra Resmi SERVIO"),
    providerOrgId: String(provider.organization_id || ""),
    categoryName: String(cat.name || "Layanan Jasa"),
    subcategoryName: String(subcat.name || "Teknisi Profesional"),
    priceModel: model,
    minPriceIdr: minPrice,
    maxPriceIdr: maxPrice,
    estimatedCostLabel,
    durationLabel: formatDurationLabel(dur.min, dur.max, dur.unit),
    warrantyLabel: parseWarrantyLabel(raw.warranty_config),
    primaryMediaUrl: primaryMedia?.url ? String(primaryMedia.url) : null,
    bookingUrl: `/bookings/new?serviceId=${encodeURIComponent(id)}&source=ai-diagnosa`,
    sourceMethod: "HTTP_API",
  };
}

function mapHttpProductItem(raw: Record<string, unknown>): RecommendedProductCard {
  const id = String(raw.id || "");
  const dp = (raw.display_price || {}) as Record<string, unknown>;
  const merchant = (raw.merchant || {}) as Record<string, unknown>;
  const primaryImg = (raw.primary_image || null) as Record<string, unknown> | null;

  const minP = Number(dp.min || 0);
  const maxP = Number(dp.max || minP);
  const priceLabel =
    maxP > minP ? `${formatIdr(minP)} – ${formatIdr(maxP)}` : formatIdr(minP);
  const totalStock = Number(raw.total_stock || 0);

  return {
    id,
    name: String(raw.name || "Produk Servio"),
    brandName: String(raw.brand_name || raw.brand || "OEM / Universal"),
    description: raw.description ? String(raw.description) : null,
    categoryName: String(raw.category_name || "Suku Cadang & Produk"),
    subcategoryName: String(raw.subcategory_name || "Sparepart"),
    merchantName: String(merchant.store_name || "Toko Mitra SERVIO"),
    priceMinIdr: minP,
    priceMaxIdr: maxP,
    priceLabel,
    totalStock,
    availability: totalStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    variantSummary: "",
    primaryMediaUrl: primaryImg?.url ? String(primaryImg.url) : null,
    productUrl: `/products/${encodeURIComponent(id)}?source=ai-diagnosa`,
    sourceMethod: "HTTP_API",
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 1800): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function queryServicesSqlFallback(): Promise<RecommendedServiceCard[]> {
  try {
    const pool = getDbPool("servio_service_db");
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT
        o.id,
        o.provider_organization_id,
        o.display_name,
        o.description,
        o.price_model,
        o.min_price_idr,
        o.max_price_idr,
        o.duration_min,
        o.duration_max,
        o.duration_unit,
        o.warranty_config,
        d.name AS definition_name,
        c.name AS category_name,
        sc.name AS subcategory_name,
        op.display_name AS org_display_name,
        op.legal_name AS org_legal_name,
        (
          SELECT m.id FROM servio_service_db.service_offering_media m
          WHERE m.offering_id = o.id AND m.deleted_at IS NULL
          ORDER BY m.is_primary DESC, m.sort_order ASC
          LIMIT 1
        ) AS primary_media_id
      FROM servio_service_db.service_offerings o
      LEFT JOIN servio_service_db.service_definitions d ON d.id = o.service_definition_id
      LEFT JOIN servio_category_db.categories c ON c.id = d.category_id
      LEFT JOIN servio_category_db.subcategories sc ON sc.id = d.subcategory_id
      LEFT JOIN servio_identity_db.organization_profiles op ON op.organization_id = o.provider_organization_id
      WHERE o.status = 'ACTIVE' AND o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 60
      `
    );

    return rows.map((r) => {
      const minPrice = r.min_price_idr != null ? Number(r.min_price_idr) : null;
      const maxPrice = r.max_price_idr != null ? Number(r.max_price_idr) : null;
      const model = String(r.price_model || "RANGE");
      let estimatedCostLabel = "Setelah Survei";
      if (model === "FREE") {
        estimatedCostLabel = "Gratis Survei";
      } else if (minPrice != null && maxPrice != null && maxPrice > minPrice) {
        estimatedCostLabel = `${formatIdr(minPrice)} – ${formatIdr(maxPrice)}`;
      } else if (minPrice != null && minPrice > 0) {
        estimatedCostLabel = `Mulai ${formatIdr(minPrice)}`;
      }

      const id = String(r.id);
      return {
        id,
        title: String(r.display_name || "Layanan Servio"),
        description: r.description ? String(r.description) : null,
        providerName: String(r.org_display_name || r.org_legal_name || "Mitra Resmi SERVIO"),
        providerOrgId: String(r.provider_organization_id || ""),
        categoryName: String(r.category_name || "Layanan Jasa"),
        subcategoryName: String(r.subcategory_name || r.definition_name || "Teknisi"),
        priceModel: model,
        minPriceIdr: minPrice,
        maxPriceIdr: maxPrice,
        estimatedCostLabel,
        durationLabel: formatDurationLabel(r.duration_min, r.duration_max, r.duration_unit),
        warrantyLabel: parseWarrantyLabel(r.warranty_config),
        primaryMediaUrl: r.primary_media_id
          ? `/api/v1/service-media/${String(r.primary_media_id)}`
          : null,
        bookingUrl: `/bookings/new?serviceId=${encodeURIComponent(id)}&source=ai-diagnosa`,
        sourceMethod: "MYSQL_FALLBACK" as const,
      };
    });
  } catch {
    return [];
  }
}

async function queryProductsSqlFallback(): Promise<
  Array<RecommendedProductCard & { searchExtra: string }>
> {
  try {
    const pool = getDbPool("servio_product_db");
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.brand_name,
        p.merchant_organization_id,
        c.name AS category_name,
        sc.name AS subcategory_name,
        op.display_name AS merchant_display_name,
        op.legal_name AS merchant_legal_name,
        MIN(v.price_idr) AS min_price,
        MAX(v.price_idr) AS max_price,
        COALESCE(SUM(v.stock_qty), 0) AS total_stock,
        GROUP_CONCAT(DISTINCT COALESCE(v.display_name, '') SEPARATOR ' | ') AS variant_names,
        (
          SELECT pm.id FROM servio_product_db.product_media pm
          WHERE pm.product_id = p.id AND pm.scope = 'GENERAL' AND pm.deleted_at IS NULL
          ORDER BY pm.is_primary DESC, pm.sort_order ASC
          LIMIT 1
        ) AS primary_media_id
      FROM servio_product_db.products p
      INNER JOIN servio_product_db.product_variants v
        ON v.product_id = p.id AND v.status = 'ACTIVE' AND v.deleted_at IS NULL
      LEFT JOIN servio_category_db.categories c ON c.id = p.category_id
      LEFT JOIN servio_category_db.subcategories sc ON sc.id = p.subcategory_id
      LEFT JOIN servio_identity_db.organization_profiles op ON op.organization_id = p.merchant_organization_id
      WHERE p.status = 'ACTIVE' AND p.deleted_at IS NULL
      GROUP BY
        p.id, p.name, p.description, p.brand_name, p.merchant_organization_id,
        c.name, sc.name, op.display_name, op.legal_name
      ORDER BY p.created_at DESC
      LIMIT 80
      `
    );

    return rows.map((r) => {
      const id = String(r.id);
      const minP = Number(r.min_price || 0);
      const maxP = Number(r.max_price || minP);
      const totalStock = Number(r.total_stock || 0);
      const variantSummary = String(r.variant_names || "")
        .split(" | ")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ");

      return {
        id,
        name: String(r.name || "Produk Servio"),
        brandName: String(r.brand_name || "OEM / Universal"),
        description: r.description ? String(r.description) : null,
        categoryName: String(r.category_name || "Suku Cadang"),
        subcategoryName: String(r.subcategory_name || "Sparepart"),
        merchantName: String(
          r.merchant_display_name || r.merchant_legal_name || "Toko Mitra SERVIO"
        ),
        priceMinIdr: minP,
        priceMaxIdr: maxP,
        priceLabel: maxP > minP ? `${formatIdr(minP)} – ${formatIdr(maxP)}` : formatIdr(minP),
        totalStock,
        availability: totalStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        variantSummary,
        primaryMediaUrl: r.primary_media_id
          ? `/api/v1/product-media/${String(r.primary_media_id)}`
          : null,
        productUrl: `/products/${encodeURIComponent(id)}?source=ai-diagnosa`,
        sourceMethod: "MYSQL_FALLBACK" as const,
        searchExtra: `${r.description || ""} ${variantSummary}`,
      };
    });
  } catch {
    return [];
  }
}

export async function searchServicesFromDb(params: {
  query: string;
  limit?: number;
}): Promise<{
  items: RecommendedServiceCard[];
  source: "HTTP_API" | "MYSQL_FALLBACK";
  durationMs: number;
}> {
  const startedAt = Date.now();
  const limit = Math.min(Math.max(Number(params.limit || 5), 1), 15);
  const rawQuery = String(params.query || "").trim();
  const tokens = tokenizeQuery(rawQuery);

  let poolItems: RecommendedServiceCard[] = [];
  let source: "HTTP_API" | "MYSQL_FALLBACK" = "HTTP_API";

  const httpPayload = (await fetchJsonWithTimeout(
    `${SERVICE_API_BASE}/services?limit=50`,
    1800
  )) as { data?: { items?: Record<string, unknown>[] } } | null;

  if (httpPayload?.data?.items && Array.isArray(httpPayload.data.items)) {
    poolItems = httpPayload.data.items.map(mapHttpServiceItem);
    source = "HTTP_API";
  } else {
    poolItems = await queryServicesSqlFallback();
    source = "MYSQL_FALLBACK";
  }

  if (!rawQuery || tokens.length === 0) {
    return { items: poolItems.slice(0, limit), source, durationMs: Date.now() - startedAt };
  }

  const scored = poolItems
    .map((item) => {
      const hay = `${item.title} ${item.description || ""} ${item.categoryName} ${item.subcategoryName} ${item.providerName}`;
      return { item, score: scoreMatch(hay, tokens, rawQuery) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const matched = scored.map((s) => s.item).slice(0, limit);
  return {
    items: matched,
    source,
    durationMs: Date.now() - startedAt,
  };
}

export async function searchProductsFromDb(params: {
  query: string;
  limit?: number;
}): Promise<{
  items: RecommendedProductCard[];
  source: "HTTP_API" | "MYSQL_FALLBACK";
  durationMs: number;
}> {
  const startedAt = Date.now();
  const limit = Math.min(Math.max(Number(params.limit || 5), 1), 15);
  const rawQuery = String(params.query || "").trim();
  const tokens = tokenizeQuery(rawQuery);

  let source: "HTTP_API" | "MYSQL_FALLBACK" = "HTTP_API";
  let poolItems: Array<RecommendedProductCard & { searchExtra?: string }> = [];

  const [httpPayload, sqlExtraRows] = await Promise.all([
    fetchJsonWithTimeout(`${PRODUCT_API_BASE}/products?limit=60`, 1800) as Promise<{
      data?: Record<string, unknown>[];
    } | null>,
    queryProductsSqlFallback(),
  ]);

  const sqlById = new Map(sqlExtraRows.map((r) => [r.id, r]));

  if (httpPayload?.data && Array.isArray(httpPayload.data)) {
    source = "HTTP_API";
    poolItems = httpPayload.data.map((raw) => {
      const card = mapHttpProductItem(raw);
      const extra = sqlById.get(card.id);
      return {
        ...card,
        description: extra?.description || card.description,
        variantSummary: extra?.variantSummary || card.variantSummary,
        searchExtra: extra?.searchExtra || "",
      };
    });
  } else {
    source = "MYSQL_FALLBACK";
    poolItems = sqlExtraRows;
  }

  if (!rawQuery || tokens.length === 0) {
    return {
      items: poolItems.slice(0, limit).map(({ searchExtra: _ignored, ...rest }) => rest),
      source,
      durationMs: Date.now() - startedAt,
    };
  }

  const scored = poolItems
    .map((item) => {
      const hay = `${item.name} ${item.brandName} ${item.description || ""} ${item.categoryName} ${item.subcategoryName} ${item.variantSummary} ${item.searchExtra || ""}`;
      return { item, score: scoreMatch(hay, tokens, rawQuery) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const matched = scored
    .map(({ item }) => {
      const { searchExtra: _ignored, ...rest } = item;
      return rest;
    })
    .slice(0, limit);

  return {
    items: matched,
    source,
    durationMs: Date.now() - startedAt,
  };
}

export async function getAllActiveCatalogMap(): Promise<{
  servicesMap: Map<string, RecommendedServiceCard>;
  productsMap: Map<string, RecommendedProductCard>;
}> {
  const [svcRes, prodRes] = await Promise.all([
    searchServicesFromDb({ query: "", limit: 50 }),
    searchProductsFromDb({ query: "", limit: 60 }),
  ]);

  return {
    servicesMap: new Map(svcRes.items.map((s) => [s.id, s])),
    productsMap: new Map(prodRes.items.map((p) => [p.id, p])),
  };
}

