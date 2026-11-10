import type {
  AiProviderMode,
  AiRuntimeConfigSummary,
  GeminiModelOption,
} from "./types";

interface InternalRuntimeConfigState {
  ramApiKey: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  model: GeminiModelOption;
  providerMode: AiProviderMode;
  customAgentUrl: string | null;
  lastTestStatus: {
    ok: boolean;
    testedAt: string;
    message: string;
    latencyMs: number;
  } | null;
}

const globalForAiConfig = globalThis as unknown as {
  __servioAiRuntimeConfig?: InternalRuntimeConfigState;
};

function getState(): InternalRuntimeConfigState {
  if (!globalForAiConfig.__servioAiRuntimeConfig) {
    globalForAiConfig.__servioAiRuntimeConfig = {
      ramApiKey: null,
      updatedAt: null,
      updatedBy: null,
      model: "gemini-3.8-flash",
      providerMode: "GEMINI",
      customAgentUrl: process.env.CUSTOM_AI_AGENT_URL || null,
      lastTestStatus: null,
    };
  }
  return globalForAiConfig.__servioAiRuntimeConfig;
}

export function maskSecretKey(rawKey: string | null | undefined): string | null {
  const key = (rawKey || "").trim();
  if (!key) return null;
  if (key.length <= 10) return "••••••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

/**
 * Resolves active Gemini API Key strictly on the Next.js server:
 * Priority 1: Developer RAM store (set via /dev/ai-agent Tab Konfigurasi)
 * Priority 2: process.env.GEMINI_API_KEY fallback
 */
export function resolveActiveGeminiKey(): {
  apiKey: string | null;
  source: "RAM" | "ENV" | "NONE";
} {
  const state = getState();
  if (state.ramApiKey && state.ramApiKey.trim().length > 0) {
    return { apiKey: state.ramApiKey.trim(), source: "RAM" };
  }
  const envKey = (process.env.GEMINI_API_KEY || "").trim();
  if (envKey.length > 0) {
    return { apiKey: envKey, source: "ENV" };
  }
  return { apiKey: null, source: "NONE" };
}

export function getRuntimeConfigStateSnapshot(): {
  providerMode: AiProviderMode;
  model: GeminiModelOption;
  customAgentUrl: string | null;
  keySource: "RAM" | "ENV" | "NONE";
} {
  const state = getState();
  const { source } = resolveActiveGeminiKey();
  return {
    providerMode: state.providerMode,
    model: state.model,
    customAgentUrl: state.customAgentUrl,
    keySource: source,
  };
}

/**
 * Safe summary for Developer Portal API & UI. Never returns raw API key.
 */
export function getMaskedRuntimeConfig(): AiRuntimeConfigSummary {
  const state = getState();
  const resolved = resolveActiveGeminiKey();

  return {
    providerMode: state.providerMode,
    model: state.model,
    customAgentUrl: state.customAgentUrl,
    keyConfigured: Boolean(resolved.apiKey),
    keySource: resolved.source,
    maskedKey: maskSecretKey(resolved.apiKey),
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy,
    lastTestStatus: state.lastTestStatus,
  };
}

/**
 * Safe public readiness info for customer UI (zero key material at all).
 */
export function getPublicAiCapability(): {
  providerMode: AiProviderMode;
  model: GeminiModelOption;
  geminiReady: boolean;
  customAgentReady: boolean;
} {
  const state = getState();
  const resolved = resolveActiveGeminiKey();
  return {
    providerMode: state.providerMode,
    model: state.model,
    geminiReady: Boolean(resolved.apiKey),
    customAgentReady: Boolean(state.customAgentUrl && state.customAgentUrl.trim()),
  };
}

export function updateRuntimeAiConfig(params: {
  apiKey?: string | null;
  model?: GeminiModelOption;
  providerMode?: AiProviderMode;
  customAgentUrl?: string | null;
  updatedBy?: string | null;
}): AiRuntimeConfigSummary {
  const state = getState();

  if (typeof params.apiKey === "string") {
    const trimmed = params.apiKey.trim();
    if (trimmed.length > 0) {
      state.ramApiKey = trimmed;
      state.updatedAt = new Date().toISOString();
      state.updatedBy = params.updatedBy || "developer";
    }
  }

  if (
    params.model === "gemini-3.8-flash" ||
    params.model === "gemini-flash-latest" ||
    params.model === "gemini-3.7-flash" ||
    params.model === "gemini-2.5-flash" ||
    params.model === "gemini-2.5-pro"
  ) {
    state.model = params.model;
  }

  if (params.providerMode === "GEMINI" || params.providerMode === "CUSTOM_AGENT") {
    state.providerMode = params.providerMode;
  }

  if (params.customAgentUrl !== undefined) {
    const urlStr = typeof params.customAgentUrl === "string" ? params.customAgentUrl.trim() : "";
    state.customAgentUrl = urlStr || null;
  }

  return getMaskedRuntimeConfig();
}

export function clearRamGeminiKey(updatedBy?: string | null): AiRuntimeConfigSummary {
  const state = getState();
  state.ramApiKey = null;
  state.updatedAt = new Date().toISOString();
  state.updatedBy = updatedBy || "developer";
  state.lastTestStatus = null;
  return getMaskedRuntimeConfig();
}

export async function testGeminiConnection(params?: {
  overrideKey?: string | null;
  overrideModel?: GeminiModelOption;
}): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  model: string;
}> {
  const state = getState();
  const resolved = resolveActiveGeminiKey();
  const keyToUse =
    params?.overrideKey && params.overrideKey.trim().length > 0
      ? params.overrideKey.trim()
      : resolved.apiKey;
  const modelToUse = params?.overrideModel || state.model || "gemini-3.8-flash";

  if (!keyToUse) {
    const res = {
      ok: false,
      latencyMs: 0,
      message:
        "Gemini API Key belum dikonfigurasi di RAM Server maupun fallback .env.local (GEMINI_API_KEY).",
      model: modelToUse,
    };
    state.lastTestStatus = { ...res, testedAt: new Date().toISOString() };
    return res;
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelToUse
    )}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": keyToUse,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Balas satu kata saja: OK" }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 16,
          temperature: 0,
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errMsg =
        errBody?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      const result = {
        ok: false,
        latencyMs,
        message: `Gagal terhubung ke Gemini (${errMsg})`,
        model: modelToUse,
      };
      state.lastTestStatus = { ...result, testedAt: new Date().toISOString() };
      return result;
    }

    const json = await response.json().catch(() => null);
    const replyText =
      json?.candidates?.[0]?.content?.parts?.[0]?.text || "Terhubung";

    const result = {
      ok: true,
      latencyMs,
      message: `Koneksi Gemini aktif (${modelToUse}) · Respons: "${String(replyText).trim().slice(0, 40)}"`,
      model: modelToUse,
    };
    state.lastTestStatus = { ...result, testedAt: new Date().toISOString() };
    return result;
  } catch (err: unknown) {
    const latencyMs = Date.now() - startedAt;
    const msg =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout >10 detik menghubungi server Google Gemini."
        : err instanceof Error
          ? err.message
          : "Network error menghubungi Gemini API.";
    const result = { ok: false, latencyMs, message: msg, model: modelToUse };
    state.lastTestStatus = { ...result, testedAt: new Date().toISOString() };
    return result;
  } finally {
    clearTimeout(timer);
  }
}

