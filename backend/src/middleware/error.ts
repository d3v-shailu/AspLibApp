import { NextFunction, Request, Response } from "express";
import { pool } from "../config/db";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const status = (err as { status?: number })?.status || 500;
  const message =
    status === 500 ? "Internal server error" : (err as Error).message || "Request failed";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.path}`, err);
  }

  // Postgres unique violation → friendly double-booking message
  const pgCode = (err as { code?: string })?.code;
  if (pgCode === "23505") {
    return res.status(409).json({ error: "Seat already booked for this slot and date" });
  }

  res.status(status).json({ error: message });
}

/** Write an audit log entry (best-effort — never blocks the request). */
export async function audit(
  actorId: string | null,
  libraryId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_id, library_id, action, target_type, target_id, details)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [actorId, libraryId, action, targetType ?? null, targetId ?? null, details ?? null]
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write audit log", e);
  }
}
