import fs from "node:fs";
import path from "node:path";
import { getClientErrorsLogPath } from "./registry";

export interface ClientErrorEvent {
  id: string;
  timestamp: string;
  kind: "API_ERROR" | "NETWORK_ERROR" | "REACT_RUNTIME" | "UNHANDLED_REJECTION";
  requestId?: string | null;
  pageRoute: string;
  userRole: string;
  userId?: string | null;
  method?: string | null;
  endpoint?: string | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  message: string;
  stack?: string | null;
  durationMs?: number | null;
}

const MAX_FILE_BYTES = 1_500_000; // 1.5 MB auto-trim threshold

export function appendClientError(event: Omit<ClientErrorEvent, "id" | "timestamp">): ClientErrorEvent {
  const filePath = getClientErrorsLogPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const record: ClientErrorEvent = {
    id: `ce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    kind: event.kind || "API_ERROR",
    requestId: event.requestId || null,
    pageRoute: (event.pageRoute || "/").slice(0, 250),
    userRole: (event.userRole || "GUEST").slice(0, 64),
    userId: event.userId ? String(event.userId).slice(0, 64) : null,
    method: event.method ? String(event.method).toUpperCase().slice(0, 16) : null,
    endpoint: event.endpoint ? String(event.endpoint).slice(0, 300) : null,
    httpStatus: typeof event.httpStatus === "number" ? event.httpStatus : null,
    errorCode: event.errorCode ? String(event.errorCode).slice(0, 100) : null,
    message: String(event.message || "Unknown client error").slice(0, 800),
    stack: event.stack ? String(event.stack).slice(0, 3500) : null,
    durationMs: typeof event.durationMs === "number" ? event.durationMs : null,
  };

  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_BYTES) {
        const raw = fs.readFileSync(filePath, "utf8");
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const kept = lines.slice(-400);
        fs.writeFileSync(filePath, kept.join("\n") + "\n", "utf8");
      }
    }
    fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
  } catch {
    // Non-fatal: telemetry must never crash user flow
  }

  return record;
}

export function queryClientErrors(options?: {
  role?: string | null;
  kind?: string | null;
  status?: string | null;
  q?: string | null;
  requestId?: string | null;
  limit?: number;
}): {
  events: ClientErrorEvent[];
  totalCount: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
} {
  const filePath = getClientErrorsLogPath();
  if (!fs.existsSync(filePath)) {
    return { events: [], totalCount: 0, byRole: {}, byStatus: {} };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const parsed: ClientErrorEvent[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as ClientErrorEvent;
      if (obj && obj.message) parsed.push(obj);
    } catch {
      // skip malformed line
    }
  }

  parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const byRole: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const ev of parsed) {
    byRole[ev.userRole] = (byRole[ev.userRole] || 0) + 1;
    const statusKey = ev.httpStatus ? String(ev.httpStatus) : ev.kind;
    byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;
  }

  let filtered = parsed;
  if (options?.role && options.role !== "ALL") {
    filtered = filtered.filter((e) => e.userRole === options.role);
  }
  if (options?.kind && options.kind !== "ALL") {
    filtered = filtered.filter((e) => e.kind === options.kind);
  }
  if (options?.status && options.status !== "ALL") {
    filtered = filtered.filter((e) => String(e.httpStatus || "") === options.status);
  }
  if (options?.requestId && options.requestId.trim()) {
    const rid = options.requestId.trim().toLowerCase();
    filtered = filtered.filter((e) => e.requestId && e.requestId.toLowerCase().includes(rid));
  }
  if (options?.q && options.q.trim()) {
    const q = options.q.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        e.pageRoute.toLowerCase().includes(q) ||
        (e.endpoint && e.endpoint.toLowerCase().includes(q)) ||
        (e.errorCode && e.errorCode.toLowerCase().includes(q)) ||
        (e.requestId && e.requestId.toLowerCase().includes(q))
    );
  }

  return {
    events: filtered.slice(0, Math.min(options?.limit || 150, 400)),
    totalCount: parsed.length,
    byRole,
    byStatus,
  };
}

