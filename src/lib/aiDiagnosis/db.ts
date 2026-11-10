import mysql, { Pool } from "mysql2/promise";
import { getMysqlConfig } from "@/lib/devMonitor/db";
import type {
  AiFeedbackValue,
  AiMediaAttachmentView,
  AiMessageView,
  AiMonitoringKpis,
  AiSessionDetail,
  AiSessionSummary,
  AiStructuredResponse,
  AiToolCallRecord,
} from "./types";

export const AI_DATABASE_NAME = "servio_ai_db";

const globalForAiDb = globalThis as unknown as {
  __servioAiPool?: Pool;
  __servioAiSchemaPromise?: Promise<void>;
};

async function initializeAiDatabaseAndTables(): Promise<void> {
  const cfg = getMysqlConfig();
  const adminConn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    connectTimeout: 2500,
  });

  try {
    await adminConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${AI_DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await adminConn.query(`USE \`${AI_DATABASE_NAME}\``);

    await adminConn.query(`
      CREATE TABLE IF NOT EXISTS ai_diagnosis_sessions (
        id VARCHAR(64) PRIMARY KEY,
        customer_user_id VARCHAR(64) NULL,
        device_category VARCHAR(120) NULL,
        problem_summary TEXT NULL,
        ai_provider VARCHAR(32) NOT NULL DEFAULT 'GEMINI',
        model_name VARCHAR(64) NOT NULL DEFAULT 'gemini-2.5-flash',
        avg_latency_ms INT NULL,
        request_id VARCHAR(128) NULL,
        user_feedback VARCHAR(16) NULL,
        selected_service_id VARCHAR(64) NULL,
        selected_product_id VARCHAR(64) NULL,
        turn_count INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_ai_sess_created (created_at),
        INDEX idx_ai_sess_feedback (user_feedback),
        INDEX idx_ai_sess_provider (ai_provider)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await adminConn.query(`
      CREATE TABLE IF NOT EXISTS ai_diagnosis_messages (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        sender VARCHAR(16) NOT NULL,
        content_text MEDIUMTEXT NOT NULL,
        structured_response_json LONGTEXT NULL,
        tool_calls_json LONGTEXT NULL,
        ai_provider VARCHAR(32) NULL,
        model_name VARCHAR(64) NULL,
        request_id VARCHAR(128) NULL,
        latency_ms INT NULL,
        user_feedback VARCHAR(16) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_ai_msg_sess_created (session_id, created_at),
        CONSTRAINT fk_ai_msg_session FOREIGN KEY (session_id) REFERENCES ai_diagnosis_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await adminConn.query(`
      CREATE TABLE IF NOT EXISTS ai_diagnosis_media (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        message_id VARCHAR(64) NOT NULL,
        media_type VARCHAR(24) NOT NULL,
        frame_timestamp_sec DECIMAL(8,2) NULL,
        mime_type VARCHAR(64) NOT NULL,
        bytes INT NOT NULL,
        sha256 CHAR(64) NOT NULL,
        storage_path VARCHAR(512) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_ai_media_sess (session_id),
        INDEX idx_ai_media_msg (message_id),
        CONSTRAINT fk_ai_media_session FOREIGN KEY (session_id) REFERENCES ai_diagnosis_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    await adminConn.end();
  }
}

export async function ensureAiSchema(): Promise<void> {
  if (!globalForAiDb.__servioAiSchemaPromise) {
    globalForAiDb.__servioAiSchemaPromise = initializeAiDatabaseAndTables().catch((err) => {
      globalForAiDb.__servioAiSchemaPromise = undefined;
      throw err;
    });
  }
  await globalForAiDb.__servioAiSchemaPromise;
}

export async function getAiPool(): Promise<Pool> {
  await ensureAiSchema();
  if (!globalForAiDb.__servioAiPool) {
    const cfg = getMysqlConfig();
    globalForAiDb.__servioAiPool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: AI_DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 2500,
    });
  }
  return globalForAiDb.__servioAiPool;
}

function toIsoString(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string" && val) return new Date(val).toISOString();
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function upsertDiagnosisSession(params: {
  sessionId: string;
  customerUserId?: string | null;
  problemSummary?: string | null;
  aiProvider: string;
  modelName: string;
  requestId?: string | null;
}): Promise<void> {
  const pool = await getAiPool();
  await pool.query(
    `
    INSERT INTO ai_diagnosis_sessions (
      id, customer_user_id, problem_summary, ai_provider, model_name, request_id, turn_count
    ) VALUES (?, ?, ?, ?, ?, ?, 0)
    ON DUPLICATE KEY UPDATE
      customer_user_id = COALESCE(ai_diagnosis_sessions.customer_user_id, VALUES(customer_user_id)),
      ai_provider = VALUES(ai_provider),
      model_name = VALUES(model_name),
      request_id = VALUES(request_id),
      updated_at = CURRENT_TIMESTAMP(3)
    `,
    [
      params.sessionId,
      params.customerUserId || null,
      params.problemSummary ? params.problemSummary.slice(0, 600) : null,
      params.aiProvider,
      params.modelName,
      params.requestId || null,
    ]
  );
}

export async function insertDiagnosisMessage(params: {
  id: string;
  sessionId: string;
  sender: "USER" | "ASSISTANT";
  contentText: string;
  structuredResponse?: AiStructuredResponse | null;
  toolCalls?: AiToolCallRecord[] | null;
  aiProvider?: string | null;
  modelName?: string | null;
  requestId?: string | null;
  latencyMs?: number | null;
}): Promise<void> {
  const pool = await getAiPool();
  await pool.query(
    `
    INSERT INTO ai_diagnosis_messages (
      id, session_id, sender, content_text, structured_response_json,
      tool_calls_json, ai_provider, model_name, request_id, latency_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      params.id,
      params.sessionId,
      params.sender,
      params.contentText,
      params.structuredResponse ? JSON.stringify(params.structuredResponse) : null,
      params.toolCalls && params.toolCalls.length > 0 ? JSON.stringify(params.toolCalls) : null,
      params.aiProvider || null,
      params.modelName || null,
      params.requestId || null,
      typeof params.latencyMs === "number" ? Math.round(params.latencyMs) : null,
    ]
  );
}

export async function insertDiagnosisMedia(params: {
  id: string;
  sessionId: string;
  messageId: string;
  mediaType: "IMAGE" | "VIDEO_KEYFRAME";
  frameTimestampSec: number | null;
  mimeType: string;
  bytes: number;
  sha256: string;
  storagePath: string;
}): Promise<void> {
  const pool = await getAiPool();
  await pool.query(
    `
    INSERT INTO ai_diagnosis_media (
      id, session_id, message_id, media_type, frame_timestamp_sec,
      mime_type, bytes, sha256, storage_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      params.id,
      params.sessionId,
      params.messageId,
      params.mediaType,
      params.frameTimestampSec,
      params.mimeType,
      params.bytes,
      params.sha256,
      params.storagePath,
    ]
  );
}

export async function updateSessionAfterAssistantTurn(params: {
  sessionId: string;
  deviceCategory?: string | null;
  problemSummary?: string | null;
  aiProvider: string;
  modelName: string;
  latencyMs: number;
  requestId?: string | null;
}): Promise<void> {
  const pool = await getAiPool();
  const [statsRows] = await pool.query<mysql.RowDataPacket[]>(
    `
    SELECT
      COUNT(CASE WHEN sender = 'USER' THEN 1 END) AS turn_count,
      ROUND(AVG(CASE WHEN sender = 'ASSISTANT' AND latency_ms IS NOT NULL THEN latency_ms END)) AS avg_latency
    FROM ai_diagnosis_messages
    WHERE session_id = ?
    `,
    [params.sessionId]
  );

  const row = (statsRows[0] || {}) as Record<string, unknown>;
  const turnCount = Number(row.turn_count || 1);
  const avgLatency = row.avg_latency != null ? Number(row.avg_latency) : Math.round(params.latencyMs);

  await pool.query(
    `
    UPDATE ai_diagnosis_sessions
    SET
      device_category = COALESCE(NULLIF(?, ''), device_category),
      problem_summary = COALESCE(ai_diagnosis_sessions.problem_summary, NULLIF(?, '')),
      ai_provider = ?,
      model_name = ?,
      avg_latency_ms = ?,
      request_id = COALESCE(?, request_id),
      turn_count = ?,
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    `,
    [
      params.deviceCategory || null,
      params.problemSummary ? params.problemSummary.slice(0, 600) : null,
      params.aiProvider,
      params.modelName,
      avgLatency,
      params.requestId || null,
      turnCount,
      params.sessionId,
    ]
  );
}

export async function getMediaRecordById(mediaId: string): Promise<{
  id: string;
  sessionId: string;
  messageId: string;
  mediaType: "IMAGE" | "VIDEO_KEYFRAME";
  mimeType: string;
  bytes: number;
  storagePath: string;
} | null> {
  const pool = await getAiPool();
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, session_id, message_id, media_type, mime_type, bytes, storage_path FROM ai_diagnosis_media WHERE id = ? LIMIT 1`,
    [mediaId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    sessionId: String(r.session_id),
    messageId: String(r.message_id),
    mediaType: r.media_type === "VIDEO_KEYFRAME" ? "VIDEO_KEYFRAME" : "IMAGE",
    mimeType: String(r.mime_type),
    bytes: Number(r.bytes),
    storagePath: String(r.storage_path),
  };
}

export async function getSessionDetail(sessionId: string): Promise<AiSessionDetail | null> {
  const pool = await getAiPool();
  const [sessRows] = await pool.query<mysql.RowDataPacket[]>(
    `
    SELECT s.*,
      (SELECT COUNT(*) FROM ai_diagnosis_media m WHERE m.session_id = s.id) AS media_count
    FROM ai_diagnosis_sessions s
    WHERE s.id = ?
    LIMIT 1
    `,
    [sessionId]
  );
  if (sessRows.length === 0) return null;
  const sr = sessRows[0];

  const [msgRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT * FROM ai_diagnosis_messages WHERE session_id = ? ORDER BY created_at ASC`,
    [sessionId]
  );

  const [mediaRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT * FROM ai_diagnosis_media WHERE session_id = ? ORDER BY created_at ASC, frame_timestamp_sec ASC`,
    [sessionId]
  );

  const mediaByMessage = new Map<string, AiMediaAttachmentView[]>();
  for (const mr of mediaRows) {
    const msgId = String(mr.message_id);
    const arr = mediaByMessage.get(msgId) || [];
    arr.push({
      id: String(mr.id),
      mediaType: mr.media_type === "VIDEO_KEYFRAME" ? "VIDEO_KEYFRAME" : "IMAGE",
      frameTimestampSec:
        mr.frame_timestamp_sec != null ? Number(mr.frame_timestamp_sec) : null,
      mimeType: String(mr.mime_type),
      bytes: Number(mr.bytes),
      url: `/api/ai/media/${encodeURIComponent(String(mr.id))}`,
      storagePath: String(mr.storage_path),
    });
    mediaByMessage.set(msgId, arr);
  }

  const messages: AiMessageView[] = msgRows.map((mr) => ({
    id: String(mr.id),
    sessionId: String(mr.session_id),
    sender: mr.sender === "ASSISTANT" ? "ASSISTANT" : "USER",
    contentText: String(mr.content_text || ""),
    structuredResponse: safeJsonParse<AiStructuredResponse | null>(
      mr.structured_response_json,
      null
    ),
    toolCalls: safeJsonParse<AiToolCallRecord[]>(mr.tool_calls_json, []),
    media: mediaByMessage.get(String(mr.id)) || [],
    aiProvider: mr.ai_provider ? String(mr.ai_provider) : null,
    modelName: mr.model_name ? String(mr.model_name) : null,
    requestId: mr.request_id ? String(mr.request_id) : null,
    latencyMs: mr.latency_ms != null ? Number(mr.latency_ms) : null,
    userFeedback:
      mr.user_feedback === "UP" || mr.user_feedback === "DOWN"
        ? (mr.user_feedback as AiFeedbackValue)
        : null,
    createdAt: toIsoString(mr.created_at),
  }));

  const session: AiSessionSummary = {
    id: String(sr.id),
    customerUserId: sr.customer_user_id ? String(sr.customer_user_id) : null,
    deviceCategory: sr.device_category ? String(sr.device_category) : null,
    problemSummary: sr.problem_summary ? String(sr.problem_summary) : null,
    aiProvider: String(sr.ai_provider || "GEMINI"),
    modelName: String(sr.model_name || "gemini-2.5-flash"),
    avgLatencyMs: sr.avg_latency_ms != null ? Number(sr.avg_latency_ms) : null,
    requestId: sr.request_id ? String(sr.request_id) : null,
    userFeedback:
      sr.user_feedback === "UP" || sr.user_feedback === "DOWN"
        ? (sr.user_feedback as AiFeedbackValue)
        : null,
    selectedServiceId: sr.selected_service_id ? String(sr.selected_service_id) : null,
    selectedProductId: sr.selected_product_id ? String(sr.selected_product_id) : null,
    turnCount: Number(sr.turn_count || 0),
    mediaCount: Number(sr.media_count || 0),
    createdAt: toIsoString(sr.created_at),
    updatedAt: toIsoString(sr.updated_at),
  };

  return { session, messages };
}

export async function recordDiagnosisFeedback(params: {
  sessionId: string;
  messageId?: string | null;
  feedback?: AiFeedbackValue | null;
  selectedServiceId?: string | null;
  selectedProductId?: string | null;
}): Promise<boolean> {
  const pool = await getAiPool();

  const [existing] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id FROM ai_diagnosis_sessions WHERE id = ? LIMIT 1`,
    [params.sessionId]
  );
  if (existing.length === 0) return false;

  if (params.messageId && params.feedback) {
    await pool.query(
      `UPDATE ai_diagnosis_messages SET user_feedback = ? WHERE id = ? AND session_id = ?`,
      [params.feedback, params.messageId, params.sessionId]
    );
  }

  await pool.query(
    `
    UPDATE ai_diagnosis_sessions
    SET
      user_feedback = COALESCE(?, user_feedback),
      selected_service_id = COALESCE(?, selected_service_id),
      selected_product_id = COALESCE(?, selected_product_id),
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    `,
    [
      params.feedback || null,
      params.selectedServiceId || null,
      params.selectedProductId || null,
      params.sessionId,
    ]
  );

  return true;
}

export async function listMonitoringSessions(filters?: {
  feedback?: string | null;
  hasMedia?: string | null;
  provider?: string | null;
  q?: string | null;
  limit?: number;
}): Promise<{
  kpis: AiMonitoringKpis;
  sessions: AiSessionSummary[];
}> {
  const pool = await getAiPool();

  const [kpiRows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT
      COUNT(*) AS total_sessions,
      COALESCE(SUM(turn_count), 0) AS total_turns,
      SUM(CASE WHEN user_feedback = 'UP' THEN 1 ELSE 0 END) AS up_count,
      SUM(CASE WHEN user_feedback = 'DOWN' THEN 1 ELSE 0 END) AS down_count,
      SUM(CASE WHEN selected_service_id IS NOT NULL OR selected_product_id IS NOT NULL THEN 1 ELSE 0 END) AS conversion_count,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM ai_diagnosis_media m WHERE m.session_id = s.id) THEN 1 ELSE 0 END) AS media_session_count,
      ROUND(AVG(avg_latency_ms)) AS avg_latency_ms
    FROM ai_diagnosis_sessions s
  `);

  const k = (kpiRows[0] || {}) as Record<string, unknown>;
  const kpis: AiMonitoringKpis = {
    totalSessions: Number(k.total_sessions || 0),
    totalTurns: Number(k.total_turns || 0),
    feedbackUpCount: Number(k.up_count || 0),
    feedbackDownCount: Number(k.down_count || 0),
    conversionCount: Number(k.conversion_count || 0),
    mediaSessionCount: Number(k.media_session_count || 0),
    avgLatencyMs: k.avg_latency_ms != null ? Number(k.avg_latency_ms) : null,
  };

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.feedback && filters.feedback !== "ALL") {
    if (filters.feedback === "NONE") {
      whereClauses.push("s.user_feedback IS NULL");
    } else {
      whereClauses.push("s.user_feedback = ?");
      params.push(filters.feedback.toUpperCase());
    }
  }

  if (filters?.provider && filters.provider !== "ALL") {
    whereClauses.push("s.ai_provider = ?");
    params.push(filters.provider.toUpperCase());
  }

  if (filters?.hasMedia === "YES") {
    whereClauses.push("EXISTS (SELECT 1 FROM ai_diagnosis_media m WHERE m.session_id = s.id)");
  } else if (filters?.hasMedia === "NO") {
    whereClauses.push("NOT EXISTS (SELECT 1 FROM ai_diagnosis_media m WHERE m.session_id = s.id)");
  }

  if (filters?.q && filters.q.trim()) {
    const like = `%${filters.q.trim()}%`;
    whereClauses.push(
      "(s.id LIKE ? OR s.problem_summary LIKE ? OR s.device_category LIKE ? OR s.request_id LIKE ?)"
    );
    params.push(like, like, like, like);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(Number(filters?.limit || 80), 1), 300);

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `
    SELECT s.*,
      (SELECT COUNT(*) FROM ai_diagnosis_media m WHERE m.session_id = s.id) AS media_count
    FROM ai_diagnosis_sessions s
    ${whereSql}
    ORDER BY s.updated_at DESC
    LIMIT ?
    `,
    [...params, limit]
  );

  const sessions: AiSessionSummary[] = rows.map((sr) => ({
    id: String(sr.id),
    customerUserId: sr.customer_user_id ? String(sr.customer_user_id) : null,
    deviceCategory: sr.device_category ? String(sr.device_category) : null,
    problemSummary: sr.problem_summary ? String(sr.problem_summary) : null,
    aiProvider: String(sr.ai_provider || "GEMINI"),
    modelName: String(sr.model_name || "gemini-2.5-flash"),
    avgLatencyMs: sr.avg_latency_ms != null ? Number(sr.avg_latency_ms) : null,
    requestId: sr.request_id ? String(sr.request_id) : null,
    userFeedback:
      sr.user_feedback === "UP" || sr.user_feedback === "DOWN"
        ? (sr.user_feedback as AiFeedbackValue)
        : null,
    selectedServiceId: sr.selected_service_id ? String(sr.selected_service_id) : null,
    selectedProductId: sr.selected_product_id ? String(sr.selected_product_id) : null,
    turnCount: Number(sr.turn_count || 0),
    mediaCount: Number(sr.media_count || 0),
    createdAt: toIsoString(sr.created_at),
    updatedAt: toIsoString(sr.updated_at),
  }));

  return { kpis, sessions };
}

export async function exportTrainingDatasetRows(options?: {
  feedback?: string | null;
  limit?: number;
}): Promise<Record<string, unknown>[]> {
  const { sessions } = await listMonitoringSessions({
    feedback: options?.feedback,
    limit: options?.limit || 300,
  });

  const records: Record<string, unknown>[] = [];
  for (const s of sessions) {
    const detail = await getSessionDetail(s.id);
    if (!detail) continue;

    records.push({
      session_id: detail.session.id,
      device_category: detail.session.deviceCategory,
      problem_summary: detail.session.problemSummary,
      ai_provider: detail.session.aiProvider,
      model_name: detail.session.modelName,
      user_feedback: detail.session.userFeedback,
      selected_service_id: detail.session.selectedServiceId,
      selected_product_id: detail.session.selectedProductId,
      created_at: detail.session.createdAt,
      turns: detail.messages.map((m) => ({
        role: m.sender === "ASSISTANT" ? "assistant" : "user",
        text: m.contentText,
        media: m.media.map((md) => ({
          id: md.id,
          type: md.mediaType,
          frame_timestamp_sec: md.frameTimestampSec,
          mime_type: md.mimeType,
          storage_path: md.storagePath,
        })),
        tool_calls: m.toolCalls,
        structured_output: m.structuredResponse,
        user_feedback: m.userFeedback,
        latency_ms: m.latencyMs,
      })),
    });
  }

  return records;
}
