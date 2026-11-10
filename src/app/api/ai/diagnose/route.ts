import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appendClientError } from "@/lib/devMonitor/clientTelemetryStore";
import {
  getSessionDetail,
  insertDiagnosisMedia,
  insertDiagnosisMessage,
  updateSessionAfterAssistantTurn,
  upsertDiagnosisSession,
} from "@/lib/aiDiagnosis/db";
import {
  runDiagnosisEngine,
  type InlineMediaInput,
} from "@/lib/aiDiagnosis/geminiAdapter";
import {
  MAX_MEDIA_ATTACHMENTS_PER_TURN,
  sanitizeSessionIdForPath,
  saveAiMediaBuffer,
} from "@/lib/aiDiagnosis/mediaStorage";
import {
  getPublicAiCapability,
  getRuntimeConfigStateSnapshot,
} from "@/lib/aiDiagnosis/runtimeConfig";
import type { AiMediaAttachmentView, AiMessageView } from "@/lib/aiDiagnosis/types";

export const dynamic = "force-dynamic";

interface ParsedAttachmentInput {
  buffer: Buffer;
  mimeType: string;
  mediaType: "IMAGE" | "VIDEO_KEYFRAME";
  frameTimestampSec: number | null;
}

function parseDataUrlOrBase64(raw: string): Buffer {
  const str = String(raw || "").trim();
  const base64Part = str.includes(",") ? str.split(",")[1] || "" : str;
  return Buffer.from(base64Part, "base64");
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    capability: getPublicAiCapability(),
  });
}

