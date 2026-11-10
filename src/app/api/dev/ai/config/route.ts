import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import {
  clearRamGeminiKey,
  getMaskedRuntimeConfig,
  testGeminiConnection,
  updateRuntimeAiConfig,
} from "@/lib/aiDiagnosis/runtimeConfig";
import type { AiProviderMode, GeminiModelOption } from "@/lib/aiDiagnosis/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json({
    ok: true,
    config: getMaskedRuntimeConfig(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "INVALID_PAYLOAD", message: "Body JSON tidak valid." },
        { status: 400 }
      );
    }

    const action = String(body.action || "SAVE").toUpperCase();
    const rawKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const model: GeminiModelOption | undefined =
      body.model === "gemini-3.8-flash"
        ? "gemini-3.8-flash"
        : body.model === "gemini-flash-latest"
          ? "gemini-flash-latest"
          : body.model === "gemini-3.7-flash"
            ? "gemini-3.7-flash"
            : body.model === "gemini-2.5-pro"
              ? "gemini-2.5-pro"
              : body.model === "gemini-2.5-flash"
                ? "gemini-2.5-flash"
                : undefined;
    const providerMode: AiProviderMode | undefined =
      body.providerMode === "CUSTOM_AGENT"
        ? "CUSTOM_AGENT"
        : body.providerMode === "GEMINI"
          ? "GEMINI"
          : undefined;

    if (action === "TEST") {
      const testResult = await testGeminiConnection({
        overrideKey: rawKey || null,
        overrideModel: model,
      });
      return NextResponse.json({
        ok: true,
        config: getMaskedRuntimeConfig(),
        testResult,
      });
    }

    const updatedConfig = updateRuntimeAiConfig({
      apiKey: rawKey || undefined,
      model,
      providerMode,
      customAgentUrl:
        body.customAgentUrl !== undefined ? body.customAgentUrl : undefined,
      updatedBy: auth.session.email,
    });

    let testResult = null;
    if (action === "SAVE_AND_TEST") {
      testResult = await testGeminiConnection({
        overrideModel: updatedConfig.model,
      });
    }

    return NextResponse.json({
      ok: true,
      config: getMaskedRuntimeConfig(),
      testResult,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "CONFIG_UPDATE_ERROR",
        message: err instanceof Error ? err.message : "Gagal memperbarui konfigurasi AI.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  const config = clearRamGeminiKey(auth.session.email);
  return NextResponse.json({
    ok: true,
    config,
  });
}

