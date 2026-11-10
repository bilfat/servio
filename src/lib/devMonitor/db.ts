import mysql from "mysql2/promise";

const globalForMysql = globalThis as unknown as {
  __servioDevPools?: Map<string, mysql.Pool>;
};

function getPoolMap(): Map<string, mysql.Pool> {
  if (!globalForMysql.__servioDevPools) {
    globalForMysql.__servioDevPools = new Map<string, mysql.Pool>();
  }
  return globalForMysql.__servioDevPools;
}

export function getMysqlConfig() {
  return {
    host: process.env.DEV_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.DEV_MYSQL_PORT || 3306),
    user: process.env.DEV_MYSQL_USER || "root",
    password: process.env.DEV_MYSQL_PASSWORD ?? "",
  };
}

export function getDbPool(database: string): mysql.Pool {
  const pools = getPoolMap();
  const existing = pools.get(database);
  if (existing) return existing;

  const cfg = getMysqlConfig();
  const pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database,
    waitForConnections: true,
    connectionLimit: 3,
    connectTimeout: 1500,
    enableKeepAlive: false,
  });

  pools.set(database, pool);
  return pool;
}

export interface DbQueryResult<T = Record<string, unknown>> {
  ok: boolean;
  rows: T[];
  error?: string;
}

export async function queryDb<T = Record<string, unknown>>(
  database: string,
  sql: string,
  params: unknown[] = []
): Promise<DbQueryResult<T>> {
  try {
    const pool = getDbPool(database);
    const [rows] = await pool.query(sql, params);
    return { ok: true, rows: (Array.isArray(rows) ? rows : []) as T[] };
  } catch (err: unknown) {
    return {
      ok: false,
      rows: [],
      error: err instanceof Error ? err.message : "Database query failed",
    };
  }
}

export async function checkDbHealth(database: string): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startedAt = Date.now();
  const res = await queryDb(database, "SELECT 1 AS ok");
  const latencyMs = Date.now() - startedAt;
  if (res.ok) {
    return { connected: true, latencyMs };
  }
  return { connected: false, latencyMs, error: res.error };
}

