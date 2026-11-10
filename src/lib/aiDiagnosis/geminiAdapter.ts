import { appendClientError } from "@/lib/devMonitor/clientTelemetryStore";
import {
  getAllActiveCatalogMap,
  searchProductsFromDb,
  searchServicesFromDb,
} from "./catalogTools";
import {
  getRuntimeConfigStateSnapshot,
  resolveActiveGeminiKey,
} from "./runtimeConfig";
import type {
  AiEffectiveProvider,
  AiMessageView,
  AiStructuredResponse,
  AiToolCallRecord,
  RecommendedProductCard,
  RecommendedServiceCard,
} from "./types";

export interface InlineMediaInput {
  mimeType: string;
  base64Data: string;
  mediaType: "IMAGE" | "VIDEO_KEYFRAME";
  frameTimestampSec: number | null;
}

export interface DiagnosisEngineInput {
  sessionId: string;
  requestId: string;
  userMessage: string;
  history: AiMessageView[];
  mediaInputs: InlineMediaInput[];
}

export interface DiagnosisEngineResult {
  structured: AiStructuredResponse;
  toolCalls: AiToolCallRecord[];
  effectiveProvider: AiEffectiveProvider;
  modelName: string;
  latencyMs: number;
  fallbackNotice?: string | null;
}

const SYSTEM_INSTRUCTION = `
Kamu adalah "Asisten Diagnosa AI SERVIO", teknisi konsultan ahli untuk perbaikan rumah/elektronik, konsultasi interaktif dua arah, dan rekomendasi suku cadang resmi SERVIO.

PANDUAN ALUR PERCAKAPAN (WAJIB DIPATUHI):

1. PERCAKAPAN UMUM, SAPAAN, ATAU DISKUSI AWAL (PENTING):
   - Jika pelanggan hanya menyapa (contoh: "halo", "hai", "selamat pagi/siang/malam", "assalamualaikum", "test"), bertanya siapa kamu, atau bertanya santai TANPA keluhan kerusakan spesifik dan TANPA lampiran foto/video:
     - JANGAN langsung menganalisis atau mengarang kerusakan/penyebab/solusi!
     - JANGAN memanggil tool pencarian layanan ataupun produk.
     - Balas dengan ramah, komunikatif, dan santai layaknya konsultan teknisi yang siap berdiskusi dan mendengarkan keluhan pelanggan.
     - Tanyakan apa yang bisa dibantu, apakah ada unit (AC, kelistrikan, kulkas, mesin cuci, plumbing, otomotif) yang sedang bermasalah, atau sedang mencari suku cadang tertentu.
     - KELUARKAN JSON DENGAN:
       "isGeneralChat": true,
       "summary": "Halo! Saya Asisten AI SERVIO, siap berdiskusi dan membantu konsultasi kendala unit Anda. Ada yang bisa saya bantu hari ini? Anda bisa menceritakan keluhan, mengunggah foto/video unit yang rusak, atau menanyakan suku cadang yang tepat.",
       "deviceCategory": "Percakapan",
       "urgency": "ROUTINE",
       "causes": [],
       "solutions": [],
       "safetyWarning": null,
       "needsClarification": false,
       "clarifyingQuestion": null,
       "quickReplies": ["AC tidak dingin / menetes", "MCB listrik sering anjlok", "Tanya sparepart AC", "Pipa air wastafel bocor"],
       "recommendedServiceIds": [],
       "recommendedProductIds": []

2. KELUHAN GEJALA KERUSAKAN NYATA / FOTO / VIDEO:
   - Jika pelanggan menceritakan keluhan atau mengunggah foto/video kerusakan:
     - Jelaskan kemungkinan penyebab kerusakan (causes).
     - Berikan solusi awal yang aman dilakukan sendiri oleh pelanggan atau kapan harus ditangani teknisi (solutions), serta isi safetyWarning jika melibatkan listrik tegangan tinggi, gas freon bertekanan, atau risiko kebakaran.
     - Panggil tool "search_services" untuk mencari layanan teknisi SERVIO yang relevan dari database. Hanya gunakan ID dari tool!

3. ATURAN WAJIB TANYA BALIK UNTUK SPAREPART / BARANG (CRITICAL):
   - Jika pelanggan menanyakan sparepart / barang pengganti ("sparepart apa yang cocok", "beli kompresor/freon/kabel apa", "part yang perlu diganti apa") NAMUN pelanggan belum memberikan spesifikasi lengkap (seperti: komponen spesifik apa yang bermasalah, kapasitas PK/watt/ukuran, tipe Inverter vs Standard/Non-Inverter, jenis freon R32/R410A, merek unit, atau hasil pemeriksaan teknisi):
     - SET "needsClarification": true
     - Tulis pertanyaan balik spesifik di "clarifyingQuestion" dan sediakan 3-4 opsi singkat di "quickReplies" agar pelanggan mudah menjawab.
     - BIARKAN "recommendedProductIds": [] (KOSONG terlebih dahulu — JANGAN menebak produk sebelum pelanggan menjawab spesifikasi!).
   - Jika pelanggan SUDAH menyebutkan spesifikasi jelas ATAU sedang menjawab pertanyaan balik kamu di percakapan sebelumnya:
     - Panggil tool "search_products" dengan kata kunci spesifik dari spesifikasi pelanggan.
     - SET "needsClarification": false (kecuali masih sangat ambigu).
     - Isi "recommendedProductIds" HANYA dengan ID produk asli yang dikembalikan tool "search_products".

4. FORMAT OUTPUT AKHIR (JSON STRICT):
Saat siap memberi jawaban akhir ke pelanggan (tanpa tool call lagi), keluarkan HANYA JSON valid dengan struktur persis berikut tanpa markdown fence:
{
  "isGeneralChat": false,
  "summary": "Ringkasan pembuka 2-3 kalimat yang menjawab langsung keluhan/pertanyaan pelanggan.",
  "deviceCategory": "Kategori singkat misal AC & Pendingin / Kelistrikan / Elektronik / Plumbing / Otomotif / Percakapan",
  "urgency": "HIGH | MEDIUM | ROUTINE",
  "causes": ["Kemungkinan penyebab 1", "Kemungkinan penyebab 2"],
  "solutions": ["Langkah aman awal 1", "Langkah 2"],
  "safetyWarning": "Peringatan keselamatan K3 jika perlu, atau null",
  "needsClarification": true/false,
  "clarifyingQuestion": "Pertanyaan balik ke pelanggan jika needsClarification=true, atau null",
  "quickReplies": ["Opsi jawaban cepat 1", "Opsi 2", "Opsi 3"],
  "recommendedServiceIds": ["uuid-service-dari-tool"],
  "recommendedProductIds": ["uuid-product-dari-tool"]
}
`.trim();

