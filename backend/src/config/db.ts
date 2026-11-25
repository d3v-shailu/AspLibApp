import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";

// Direct Postgres pool over Supabase's session pooler.
// This bypasses RLS (like service_role) — all tenancy checks are
// enforced in the API layer via tenantScope middleware.
export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  max: 10,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
