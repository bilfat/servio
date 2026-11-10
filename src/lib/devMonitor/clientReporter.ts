"use client";

export type ClientTelemetryKind =
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "REACT_RUNTIME"
  | "UNHANDLED_REJECTION";

export interface ClientTelemetryPayload {
  kind: ClientTelemetryKind;
  requestId?: string | null;
  pageRoute?: string;
  userRole?: string;
  userId?: string | null;
  method?: string | null;
  endpoint?: string | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  message: string;
  stack?: string | null;
  durationMs?: number | null;
}

const recentReportCache = new Map<string, number>();

export function generateCorrelationRequestId(): string {
  try {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
      return `req-${globalThis.crypto.randomUUID()}`;
    }
  } catch {
    // fallback below
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getBrowserTelemetryContext(explicitRole?: string, explicitUserId?: string): {
  pageRoute: string;
  userRole: string;
  userId: string | null;
} {
  if (typeof window === "undefined") {
    return {
      pageRoute: "/",
      userRole: explicitRole || "SERVER_SSR",
      userId: explicitUserId || null,
    };
  }
  return {
    pageRoute: window.location.pathname || "/",
    userRole: explicitRole || readBrowserCookie("servio_active_role") || "GUEST",
    userId: explicitUserId || readBrowserCookie("servio_user_id") || null,
  };
}

export function attachCorrelationHeaders(
  headers: Record<string, string>,
  existingRequestId?: string,
  explicitRole?: string
): string {
  const reqId =
    headers["X-Request-ID"] ||
    headers["x-request-id"] ||
    existingRequestId ||
    generateCorrelationRequestId();

  const ctx = getBrowserTelemetryContext(explicitRole || headers["X-Actor-Role"]);
  headers["X-Request-ID"] = reqId;
  headers["X-Client-Route"] = ctx.pageRoute;
  headers["X-Client-Role"] = ctx.userRole;
  return reqId;
}

export function reportClientTelemetry(payload: ClientTelemetryPayload): void {
  if (typeof window === "undefined") return;

  try {
    const ctx = getBrowserTelemetryContext(payload.userRole, payload.userId || undefined);
    const pageRoute = payload.pageRoute || ctx.pageRoute;

    // Never feedback-loop telemetry API calls themselves
    if (payload.endpoint && payload.endpoint.includes("/api/dev/telemetry/")) {
      return;
    }

    const dedupeKey = `${payload.kind}|${payload.httpStatus ?? ""}|${payload.endpoint ?? ""}|${pageRoute}|${payload.message.slice(0, 120)}`;
    const now = Date.now();
    const lastSent = recentReportCache.get(dedupeKey);
    if (lastSent && now - lastSent < 1200) {
      return;
    }
    recentReportCache.set(dedupeKey, now);
    if (recentReportCache.size > 100) {
      const oldestKey = recentReportCache.keys().next().value;
      if (oldestKey) recentReportCache.delete(oldestKey);
    }

    const body = JSON.stringify({
      kind: payload.kind,
      requestId: payload.requestId || null,
      pageRoute,
      userRole: payload.userRole || ctx.userRole,
      userId: payload.userId || ctx.userId,
      method: payload.method || null,
      endpoint: payload.endpoint || null,
      httpStatus: typeof payload.httpStatus === "number" ? payload.httpStatus : null,
      errorCode: payload.errorCode || null,
      message: payload.message,
      stack: payload.stack || null,
      durationMs: typeof payload.durationMs === "number" ? payload.durationMs : null,
    });

    fetch("/api/dev/telemetry/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Telemetry failures must stay silent
    });
  } catch {
    // Non-blocking
  }
}