const GEMINI_TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      {
        name: "search_services",
        description:
          "Cari daftar layanan jasa teknisi nyata yang tersedia di database SERVIO berdasarkan kata kunci masalah atau jenis perangkat (contoh: 'ac', 'cuci ac', 'ban', 'listrik').",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Kata kunci singkat untuk mencari layanan di katalog SERVIO",
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah maksimal hasil (default 5)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "search_products",
        description:
          "Cari daftar produk / sparepart resmi di database SERVIO berdasarkan spesifikasi atau nama part (contoh: 'kompresor ac inverter 1 pk', 'freon r32', 'kabel nym', 'kipas exhaust').",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Kata kunci spesifik sparepart atau merek/kapasitas",
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah maksimal hasil (default 5)",
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];

interface RawAiJsonOutput {
  isGeneralChat?: boolean;
  summary?: string;
  deviceCategory?: string;
  urgency?: string;
  causes?: string[];
  solutions?: string[];
  safetyWarning?: string | null;
  needsClarification?: boolean;
  clarifyingQuestion?: string | null;
  quickReplies?: string[];
  recommendedServiceIds?: string[];
  recommendedProductIds?: string[];
}

function tryExtractJson(rawText: string): RawAiJsonOutput | null {
  const cleaned = String(rawText || "").trim();
  if (!cleaned) return null;

  const withoutFences = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFences) as RawAiJsonOutput;
  } catch {
    const startIdx = withoutFences.indexOf("{");
    const endIdx = withoutFences.lastIndexOf("}");
    if (startIdx >= 0 && endIdx > startIdx) {
      try {
        return JSON.parse(withoutFences.slice(startIdx, endIdx + 1)) as RawAiJsonOutput;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeUrgency(val: unknown): "HIGH" | "MEDIUM" | "ROUTINE" {
  const up = String(val || "").toUpperCase();
  if (up === "HIGH" || up === "MEDIUM" || up === "ROUTINE") return up;
  return "MEDIUM";
}

function sanitizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

async function hydrateStructuredResponse(
  raw: RawAiJsonOutput,
  observedServices: Map<string, RecommendedServiceCard>,
  observedProducts: Map<string, RecommendedProductCard>
): Promise<AiStructuredResponse> {
  const { servicesMap, productsMap } = await getAllActiveCatalogMap();

  const servicePool = new Map<string, RecommendedServiceCard>([
    ...servicesMap.entries(),
    ...observedServices.entries(),
  ]);
  const productPool = new Map<string, RecommendedProductCard>([
    ...productsMap.entries(),
    ...observedProducts.entries(),
  ]);

  const recServices: RecommendedServiceCard[] = [];
  const seenSvc = new Set<string>();
  for (const id of raw.recommendedServiceIds || []) {
    const sid = String(id || "").trim();
    if (!sid || seenSvc.has(sid)) continue;
    const match = servicePool.get(sid);
    if (match) {
      seenSvc.add(sid);
      recServices.push(match);
    }
  }

  const needsClarification = Boolean(raw.needsClarification);
  const recProducts: RecommendedProductCard[] = [];
  if (!needsClarification) {
    const seenProd = new Set<string>();
    for (const id of raw.recommendedProductIds || []) {
      const pid = String(id || "").trim();
      if (!pid || seenProd.has(pid)) continue;
      const match = productPool.get(pid);
      if (match) {
        seenProd.add(pid);
        recProducts.push(match);
      }
    }
  }

  const causes = sanitizeStringArray(raw.causes);
  const solutions = sanitizeStringArray(raw.solutions);
  const isGeneralChat =
    Boolean(raw.isGeneralChat) ||
    (causes.length === 0 && solutions.length === 0 && recServices.length === 0 && recProducts.length === 0);

  return {
    isGeneralChat,
    summary:
      String(raw.summary || "").trim() ||
      (isGeneralChat
        ? "Halo! Saya Asisten AI SERVIO, siap berdiskusi dan membantu konsultasi kendala unit Anda. Ada yang bisa saya bantu hari ini?"
        : "Berikut hasil analisis awal dari keluhan Anda beserta rekomendasi layanan SERVIO."),
    deviceCategory: String(raw.deviceCategory || (isGeneralChat ? "Percakapan" : "Umum")).trim(),
    urgency: normalizeUrgency(raw.urgency),
    causes: isGeneralChat ? [] : causes,
    solutions: isGeneralChat ? [] : solutions,
    safetyWarning:
      !isGeneralChat && raw.safetyWarning && String(raw.safetyWarning).trim()
        ? String(raw.safetyWarning).trim()
        : null,
    needsClarification,
    clarifyingQuestion:
      raw.clarifyingQuestion && String(raw.clarifyingQuestion).trim()
        ? String(raw.clarifyingQuestion).trim()
        : null,
    quickReplies: sanitizeStringArray(raw.quickReplies),
    recommendedServices: recServices.slice(0, 4),
    recommendedProducts: recProducts.slice(0, 4),
  };
}

function isGreetingOrGeneralChat(text: string, mediaCount: number): boolean {
  if (mediaCount > 0) return false;
  const t = text.trim().toLowerCase();

  const greetingPatterns = [
    /^(halo|hallo|hai|hi|hey|hei|pagi|siang|sore|malam|selamat\s+(pagi|siang|sore|malam|datang)|assalamu\s*['’]?alaikum|ping|tes|test|p)(\s+(mas|mbak|min|admin|bang|kak|ai|servio|gan|bro))?[\s.!?,]*$/i,
    /^(halo|hai|pagi|siang|sore|malam)[\s.!?,]+(apa kabar|ada siapa|bisa bantu apa|mau nanya|mau tanya|tolong bantu)[\s.!?,]*$/i,
    /^(kamu siapa|siapa kamu|bisa bantu apa|kamu bisa apa|apa saja yang bisa dibantu|mau nanya dong|mau tanya dong|saya mau tanya|mau konsultasi|bisa bantu saya|tolong dong)[\s.!?,]*$/i,
  ];

  return greetingPatterns.some((pattern) => pattern.test(t));
}

function isAskingAboutSparepart(text: string): boolean {
  return /(sparepart|sperpat|part|komponen|freon|kompresor|kapasitor|kabel|kipas|exhaust|beli\s+apa|ganti\s+apa|cocok\s+apa|onderdil)/i.test(
    text
  );
}

function hasDetailedSpecs(text: string): boolean {
  const hasCapacityOrType =
    /(\d([.,]\d)?\s*pk|inverter|r32|r410|r22|tabung|watt|ampere|mm|3x2\.5|50\s*m|100\s*m|inch|kompresor|freon|kabel|exhaust)/i.test(
      text
    );
  const hasSpecificSymptomOrPart =
    /(panasonic|daikin|supreme|glodok|inverter\s*1\s*pk|isi\s*freon|ganti\s*kompresor|ganti\s*kabel|kabel\s*nym|kipas\s*exhaust)/i.test(
      text
    );
  return hasCapacityOrType && hasSpecificSymptomOrPart;
}

async function runDeterministicRuleFallback(
  input: DiagnosisEngineInput,
  fallbackReason?: string | null
): Promise<{
  structured: AiStructuredResponse;
  toolCalls: AiToolCallRecord[];
}> {
  // 0. Interaksi Sapaan / Percakapan Awal / Belum Ada Gejala
  if (isGreetingOrGeneralChat(input.userMessage, input.mediaInputs.length)) {
    return {
      structured: {
        isGeneralChat: true,
        summary:
          "Halo! Saya Asisten AI SERVIO, siap berdiskusi dan membantu konsultasi kendala unit Anda. Ada yang bisa saya bantu hari ini? Anda bisa menceritakan keluhan peralatan (seperti AC, kulkas, kelistrikan, pompa air, atau otomotif), mengunggah foto/video kerusakan, atau menanyakan suku cadang yang tepat.",
        deviceCategory: "Percakapan",
        urgency: "ROUTINE",
        causes: [],
        solutions: [],
        safetyWarning: null,
        needsClarification: false,
        clarifyingQuestion: null,
        quickReplies: [
          "AC rumah tidak dingin & meneteskan air",
          "Kira-kira untuk AC ini sparepart yang cocok apa ya?",
          "MCB listrik sering anjlok saat pakai alat berat",
          "Mesin cuci bergetar keras dan air tidak terbuang",
        ],
        recommendedServices: [],
        recommendedProducts: [],
      },
      toolCalls: [],
    };
  }

  const combinedHistoryText = [
    ...input.history.filter((h) => h.sender === "USER").map((h) => h.contentText),
    input.userMessage,
  ].join(" ");
  const latestLower = input.userMessage.toLowerCase();
  const fullLower = combinedHistoryText.toLowerCase();

  const toolCalls: AiToolCallRecord[] = [];
  const askingPart = isAskingAboutSparepart(latestLower);
  const lastAssistantMsg = [...input.history].reverse().find((h) => h.sender === "ASSISTANT");
  const previousTurnAskedClarification = Boolean(
    lastAssistantMsg?.structuredResponse?.needsClarification
  );

  // Detect domain hints
  const isAc = /(ac\b|dingin|freon|kompresor|evaporator|indoor|outdoor|netes|bocor\s*air)/i.test(
    fullLower
  );
  const isTire = /(ban|tambal|bocor\s*ban|kempes|velg|motor|mobil)/i.test(fullLower);
  const isElec = /(listrik|mcb|korslet|kabel|stop\s*kontak|anjlok|exhaust|kipas)/i.test(
    fullLower
  );

  const svcQuery = isAc ? "ac" : isTire ? "ban" : isElec ? "listrik" : input.userMessage;
  const svcRes = await searchServicesFromDb({ query: svcQuery, limit: 3 });
  toolCalls.push({
    toolName: "search_services",
    args: { query: svcQuery, limit: 3 },
    source: svcRes.source,
    matchedIds: svcRes.items.map((s) => s.id),
    resultCount: svcRes.items.length,
    durationMs: svcRes.durationMs,
  });

  // Fallback service list if specific query had 0 matches
  let finalServices = svcRes.items;
  if (finalServices.length === 0) {
    const broadSvc = await searchServicesFromDb({ query: "", limit: 2 });
    finalServices = broadSvc.items;
  }

  let finalProducts: RecommendedProductCard[] = [];
  let needsClarification = false;
  let clarifyingQuestion: string | null = null;
  let quickReplies: string[] = [];

  if (askingPart || previousTurnAskedClarification) {
    const specComplete = hasDetailedSpecs(latestLower) || (previousTurnAskedClarification && input.userMessage.trim().length >= 4);
    if (!specComplete) {
      needsClarification = true;
      if (isAc) {
        clarifyingQuestion =
          "Agar saya bisa mencocokkan sparepart yang tepat dari katalog SERVIO tanpa salah beli, boleh konfirmasi dulu: (1) komponen atau gejala spesifik apa yang bermasalah? (2) berapa kapasitas PK unit AC-nya (0.5 / 1 / 1.5 PK), serta apakah tipe Inverter atau Standard, dan tipe freon (misal R32)?";
        quickReplies = [
          "AC 1 PK Inverter, masalah di kompresor",
          "AC split kurang dingin, butuh Freon R32",
          "Butuh teknisi cek langsung dulu",
        ];
      } else {
        clarifyingQuestion =
          "Agar rekomendasinya akurat sesuai unit Anda, mohon info spesifikasinya terlebih dahulu: jenis komponen yang dicari, merek/kapasitas (PK, watt, atau ukuran), serta gejala kerusakannya?";
        quickReplies = [
          "Kabel power listrik 3x2.5mm",
          "Kipas exhaust ruangan 12 inch",
          "Panggil teknisi untuk inspeksi",
        ];
      }
    } else {
      const prodQuery = fullLower.includes("freon") || fullLower.includes("r32")
        ? "freon r32"
        : fullLower.includes("kompresor") || fullLower.includes("inverter")
          ? "kompresor ac inverter"
          : fullLower.includes("kabel")
            ? "kabel"
            : fullLower.includes("kipas") || fullLower.includes("exhaust")
              ? "kipas exhaust"
              : input.userMessage;

      const prodRes = await searchProductsFromDb({ query: prodQuery, limit: 3 });
      toolCalls.push({
        toolName: "search_products",
        args: { query: prodQuery, limit: 3 },
        source: prodRes.source,
        matchedIds: prodRes.items.map((p) => p.id),
        resultCount: prodRes.items.length,
        durationMs: prodRes.durationMs,
      });
      finalProducts = prodRes.items;
    }
  }

  const hasVisual = input.mediaInputs.length > 0;
  const mediaPrefix = hasVisual
    ? `Saya sudah menerima ${input.mediaInputs.length} lampiran visual (${
        input.mediaInputs.some((m) => m.mediaType === "VIDEO_KEYFRAME")
          ? "termasuk keyframe video otomatis"
          : "foto kerusakan"
      }). `
    : "";

  let summary = `${mediaPrefix}Berdasarkan keterangan keluhan Anda, berikut analisis awal penyebab, langkah aman, serta rekomendasi dari katalog SERVIO.`;
  let deviceCategory = "Umum";
  let urgency: "HIGH" | "MEDIUM" | "ROUTINE" = "MEDIUM";
  let causes = [
    "Komponen utama mengalami penurunan performa akibat pemakaian atau penumpukan kotoran.",
    "Sambungan kelistrikan atau jalur mekanis mengalami gangguan.",
  ];
  let solutions = [
    "Matikan sumber daya utama sementara jika terdengar bunyi tidak wajar atau bau hangus.",
    "Lakukan pemeriksaan visual ringan pada area luar tanpa membongkar segel kelistrikan internal.",
  ];
  let safetyWarning: string | null = null;

  if (isAc) {
    deviceCategory = "AC & Pendingin";
    urgency = "MEDIUM";
    causes = [
      "Filter, evaporator, atau blower indoor kotor sehingga sirkulasi udara dingin terhambat.",
      "Tekanan refrigeran (Freon R32/R410A) berkurang akibat kebocoran halus pada pipa flare atau evaporator.",
      "Kapasitor/kompresor unit outdoor melemah atau kotor berdebu sehingga tidak mendinginkan optimal.",
    ];
    solutions = [
      "Bersihkan filter udara indoor yang mudah dilepas dengan air mengalir lalu keringkan.",
      "Pastikan mode remote berada di 'Cool' (suhu 20–24°C) bukan 'Fan' atau 'Dry'.",
      "Periksa apakah kipas unit outdoor berputar normal saat AC dinyalakan 5 menit.",
    ];
    safetyWarning =
      "Jangan membuka panel listrik outdoor atau menyentuh pipa bertekanan freon dalam kondisi MCB AC menyala.";
  } else if (isElec) {
    deviceCategory = "Kelistrikan & Ventilasi";
    urgency = "HIGH";
    causes = [
      "Beban daya melebihi kapasitas kabel atau MCB sehingga pengaman memutus arus.",
      "Isolasi kabel mulai getas, terminal longgar, atau korsleting ringan di stop kontak.",
    ];
    solutions = [
      "Cabut peralatan berdaya besar dari stop kontak untuk melihat apakah MCB kembali stabil.",
      "Periksa apakah terdapat bau terbakar atau percikan di titik sambungan.",
    ];
    safetyWarning =
      "Waspada bahaya sengatan listrik & korsleting: selalu turunkan MCB utama sebelum memeriksa stop kontak atau jalur kabel.";
  } else if (isTire) {
    deviceCategory = "Otomotif & Perbaikan Ban";
    urgency = "MEDIUM";
    causes = [
      "Tertusuk paku/benda tajam pada telapak ban atau kebocoran halus di bibir velg.",
      "Pentil ban kendur atau karet pentil sudah getas.",
    ];
    solutions = [
      "Jangan paksa berkendara jauh saat tekanan ban turun drastis untuk mencegah kerusakan velg.",
      "Semprot air sabun di area permukaan dan pentil untuk melihat lokasi gelembung angin.",
    ];
  }

  if (needsClarification) {
    summary = `${mediaPrefix}Saya catat keluhan Anda dan sudah menyiapkan penjelasan penyebab & langkah amannya. Sebelum merekomendasikan sparepart yang paling cocok dari database, saya perlu memastikan beberapa detail unit Anda terlebih dahulu.`;
  } else if (finalProducts.length > 0) {
    summary = `${mediaPrefix}Berdasarkan spesifikasi yang Anda sampaikan, berikut hasil diagnosa lengkap beserta pilihan sparepart asli dan layanan teknisi SERVIO yang tersedia di database.`;
  }

  if (fallbackReason && process.env.NODE_ENV !== "production") {
    // Keep note helpful without exposing any secrets
  }

  return {
    structured: {
      summary,
      deviceCategory,
      urgency,
      causes,
      solutions,
      safetyWarning,
      needsClarification,
      clarifyingQuestion,
      quickReplies,
      recommendedServices: finalServices,
      recommendedProducts: finalProducts,
    },
    toolCalls,
  };
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

function buildGeminiContents(input: DiagnosisEngineInput): GeminiContent[] {
  const contents: GeminiContent[] = [];

  // Keep latest 8 history messages for compact, focused context
  const recentHistory = input.history.slice(-8);
  for (const msg of recentHistory) {
    if (msg.sender === "USER") {
      const mediaNote =
        msg.media.length > 0
          ? ` [Pelanggan melampirkan ${msg.media.length} gambar/keyframe video]`
          : "";
      contents.push({
        role: "user",
        parts: [{ text: `${msg.contentText}${mediaNote}` }],
      });
    } else {
      const assistantText = msg.structuredResponse
        ? JSON.stringify({
            summary: msg.structuredResponse.summary,
            deviceCategory: msg.structuredResponse.deviceCategory,
            causes: msg.structuredResponse.causes,
            solutions: msg.structuredResponse.solutions,
            needsClarification: msg.structuredResponse.needsClarification,
            clarifyingQuestion: msg.structuredResponse.clarifyingQuestion,
            recommendedServiceIds: msg.structuredResponse.recommendedServices.map((s) => s.id),
            recommendedProductIds: msg.structuredResponse.recommendedProducts.map((p) => p.id),
          })
        : msg.contentText;
      contents.push({
        role: "model",
        parts: [{ text: assistantText }],
      });
    }
  }

  // Current user turn with text + uploaded photos / extracted video keyframes
  const currentParts: GeminiPart[] = [];
  const videoFramesCount = input.mediaInputs.filter(
    (m) => m.mediaType === "VIDEO_KEYFRAME"
  ).length;
  const imageCount = input.mediaInputs.filter((m) => m.mediaType === "IMAGE").length;

  let promptText = input.userMessage;
  if (videoFramesCount > 0 || imageCount > 0) {
    promptText += `\n\n[Konteks Media Lampiran: ${imageCount} foto kerusakan, ${videoFramesCount} keyframe video terurut waktu]`;
  }
  currentParts.push({ text: promptText });

  for (const media of input.mediaInputs) {
    currentParts.push({
      inlineData: {
        mimeType: media.mimeType,
        data: media.base64Data,
      },
    });
  }

  contents.push({ role: "user", parts: currentParts });
  return contents;
}

async function callGeminiGenerateContent(params: {
  apiKey: string;
  model: string;
  contents: GeminiContent[];
  withTools: boolean;
  forceJsonResponse?: boolean;
}): Promise<{
  ok: boolean;
  status: number;
  errorMessage?: string;
  parts: GeminiPart[];
  rawModelContent?: GeminiContent;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      params.model
    )}:generateContent`;

    const body: Record<string, unknown> = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: params.contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1600,
        ...(params.forceJsonResponse
          ? { responseMimeType: "application/json" }
          : {}),
      },
    };

    if (params.withTools) {
      body.tools = GEMINI_TOOL_DECLARATIONS;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || `Gemini HTTP ${res.status}`;
      return { ok: false, status: res.status, errorMessage: msg, parts: [] };
    }

    const json = await res.json();
    const candidateContent = json?.candidates?.[0]?.content as GeminiContent | undefined;
    const parts = Array.isArray(candidateContent?.parts) ? candidateContent.parts : [];
    return {
      ok: true,
      status: res.status,
      parts,
      rawModelContent: candidateContent,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout >25 detik menunggu respons Gemini"
        : err instanceof Error
          ? err.message
          : "Network failure calling Gemini";
    return { ok: false, status: 502, errorMessage: msg, parts: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function runCustomAgentMode(
  input: DiagnosisEngineInput,
  customAgentUrl: string
): Promise<DiagnosisEngineResult | null> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(customAgentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": input.requestId,
      },
      body: JSON.stringify({
        sessionId: input.sessionId,
        userMessage: input.userMessage,
        history: input.history.slice(-8).map((m) => ({
          sender: m.sender,
          text: m.contentText,
        })),
        mediaCount: input.mediaInputs.length,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Custom Agent HTTP ${res.status}`);
    }

    const payload = (await res.json()) as RawAiJsonOutput;
    const structured = await hydrateStructuredResponse(
      payload,
      new Map(),
      new Map()
    );

    return {
      structured,
      toolCalls: [],
      effectiveProvider: "CUSTOM_AGENT",
      modelName: "custom-agent",
      latencyMs: Date.now() - startedAt,
    };
  } catch (err: unknown) {
    appendClientError({
      kind: "API_ERROR",
      requestId: input.requestId,
      pageRoute: "/smart-discovery",
      userRole: "CUSTOMER",
      method: "POST",
      endpoint: customAgentUrl,
      httpStatus: 502,
      errorCode: "CUSTOM_AGENT_UNREACHABLE",
      message: err instanceof Error ? err.message : "Custom AI Agent unreachable",
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runDiagnosisEngine(
  input: DiagnosisEngineInput
): Promise<DiagnosisEngineResult> {
  const startedAt = Date.now();
  const cfg = getRuntimeConfigStateSnapshot();

  // 1. Optional Custom Agent routing mode
  if (cfg.providerMode === "CUSTOM_AGENT" && cfg.customAgentUrl) {
    const customRes = await runCustomAgentMode(input, cfg.customAgentUrl);
    if (customRes) return customRes;
  }

  // 2. Gemini Multimodal Engine
  const resolvedKey = resolveActiveGeminiKey();
  if (resolvedKey.apiKey && cfg.providerMode === "GEMINI") {
    const contents = buildGeminiContents(input);
    const toolCalls: AiToolCallRecord[] = [];
    const observedServices = new Map<string, RecommendedServiceCard>();
    const observedProducts = new Map<string, RecommendedProductCard>();

    let parsedOutput: RawAiJsonOutput | null = null;
    let rawFinalText = "";
    let geminiFailedReason: string | null = null;

    const isGreeting = isGreetingOrGeneralChat(input.userMessage, input.mediaInputs.length);

    for (let step = 0; step < 4; step++) {
      let stepRes = await callGeminiGenerateContent({
        apiKey: resolvedKey.apiKey,
        model: cfg.model,
        contents,
        withTools: !isGreeting,
        forceJsonResponse: isGreeting,
      });

      // Retry cerdas jika model utama sedang mengalami lonjakan beban (503 / 429)
      if (!stepRes.ok && (stepRes.status === 503 || stepRes.status === 429)) {
        const altModel = cfg.model === "gemini-3.8-flash" ? "gemini-flash-latest" : "gemini-3.8-flash";
        const retryRes = await callGeminiGenerateContent({
          apiKey: resolvedKey.apiKey,
          model: altModel,
          contents,
          withTools: !isGreeting,
          forceJsonResponse: isGreeting,
        });
        if (retryRes.ok) {
          stepRes = retryRes;
        }
      }

      if (!stepRes.ok) {
        geminiFailedReason = stepRes.errorMessage || `HTTP ${stepRes.status}`;
        appendClientError({
          kind: "API_ERROR",
          requestId: input.requestId,
          pageRoute: "/smart-discovery",
          userRole: "CUSTOMER",
          method: "POST",
          endpoint: `/api/ai/diagnose -> gemini:${cfg.model}`,
          httpStatus: stepRes.status,
          errorCode: "GEMINI_API_ERROR",
          message: geminiFailedReason,
        });
        break;
      }

      const fnCallParts = stepRes.parts.filter((p) => p.functionCall);
      if (fnCallParts.length > 0 && stepRes.rawModelContent) {
        contents.push(stepRes.rawModelContent);

        const fnResponseParts: GeminiPart[] = [];
        for (const part of fnCallParts) {
          const callId = part.functionCall!.id;
          const fnName = part.functionCall!.name;
          const args = (part.functionCall!.args || {}) as Record<string, unknown>;
          const q = String(args.query || "");
          const limit = Number(args.limit || 5);

          if (fnName === "search_services") {
            const svcRes = await searchServicesFromDb({ query: q, limit });
            for (const s of svcRes.items) observedServices.set(s.id, s);

            toolCalls.push({
              toolName: "search_services",
              args: { query: q, limit },
              source: svcRes.source,
              matchedIds: svcRes.items.map((s) => s.id),
              resultCount: svcRes.items.length,
              durationMs: svcRes.durationMs,
            });

            fnResponseParts.push({
              functionResponse: {
                ...(callId ? { id: callId } : {}),
                name: "search_services",
                response: {
                  source: svcRes.source,
                  items: svcRes.items.map((s) => ({
                    id: s.id,
                    title: s.title,
                    categoryName: s.categoryName,
                    subcategoryName: s.subcategoryName,
                    providerName: s.providerName,
                    estimatedCostLabel: s.estimatedCostLabel,
                    description: s.description,
                  })),
                },
              },
            });
          } else if (fnName === "search_products") {
            const prodRes = await searchProductsFromDb({ query: q, limit });
            for (const p of prodRes.items) observedProducts.set(p.id, p);

            toolCalls.push({
              toolName: "search_products",
              args: { query: q, limit },
              source: prodRes.source,
              matchedIds: prodRes.items.map((p) => p.id),
              resultCount: prodRes.items.length,
              durationMs: prodRes.durationMs,
            });

            fnResponseParts.push({
              functionResponse: {
                ...(callId ? { id: callId } : {}),
                name: "search_products",
                response: {
                  source: prodRes.source,
                  items: prodRes.items.map((p) => ({
                    id: p.id,
                    name: p.name,
                    brandName: p.brandName,
                    categoryName: p.categoryName,
                    subcategoryName: p.subcategoryName,
                    priceLabel: p.priceLabel,
                    totalStock: p.totalStock,
                    variantSummary: p.variantSummary,
                    description: p.description,
                  })),
                },
              },
            });
          }
        }

        if (fnResponseParts.length > 0) {
          contents.push({ role: "user", parts: fnResponseParts });
          continue;
        }
      }

      // No more function calls -> read model text
      rawFinalText = stepRes.parts
        .map((p) => p.text || "")
        .join("\n")
        .trim();
      parsedOutput = tryExtractJson(rawFinalText);

      // If model answered with prose instead of JSON, do a clean JSON-only formatting pass without tools
      if (!parsedOutput && rawFinalText) {
        const formatContents: GeminiContent[] = [
          ...contents,
          { role: "model", parts: [{ text: rawFinalText }] },
          {
            role: "user",
            parts: [
              {
                text: "Ubah seluruh penjelasan di atas menjadi JSON valid persis sesuai skema system instruction tanpa teks tambahan di luar JSON.",
              },
            ],
          },
        ];
        const jsonPass = await callGeminiGenerateContent({
          apiKey: resolvedKey.apiKey,
          model: cfg.model,
          contents: formatContents,
          withTools: false,
          forceJsonResponse: true,
        });
        if (jsonPass.ok) {
          const jsonText = jsonPass.parts.map((p) => p.text || "").join("\n");
          parsedOutput = tryExtractJson(jsonText);
        }
      }
      break;
    }

    if (parsedOutput && !geminiFailedReason) {
      // Ensure non-clarification turns didn't omit spareparts if model still left product IDs from observed pool
      const structured = await hydrateStructuredResponse(
        parsedOutput,
        observedServices,
        observedProducts
      );
      return {
        structured,
        toolCalls,
        effectiveProvider: "GEMINI",
        modelName: cfg.model,
        latencyMs: Date.now() - startedAt,
      };
    }

    // Fallback gracefully if Gemini failed mid-call
    const fb = await runDeterministicRuleFallback(input, geminiFailedReason);
    return {
      structured: fb.structured,
      toolCalls: [...toolCalls, ...fb.toolCalls],
      effectiveProvider: "RULE_FALLBACK",
      modelName: `${cfg.model}:fallback`,
      latencyMs: Date.now() - startedAt,
      fallbackNotice: geminiFailedReason
        ? `Mode cadangan aktif sementara (${geminiFailedReason})`
        : null,
    };
  }

  // 3. Deterministic Rule Fallback when no Gemini API key has been configured yet
  const fb = await runDeterministicRuleFallback(input, null);
  return {
    structured: fb.structured,
    toolCalls: fb.toolCalls,
    effectiveProvider: "RULE_FALLBACK",
    modelName: "rule-engine-v1",
    latencyMs: Date.now() - startedAt,
    fallbackNotice:
      "Asisten Diagnosa AI sedang berjalan dalam Mode Katalog Cerdas Servio — penyebab, solusi, serta rekomendasi jasa & sparepart disusun langsung dari database resmi.",
  };
}
