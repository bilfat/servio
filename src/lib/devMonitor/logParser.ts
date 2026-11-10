import fs from "node:fs";
import { MICROSERVICE_REGISTRY, MicroserviceSpec, ServiceId, getServiceLogPaths } from "./registry";

export type LogLevel = "EMERGENCY" | "ALERT" | "CRITICAL" | "ERROR" | "WARNING" | "NOTICE" | "INFO" | "DEBUG";

export interface ParsedLogEntry {
  id: string;
  serviceId: ServiceId;
  serviceName: string;
  port: number;
  source: "laravel.log" | "stderr";
  timestamp: string;
  env: string;
  level: LogLevel;
  message: string;
  requestId: string | null;
  correlationId: string | null;
  route: string | null;
  actorId: string | null;
  actorRole: string | null;
  fileLine: string | null;
  context: Record<string, unknown> | null;
  stackTrace: string;
}

const MAX_TAIL_BYTES = 262144; // Read last 256 KB per log file for fast parsing
const LOG_HEADER_REGEX = /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\]\s+([a-zA-Z0-9_-]+)\.([A-Z]+):\s*(.*)$/;

function readTailUtf8(filePath: string, maxBytes = MAX_TAIL_BYTES): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return "";
    const readSize = Math.min(stat.size, maxBytes);
    const fd = fs.openSync(filePath, "r");
    try {
      const buffer = Buffer.alloc(readSize);
      fs.readSync(fd, buffer, 0, readSize, stat.size - readSize);
      let text = buffer.toString("utf8");
      // If sliced mid-line, drop the partial first line unless reading from start
      if (stat.size > readSize) {
        const firstNewline = text.indexOf("\n");
        if (firstNewline !== -1) {
          text = text.slice(firstNewline + 1);
        }
      }
      return text;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

function normalizeLevel(lvl: string): LogLevel {
  const upper = lvl.toUpperCase();
  if (
    upper === "EMERGENCY" ||
    upper === "ALERT" ||
    upper === "CRITICAL" ||
    upper === "ERROR" ||
    upper === "WARNING" ||
    upper === "NOTICE" ||
    upper === "INFO" ||
    upper === "DEBUG"
  ) {
    return upper;
  }
  return "ERROR";
}

function extractContextAndCleanMessage(rawFirstLine: string, fullBlock: string): {
  message: string;
  context: Record<string, unknown> | null;
  requestId: string | null;
  correlationId: string | null;
  route: string | null;
  actorId: string | null;
  actorRole: string | null;
  fileLine: string | null;
} {
  let message = rawFirstLine;
  let context: Record<string, unknown> | null = null;

  // Laravel often appends JSON context at end of line: `Message {"request_id":"...",...}`
  const jsonStart = rawFirstLine.lastIndexOf(" {");
  if (jsonStart > 0) {
    const candidate = rawFirstLine.slice(jsonStart + 1).trim();
    if (candidate.endsWith("}")) {
      try {
        context = JSON.parse(candidate);
        message = rawFirstLine.slice(0, jsonStart).trim();
      } catch {
        // Multiline exception JSON in Laravel: try extracting known JSON metadata fields with regex
      }
    }
  }

  let requestId: string | null =
    (context?.request_id as string) ||
    (context?.requestId as string) ||
    (context?.X_Request_ID as string) ||
    null;
  let correlationId: string | null =
    (context?.correlation_id as string) ||
    (context?.correlationId as string) ||
    null;
  const route: string | null = (context?.route as string) || (context?.url as string) || null;
  const actorId: string | null = (context?.actor_id as string) || (context?.userId as string) || null;
  const actorRole: string | null = (context?.actor_role as string) || null;

  if (!requestId) {
    const reqMatch = fullBlock.match(/"request_id"\s*:\s*"([^"]+)"/);
    if (reqMatch) requestId = reqMatch[1];
  }
  if (!correlationId) {
    const corrMatch = fullBlock.match(/"correlation_id"\s*:\s*"([^"]+)"/);
    if (corrMatch) correlationId = corrMatch[1];
  }

  // Extract file & line reference for developer quick location
  let fileLine: string | null = null;
  const atMatch = fullBlock.match(/(?:at|in)\s+([A-Za-z]:[\\/][^\s:()]+|\/[^\s:()]+):(\d+)/);
  if (atMatch) {
    fileLine = `${atMatch[1]}:${atMatch[2]}`;
  } else {
    const onLineMatch = fullBlock.match(/in\s+([^\s]+)\s+on\s+line\s+(\d+)/);
    if (onLineMatch) {
      fileLine = `${onLineMatch[1]}:${onLineMatch[2]}`;
    }
  }

  return {
    message: message.slice(0, 500),
    context,
    requestId,
    correlationId,
    route,
    actorId,
    actorRole,
    fileLine,
  };
}