export async function POST(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id")?.trim() ||
    `req-ai-${crypto.randomUUID().slice(0, 12)}`;

  try {
    let rawSessionId = "";
    let userMessage = "";
    let customerUserId: string | null = null;
    const parsedAttachments: ParsedAttachmentInput[] = [];

    const contentType = (request.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      rawSessionId = String(formData.get("sessionId") || "").trim();
      userMessage = String(formData.get("message") || "").trim();
      const rawUid = formData.get("customerUserId");
      customerUserId = rawUid ? String(rawUid).trim() || null : null;

      let metaList: Array<{ mediaType?: string; frameTimestampSec?: number | null }> = [];
      const rawMeta = formData.get("attachmentsMeta");
      if (typeof rawMeta === "string" && rawMeta.trim()) {
        try {
          metaList = JSON.parse(rawMeta);
        } catch {
          metaList = [];
        }
      }

      const fileEntries = formData.getAll("files");
      for (let i = 0; i < fileEntries.length; i++) {
        const entry = fileEntries[i];
        if (entry instanceof File) {
          const ab = await entry.arrayBuffer();
          const meta = metaList[i] || {};
          parsedAttachments.push({
            buffer: Buffer.from(ab),
            mimeType: entry.type || "image/jpeg",
            mediaType:
              meta.mediaType === "VIDEO_KEYFRAME" ? "VIDEO_KEYFRAME" : "IMAGE",
            frameTimestampSec:
              typeof meta.frameTimestampSec === "number"
                ? meta.frameTimestampSec
                : null,
          });
        }
      }
    } else {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { ok: false, error: "INVALID_BODY", message: "Format payload tidak valid." },
          { status: 400 }
        );
      }

      rawSessionId = String(body.sessionId || "").trim();
      userMessage = String(body.message || "").trim();
      customerUserId = body.customerUserId
        ? String(body.customerUserId).trim() || null
        : null;

      if (Array.isArray(body.attachments)) {
        for (const att of body.attachments) {
          if (att && typeof att.base64Data === "string") {
            parsedAttachments.push({
              buffer: parseDataUrlOrBase64(att.base64Data),
              mimeType: String(att.mimeType || "image/jpeg"),
              mediaType:
                att.mediaType === "VIDEO_KEYFRAME" ? "VIDEO_KEYFRAME" : "IMAGE",
              frameTimestampSec:
                typeof att.frameTimestampSec === "number"
                  ? att.frameTimestampSec
                  : null,
            });
          }
        }
      }
    }

    if (!userMessage && parsedAttachments.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPTY_INPUT",
          message: "Tulis keluhan Anda atau lampirkan foto/video kerusakan terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    if (!userMessage && parsedAttachments.length > 0) {
      userMessage = "Tolong analisis kerusakan pada foto/video terlampir.";
    }

    if (parsedAttachments.length > MAX_MEDIA_ATTACHMENTS_PER_TURN) {
      return NextResponse.json(
        {
          ok: false,
          error: "TOO_MANY_ATTACHMENTS",
          message: `Maksimal ${MAX_MEDIA_ATTACHMENTS_PER_TURN} foto/keyframe per pesan.`,
        },
        { status: 400 }
      );
    }

    const sessionId = rawSessionId
      ? sanitizeSessionIdForPath(rawSessionId)
      : `diag-${crypto.randomUUID()}`;

    // Load prior multi-turn history before inserting current message
    const existingDetail = await getSessionDetail(sessionId);
    const priorHistory: AiMessageView[] = existingDetail?.messages || [];

    const cfgSnap = getRuntimeConfigStateSnapshot();
    await upsertDiagnosisSession({
      sessionId,
      customerUserId,
      problemSummary: userMessage,
      aiProvider: cfgSnap.providerMode,
      modelName: cfgSnap.model,
      requestId,
    });

    // Insert USER message
    const userMessageId = `msg-u-${crypto.randomUUID()}`;
    await insertDiagnosisMessage({
      id: userMessageId,
      sessionId,
      sender: "USER",
      contentText: userMessage,
      requestId,
    });

    // Save image & video keyframe buffers to managed disk & database
    const savedMediaViews: AiMediaAttachmentView[] = [];
    const inlineMediaInputs: InlineMediaInput[] = [];

    for (const att of parsedAttachments) {
      const savedFile = await saveAiMediaBuffer({
        sessionId,
        buffer: att.buffer,
        mimeType: att.mimeType,
      });

      await insertDiagnosisMedia({
        id: savedFile.id,
        sessionId,
        messageId: userMessageId,
        mediaType: att.mediaType,
        frameTimestampSec: att.frameTimestampSec,
        mimeType: savedFile.mimeType,
        bytes: savedFile.bytes,
        sha256: savedFile.sha256,
        storagePath: savedFile.storagePath,
      });

      savedMediaViews.push({
        id: savedFile.id,
        mediaType: att.mediaType,
        frameTimestampSec: att.frameTimestampSec,
        mimeType: savedFile.mimeType,
        bytes: savedFile.bytes,
        url: `/api/ai/media/${encodeURIComponent(savedFile.id)}`,
      });

      inlineMediaInputs.push({
        mimeType: savedFile.mimeType,
        base64Data: att.buffer.toString("base64"),
        mediaType: att.mediaType,
        frameTimestampSec: att.frameTimestampSec,
      });
    }

    // Run Gemini Multimodal Engine + Grounded Catalog Tools (with fallback)
    const engineRes = await runDiagnosisEngine({
      sessionId,
      requestId,
      userMessage,
      history: priorHistory,
      mediaInputs: inlineMediaInputs,
    });

    const assistantMessageId = `msg-a-${crypto.randomUUID()}`;
    await insertDiagnosisMessage({
      id: assistantMessageId,
      sessionId,
      sender: "ASSISTANT",
      contentText: engineRes.structured.summary,
      structuredResponse: engineRes.structured,
      toolCalls: engineRes.toolCalls,
      aiProvider: engineRes.effectiveProvider,
      modelName: engineRes.modelName,
      requestId,
      latencyMs: engineRes.latencyMs,
    });

    await updateSessionAfterAssistantTurn({
      sessionId,
      deviceCategory: engineRes.structured.deviceCategory,
      problemSummary: userMessage,
      aiProvider: engineRes.effectiveProvider,
      modelName: engineRes.modelName,
      latencyMs: engineRes.latencyMs,
      requestId,
    });

    const nowIso = new Date().toISOString();
    const userMsgView: AiMessageView = {
      id: userMessageId,
      sessionId,
      sender: "USER",
      contentText: userMessage,
      structuredResponse: null,
      toolCalls: [],
      media: savedMediaViews,
      aiProvider: null,
      modelName: null,
      requestId,
      latencyMs: null,
      userFeedback: null,
      createdAt: nowIso,
    };

    const assistantMsgView: AiMessageView = {
      id: assistantMessageId,
      sessionId,
      sender: "ASSISTANT",
      contentText: engineRes.structured.summary,
      structuredResponse: engineRes.structured,
      toolCalls: engineRes.toolCalls,
      media: [],
      aiProvider: engineRes.effectiveProvider,
      modelName: engineRes.modelName,
      requestId,
      latencyMs: engineRes.latencyMs,
      userFeedback: null,
      createdAt: nowIso,
    };

    return NextResponse.json(
      {
        ok: true,
        sessionId,
        requestId,
        fallbackNotice: engineRes.fallbackNotice || null,
        capability: getPublicAiCapability(),
        userMessage: userMsgView,
        assistantMessage: assistantMsgView,
      },
      {
        status: 200,
        headers: { "X-Request-ID": requestId },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan memproses diagnosa AI.";
    appendClientError({
      kind: "API_ERROR",
      requestId,
      pageRoute: "/smart-discovery",
      userRole: "CUSTOMER",
      method: "POST",
      endpoint: "/api/ai/diagnose",
      httpStatus: 500,
      errorCode: "AI_DIAGNOSE_EXCEPTION",
      message,
      stack: err instanceof Error ? err.stack : null,
    });

    return NextResponse.json(
      { ok: false, requestId, error: "AI_DIAGNOSE_FAILED", message },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}

