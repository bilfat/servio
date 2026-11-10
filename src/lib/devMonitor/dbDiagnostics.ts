import { queryDb } from "./db";
import { AuditDomain, MICROSERVICE_REGISTRY, MicroserviceSpec, ServiceId } from "./registry";

export interface UnifiedAuditRecord {
  id: string;
  serviceId: ServiceId;
  serviceName: string;
  domain: AuditDomain;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  result: string;
  reason: string | null;
  requestId: string | null;
  correlationId: string | null;
  metadata: unknown;
  occurredAt: string;
}

export interface UnifiedOutboxRecord {
  id: string;
  serviceId: ServiceId;
  serviceName: string;
  tableName: string;
  eventType: string;
  aggregateType: string | null;
  aggregateId: string | null;
  status: "PUBLISHED" | "PENDING" | "FAILED";
  rawStatus: string;
  attempts: number;
  lastError: string | null;
  correlationId: string | null;
  payload: unknown;
  createdAt: string;
  publishedAt: string | null;
}

export interface UnifiedInboxRecord {
  id: string;
  serviceId: ServiceId;
  serviceName: string;
  sourceService: string | null;
  eventType: string | null;
  sourceEventId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface UnifiedFailedJobRecord {
  id: string;
  uuid: string;
  serviceId: ServiceId;
  serviceName: string;
  queue: string;
  exception: string;
  payload: unknown;
  failedAt: string;
}

function safeParseJson(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

function toIsoString(val: unknown): string {
  if (!val) return new Date(0).toISOString();
  if (val instanceof Date) return val.toISOString();
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? String(val) : d.toISOString();
}

function buildAuditSqlForService(spec: MicroserviceSpec): { sql: string; searchCols: string[] } {
  switch (spec.id) {
    case "identity":
      return {
        sql: `SELECT id, actor_user_id, NULL AS actor_role, event_code AS action, target_type AS entity_type, target_id AS entity_id, result, NULL AS reason, request_id, NULL AS correlation_id, safe_metadata AS metadata, occurred_at FROM audit_logs`,
        searchCols: ["actor_user_id", "event_code", "target_type", "target_id", "result", "request_id"],
      };
    case "category":
      return {
        sql: `SELECT id, actor_user_id, actor_role, action, entity_type, entity_id, 'RECORDED' AS result, reason, request_id, correlation_id, new_safe_snapshot AS metadata, occurred_at FROM category_audit_logs`,
        searchCols: ["actor_user_id", "actor_role", "action", "entity_type", "entity_id", "reason", "request_id", "correlation_id"],
      };
    case "product":
      return {
        sql: `SELECT id, actor_user_id, actor_role, action, entity_type, entity_id, 'RECORDED' AS result, reason, request_id, correlation_id, after_safe AS metadata, occurred_at FROM product_audit_logs`,
        searchCols: ["product_id", "actor_user_id", "actor_role", "action", "entity_type", "entity_id", "reason", "request_id", "correlation_id"],
      };
    case "service":
      return {
        sql: `SELECT id, actor_user_id, actor_role, action, entity_type, entity_id, 'RECORDED' AS result, reason, request_id, NULL AS correlation_id, safe_after AS metadata, occurred_at FROM service_audit_logs`,
        searchCols: ["actor_user_id", "actor_role", "action", "entity_type", "entity_id", "offering_id", "reason", "request_id"],
      };
    case "order-barang":
      return {
        sql: `SELECT id, actor_id AS actor_user_id, actor_role, action, 'ORDER_BARANG' AS entity_type, order_id AS entity_id, result, NULL AS reason, NULL AS request_id, correlation_id, after_state AS metadata, occurred_at FROM order_audit_logs`,
        searchCols: ["order_id", "checkout_group_id", "actor_id", "actor_role", "action", "result", "correlation_id"],
      };
    case "finance":
      return {
        sql: `SELECT id, actor_user_id, actor_service AS actor_role, action, subject_type AS entity_type, subject_id AS entity_id, result, reason_code AS reason, NULL AS request_id, correlation_id, after_state AS metadata, created_at AS occurred_at FROM finance_audit_logs`,
        searchCols: ["actor_user_id", "actor_service", "action", "subject_type", "subject_id", "result", "reason_code", "correlation_id"],
      };
    case "order-jasa":
      return {
        sql: `SELECT id, actor AS actor_user_id, NULL AS actor_role, action, 'ORDER_JASA' AS entity_type, resource AS entity_id, 'RECORDED' AS result, reason, request_id, NULL AS correlation_id, new_version AS metadata, created_at AS occurred_at FROM order_audit_logs`,
        searchCols: ["actor", "action", "resource", "reason", "request_id"],
      };
    case "after-sales":
      return {
        sql: `SELECT id, actor_id AS actor_user_id, actor_kind AS actor_role, event_type AS action, 'AFTER_SALES_CASE' AS entity_type, case_id AS entity_id, COALESCE(to_state, 'RECORDED') AS result, reason, NULL AS request_id, NULL AS correlation_id, data_json AS metadata, occurred_at FROM case_events`,
        searchCols: ["case_id", "event_type", "from_state", "to_state", "actor_id", "actor_kind", "reason"],
      };
  }
}

export async function fetchUnifiedAudits(options?: {
  domain?: string | null;
  serviceId?: string | null;
  search?: string | null;
  limitPerService?: number;
  limitTotal?: number;
}): Promise<{
  records: UnifiedAuditRecord[];
  serviceErrors: Array<{ serviceId: ServiceId; error: string }>;
}> {
  let targetSpecs = MICROSERVICE_REGISTRY;
  if (options?.domain && options.domain !== "ALL") {
    targetSpecs = targetSpecs.filter((s) => s.domain === options.domain);
  }
  if (options?.serviceId && options.serviceId !== "ALL") {
    targetSpecs = targetSpecs.filter((s) => s.id === options.serviceId);
  }

  const perServiceLimit = Math.min(options?.limitPerService || 40, 100);
  const searchTerm = options?.search?.trim() || "";

  const settled = await Promise.all(
    targetSpecs.map(async (spec) => {
      const { sql, searchCols } = buildAuditSqlForService(spec);
      const orderByCol = spec.id === "finance" || spec.id === "order-jasa" ? "created_at" : "occurred_at";

      let fullSql = sql;
      const params: unknown[] = [];

      if (searchTerm) {
        const whereClause = searchCols.map((c) => `CAST(${c} AS CHAR) LIKE ?`).join(" OR ");
        fullSql += ` WHERE (${whereClause})`;
        const likeVal = `%${searchTerm}%`;
        for (let i = 0; i < searchCols.length; i++) params.push(likeVal);
      }

      fullSql += ` ORDER BY ${orderByCol} DESC LIMIT ${perServiceLimit}`;

      const res = await queryDb<Record<string, unknown>>(spec.dbName, fullSql, params);
      if (!res.ok) {
        return { spec, ok: false as const, error: res.error || "Database query failed", rows: [] };
      }
      return { spec, ok: true as const, rows: res.rows };
    })
  );

  const records: UnifiedAuditRecord[] = [];
  const serviceErrors: Array<{ serviceId: ServiceId; error: string }> = [];

  for (const item of settled) {
    if (!item.ok) {
      serviceErrors.push({ serviceId: item.spec.id, error: item.error });
      continue;
    }
    for (const r of item.rows) {
      records.push({
        id: `${item.spec.id}-${String(r.id)}`,
        serviceId: item.spec.id,
        serviceName: item.spec.shortName,
        domain: item.spec.domain,
        actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
        actorRole: r.actor_role ? String(r.actor_role) : null,
        action: String(r.action || "UNKNOWN_ACTION"),
        entityType: r.entity_type ? String(r.entity_type) : null,
        entityId: r.entity_id ? String(r.entity_id) : null,
        result: String(r.result || "RECORDED"),
        reason: r.reason ? String(r.reason) : null,
        requestId: r.request_id ? String(r.request_id) : null,
        correlationId: r.correlation_id ? String(r.correlation_id) : null,
        metadata: safeParseJson(r.metadata),
        occurredAt: toIsoString(r.occurred_at),
      });
    }
  }

  records.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return {
    records: records.slice(0, options?.limitTotal || 150),
    serviceErrors,
  };
}

function buildOutboxSqlForService(spec: MicroserviceSpec): string {
  switch (spec.id) {
    case "identity":
      return `SELECT id, event_type, aggregate_type, aggregate_id, CASE WHEN published_at IS NOT NULL THEN 'PUBLISHED' WHEN last_error IS NOT NULL AND last_error != '' THEN 'FAILED' ELSE 'PENDING' END AS norm_status, COALESCE(last_error, '') AS last_error, attempts, NULL AS correlation_id, payload_json AS payload, created_at, published_at FROM outbox_events`;
    case "category":
      return `SELECT id, event_type, aggregate_type, aggregate_id, CASE WHEN published_at IS NOT NULL THEN 'PUBLISHED' WHEN attempts >= 3 THEN 'FAILED' ELSE 'PENDING' END AS norm_status, '' AS last_error, attempts, correlation_id, payload, created_at, published_at FROM category_outbox_events`;
    case "product":
      return `SELECT id, event_type, 'PRODUCT' AS aggregate_type, product_id AS aggregate_id, CASE WHEN published_at IS NOT NULL THEN 'PUBLISHED' WHEN attempts >= 3 THEN 'FAILED' ELSE 'PENDING' END AS norm_status, '' AS last_error, attempts, correlation_id, payload, occurred_at AS created_at, published_at FROM product_outbox_events`;
    case "service":
      return `SELECT id, event_type, aggregate_type, aggregate_id, CASE WHEN published_at IS NOT NULL THEN 'PUBLISHED' WHEN attempts >= 3 THEN 'FAILED' ELSE 'PENDING' END AS norm_status, '' AS last_error, attempts, correlation_id, payload, created_at, published_at FROM service_outbox_events`;
    case "order-barang":
      return `SELECT id, event_type, aggregate_type, aggregate_id, status AS norm_status, COALESCE(last_error, '') AS last_error, attempt_count AS attempts, correlation_id, payload_json AS payload, created_at, sent_at AS published_at FROM integration_outbox_events`;
    case "finance":
      return `SELECT id, event_type, aggregate_type, aggregate_id, dispatch_status AS norm_status, '' AS last_error, attempts, NULL AS correlation_id, payload, created_at, published_at FROM outbox_events`;
    case "order-jasa":
      return `SELECT event_id AS id, event_type, aggregate_type, aggregate_id, status AS norm_status, '' AS last_error, attempts, NULL AS correlation_id, payload_json AS payload, created_at, delivered_at AS published_at FROM integration_outbox_events`;
    case "after-sales":
      return `SELECT event_id AS id, event_type, aggregate_type, aggregate_id, status AS norm_status, COALESCE(last_error, '') AS last_error, retry_count AS attempts, NULL AS correlation_id, payload, created_at, published_at FROM outbox_events`;
  }
}

function normalizeOutboxStatus(raw: string): "PUBLISHED" | "PENDING" | "FAILED" {
  const s = (raw || "").toUpperCase();
  if (s === "PUBLISHED" || s === "SENT" || s === "DELIVERED" || s === "DISPATCHED" || s === "COMPLETED") {
    return "PUBLISHED";
  }
  if (s === "FAILED" || s === "DEAD" || s === "DEAD_LETTER" || s === "ERROR" || s === "ABANDONED") {
    return "FAILED";
  }
  return "PENDING";
}

export async function fetchSyncAndQueueDiagnostics(options?: {
  serviceId?: string | null;
  statusFilter?: string | null;
  q?: string | null;
}) {
  const specs = options?.serviceId && options.serviceId !== "ALL"
    ? MICROSERVICE_REGISTRY.filter((s) => s.id === options.serviceId)
    : MICROSERVICE_REGISTRY;

  const outboxList: UnifiedOutboxRecord[] = [];
  const inboxList: UnifiedInboxRecord[] = [];
  const failedJobs: UnifiedFailedJobRecord[] = [];
  const serviceErrors: Array<{ serviceId: ServiceId; error: string }> = [];

  await Promise.all(
    specs.map(async (spec) => {
      // 1. Outbox query
      const outboxSql = `${buildOutboxSqlForService(spec)} ORDER BY ${
        spec.id === "product" ? "occurred_at" : "created_at"
      } DESC LIMIT 40`;
      const obRes = await queryDb<Record<string, unknown>>(spec.dbName, outboxSql);
      if (obRes.ok) {
        for (const r of obRes.rows) {
          const rawSt = String(r.norm_status || "PENDING");
          outboxList.push({
            id: `${spec.id}-ob-${String(r.id)}`,
            serviceId: spec.id,
            serviceName: spec.shortName,
            tableName: spec.outboxTable,
            eventType: String(r.event_type || ""),
            aggregateType: r.aggregate_type ? String(r.aggregate_type) : null,
            aggregateId: r.aggregate_id ? String(r.aggregate_id) : null,
            status: normalizeOutboxStatus(rawSt),
            rawStatus: rawSt,
            attempts: Number(r.attempts || 0),
            lastError: r.last_error && String(r.last_error).trim() ? String(r.last_error) : null,
            correlationId: r.correlation_id ? String(r.correlation_id) : null,
            payload: safeParseJson(r.payload),
            createdAt: toIsoString(r.created_at),
            publishedAt: r.published_at ? toIsoString(r.published_at) : null,
          });
        }
      } else {
        serviceErrors.push({ serviceId: spec.id, error: obRes.error || "Database query failed" });
      }

      // 2. Inbox query (where available)
      if (spec.inboxTable) {
        let inboxSql = "";
        if (spec.id === "identity") {
          inboxSql = `SELECT id, consumer_name AS source_service, source_event_id, NULL AS event_type, status, error_code AS err_msg, processed_at AS ts FROM inbox_consumptions ORDER BY created_at DESC LIMIT 25`;
        } else if (spec.id === "product") {
          inboxSql = `SELECT id, source_service, event_id AS source_event_id, NULL AS event_type, 'PROCESSED' AS status, NULL AS err_msg, processed_at AS ts FROM product_inbox_consumptions ORDER BY processed_at DESC LIMIT 25`;
        } else if (spec.id === "service") {
          inboxSql = `SELECT id, source_service, event_id AS source_event_id, NULL AS event_type, 'PROCESSED' AS status, NULL AS err_msg, processed_at AS ts FROM service_inbox_consumptions ORDER BY processed_at DESC LIMIT 25`;
        } else if (spec.id === "order-barang") {
          inboxSql = `SELECT id, source_service, source_event_id, event_type, status, last_error AS err_msg, created_at AS ts FROM integration_inbox_events ORDER BY created_at DESC LIMIT 25`;
        } else if (spec.id === "finance") {
          inboxSql = `SELECT id, source_service, source_event_id, event_type, status, failure_reason AS err_msg, received_at AS ts FROM inbox_events ORDER BY received_at DESC LIMIT 25`;
        } else if (spec.id === "order-jasa") {
          inboxSql = `SELECT id, producer AS source_service, source_event_id, event_type, processing_status AS status, last_error AS err_msg, received_at AS ts FROM integration_inbox_events ORDER BY received_at DESC LIMIT 25`;
        } else if (spec.id === "after-sales") {
          inboxSql = `SELECT event_id AS id, source_service, event_id AS source_event_id, event_type, status, error_message AS err_msg, created_at AS ts FROM inbox_events ORDER BY created_at DESC LIMIT 25`;
        }

        if (inboxSql) {
          const inRes = await queryDb<Record<string, unknown>>(spec.dbName, inboxSql);
          if (inRes.ok) {
            for (const r of inRes.rows) {
              inboxList.push({
                id: `${spec.id}-ib-${String(r.id)}`,
                serviceId: spec.id,
                serviceName: spec.shortName,
                sourceService: r.source_service ? String(r.source_service) : null,
                eventType: r.event_type ? String(r.event_type) : null,
                sourceEventId: r.source_event_id ? String(r.source_event_id) : null,
                status: String(r.status || "PROCESSED"),
                errorMessage: r.err_msg ? String(r.err_msg) : null,
                createdAt: toIsoString(r.ts),
              });
            }
          }
        }
      }

      // 3. failed_jobs check (gracefully skip if table doesn't exist in that DB)
      const fjCheck = await queryDb<{ Tables_in_db: string }>(spec.dbName, "SHOW TABLES LIKE 'failed_jobs'");
      if (fjCheck.ok && fjCheck.rows.length > 0) {
        const fjRes = await queryDb<Record<string, unknown>>(
          spec.dbName,
          `SELECT id, uuid, queue, exception, payload, failed_at FROM failed_jobs ORDER BY failed_at DESC LIMIT 20`
        );
        if (fjRes.ok) {
          for (const r of fjRes.rows) {
            failedJobs.push({
              id: `${spec.id}-fj-${String(r.id)}`,
              uuid: String(r.uuid || r.id),
              serviceId: spec.id,
              serviceName: spec.shortName,
              queue: String(r.queue || "default"),
              exception: String(r.exception || "").slice(0, 3000),
              payload: safeParseJson(r.payload),
              failedAt: toIsoString(r.failed_at),
            });
          }
        }
      }
    })
  );

  outboxList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  inboxList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  failedJobs.sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());

  const nowMs = Date.now();
  const stuckThresholdMs = 60_000;
  const stats = {
    totalOutbox: outboxList.length,
    publishedCount: outboxList.filter((o) => o.status === "PUBLISHED").length,
    pendingCount: outboxList.filter((o) => o.status === "PENDING").length,
    stuckCount: outboxList.filter(
      (o) => o.status === "PENDING" && nowMs - new Date(o.createdAt).getTime() > stuckThresholdMs
    ).length,
    failedOutboxCount: outboxList.filter((o) => o.status === "FAILED").length,
    failedInboxCount: inboxList.filter((i) =>
      ["FAILED", "ERROR", "DEAD"].includes(i.status.toUpperCase()) || Boolean(i.errorMessage)
    ).length,
    failedJobsCount: failedJobs.length,
  };

  let filteredOutbox = outboxList;
  if (options?.statusFilter && options.statusFilter !== "ALL") {
    filteredOutbox = filteredOutbox.filter((o) => o.status === options.statusFilter);
  }
  if (options?.q && options.q.trim()) {
    const q = options.q.trim().toLowerCase();
    filteredOutbox = filteredOutbox.filter(
      (o) =>
        o.eventType.toLowerCase().includes(q) ||
        (o.aggregateId && o.aggregateId.toLowerCase().includes(q)) ||
        (o.correlationId && o.correlationId.toLowerCase().includes(q)) ||
        (o.lastError && o.lastError.toLowerCase().includes(q))
    );
  }

  return {
    outbox: filteredOutbox.slice(0, 120),
    inbox: inboxList.slice(0, 100),
    failedJobs,
    stats,
    serviceErrors,
  };
}

export async function resolveRelatedEntityIds(rawQuery: string): Promise<{
  searchTerms: string[];
  resolvedOrderJasa: Record<string, unknown> | null;
  resolvedOrderBarang: Record<string, unknown> | null;
  resolvedCase: Record<string, unknown> | null;
}> {
  const q = rawQuery.trim();
  const terms = new Set<string>([q]);
  let resolvedOrderJasa: Record<string, unknown> | null = null;
  let resolvedOrderBarang: Record<string, unknown> | null = null;
  let resolvedCase: Record<string, unknown> | null = null;

  const [ojRes, obRes, asRes] = await Promise.all([
    queryDb<Record<string, unknown>>(
      "servio_order_jasa_db",
      `SELECT id, order_no, customer_id, provider_org_id, status, phase, created_at, updated_at FROM service_orders WHERE id = ? OR order_no = ? LIMIT 1`,
      [q, q]
    ),
    queryDb<Record<string, unknown>>(
      "servio_order_barang_db",
      `SELECT id, order_number AS order_no, checkout_group_id, customer_id, merchant_org_id, status, created_at, updated_at FROM orders WHERE id = ? OR order_number = ? OR checkout_group_id = ? LIMIT 1`,
      [q, q, q]
    ),
    queryDb<Record<string, unknown>>(
      "servio_after_sales_db",
      `SELECT id, case_number, source_order_kind AS order_type, source_order_id AS external_order_id, source_merchant_order_id, customer_id, main_status AS state, substate, created_at FROM after_sales_cases WHERE id = ? OR case_number = ? OR source_order_id = ? OR source_merchant_order_id = ? LIMIT 1`,
      [q, q, q, q]
    ),
  ]);

  if (ojRes.ok && ojRes.rows.length > 0) {
    resolvedOrderJasa = ojRes.rows[0];
    if (resolvedOrderJasa.id) terms.add(String(resolvedOrderJasa.id));
    if (resolvedOrderJasa.order_no) terms.add(String(resolvedOrderJasa.order_no));
  }
  if (obRes.ok && obRes.rows.length > 0) {
    resolvedOrderBarang = obRes.rows[0];
    if (resolvedOrderBarang.id) terms.add(String(resolvedOrderBarang.id));
    if (resolvedOrderBarang.order_no) terms.add(String(resolvedOrderBarang.order_no));
    if (resolvedOrderBarang.checkout_group_id) terms.add(String(resolvedOrderBarang.checkout_group_id));
  }
  if (asRes.ok && asRes.rows.length > 0) {
    resolvedCase = asRes.rows[0];
    if (resolvedCase.id) terms.add(String(resolvedCase.id));
    if (resolvedCase.case_number) terms.add(String(resolvedCase.case_number));
    if (resolvedCase.external_order_id) terms.add(String(resolvedCase.external_order_id));
    if (resolvedCase.source_merchant_order_id) terms.add(String(resolvedCase.source_merchant_order_id));
  }

  return {
    searchTerms: Array.from(terms).filter(Boolean),
    resolvedOrderJasa,
    resolvedOrderBarang,
    resolvedCase,
  };
}