export function parseServiceLogs(spec: MicroserviceSpec, maxEntries = 80): ParsedLogEntry[] {
  const paths = getServiceLogPaths(spec);
  const results: ParsedLogEntry[] = [];

  // 1. Parse Laravel main log
  const laravelRaw = readTailUtf8(paths.laravelLog);
  if (laravelRaw) {
    const lines = laravelRaw.split(/\r?\n/);
    let currentHeader: {
      timestamp: string;
      env: string;
      level: LogLevel;
      firstMessage: string;
    } | null = null;
    let bodyLines: string[] = [];
    let seq = 0;

    const flush = () => {
      if (!currentHeader) return;
      const fullBlock = [currentHeader.firstMessage, ...bodyLines].join("\n").trim();
      const extracted = extractContextAndCleanMessage(currentHeader.firstMessage, fullBlock);
      results.push({
        id: `${spec.id}-laravel-${currentHeader.timestamp}-${seq++}`,
        serviceId: spec.id,
        serviceName: spec.shortName,
        port: spec.port,
        source: "laravel.log",
        timestamp: currentHeader.timestamp,
        env: currentHeader.env,
        level: currentHeader.level,
        message: extracted.message,
        requestId: extracted.requestId,
        correlationId: extracted.correlationId,
        route: extracted.route,
        actorId: extracted.actorId,
        actorRole: extracted.actorRole,
        fileLine: extracted.fileLine,
        context: extracted.context,
        stackTrace: fullBlock.slice(0, 6000),
      });
    };

    for (const line of lines) {
      const m = line.match(LOG_HEADER_REGEX);
      if (m) {
        flush();
        currentHeader = {
          timestamp: m[1].replace(" ", "T"),
          env: m[2],
          level: normalizeLevel(m[3]),
          firstMessage: m[4] || "",
        };
        bodyLines = [];
      } else if (currentHeader) {
        bodyLines.push(line);
      }
    }
    flush();
  }

  // 2. Parse process stderr log (catches fatal crashes even if Laravel logger didn't boot)
  const errRaw = readTailUtf8(paths.stderrLog, 65536);
  if (errRaw && errRaw.trim().length > 0) {
    const errLines = errRaw
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0 && !/Development Server .* started/i.test(l) && !/Accepted|Closing/i.test(l));

    if (errLines.length > 0) {
      const combined = errLines.slice(-25).join("\n");
      const fileMatch = combined.match(/in\s+([^\s]+)\s+on\s+line\s+(\d+)/);
      results.push({
        id: `${spec.id}-stderr-latest`,
        serviceId: spec.id,
        serviceName: spec.shortName,
        port: spec.port,
        source: "stderr",
        timestamp: new Date().toISOString(),
        env: "runtime",
        level: "CRITICAL",
        message: errLines[errLines.length - 1].slice(0, 300),
        requestId: null,
        correlationId: null,
        route: null,
        actorId: null,
        actorRole: null,
        fileLine: fileMatch ? `${fileMatch[1]}:${fileMatch[2]}` : null,
        context: null,
        stackTrace: combined.slice(0, 4000),
      });
    }
  }

  return results.slice(-maxEntries);
}

export function queryAllServiceLogs(options?: {
  serviceId?: string | null;
  level?: string | null;
  q?: string | null;
  requestId?: string | null;
  limit?: number;
}): {
  entries: ParsedLogEntry[];
  summary: { totalParsed: number; errorCount: number; warningCount: number };
} {
  const targetSpecs = options?.serviceId && options.serviceId !== "ALL"
    ? MICROSERVICE_REGISTRY.filter((s) => s.id === options.serviceId)
    : MICROSERVICE_REGISTRY;

  let allEntries: ParsedLogEntry[] = [];
  for (const spec of targetSpecs) {
    allEntries = allEntries.concat(parseServiceLogs(spec, 80));
  }

  // Sort newest first
  allEntries.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return tb - ta;
  });

  const errorCount = allEntries.filter((e) =>
    ["EMERGENCY", "ALERT", "CRITICAL", "ERROR"].includes(e.level)
  ).length;
  const warningCount = allEntries.filter((e) => e.level === "WARNING").length;

  let filtered = allEntries;

  if (options?.level && options.level !== "ALL") {
    if (options.level === "ERRORS_ONLY") {
      filtered = filtered.filter((e) =>
        ["EMERGENCY", "ALERT", "CRITICAL", "ERROR"].includes(e.level)
      );
    } else {
      filtered = filtered.filter((e) => e.level === options.level);
    }
  }

  if (options?.requestId && options.requestId.trim()) {
    const rid = options.requestId.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        (e.requestId && e.requestId.toLowerCase().includes(rid)) ||
        (e.correlationId && e.correlationId.toLowerCase().includes(rid)) ||
        e.stackTrace.toLowerCase().includes(rid)
    );
  }

  if (options?.q && options.q.trim()) {
    const q = options.q.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        e.serviceName.toLowerCase().includes(q) ||
        (e.fileLine && e.fileLine.toLowerCase().includes(q)) ||
        (e.requestId && e.requestId.toLowerCase().includes(q)) ||
        e.stackTrace.toLowerCase().includes(q)
    );
  }

  const limit = Math.min(options?.limit || 150, 300);
  return {
    entries: filtered.slice(0, limit),
    summary: {
      totalParsed: allEntries.length,
      errorCount,
      warningCount,
    },
  };
}

