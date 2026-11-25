import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { JwtPayload, getTokenFromRequest, verifyToken } from "../utils/jwt";
import { pool } from "../config/db";
import { Row } from "../types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
      libraryId?: string | null;
    }
  }
}

/** Load the live user row — blocks blocked users and picks up role changes. */
async function loadLiveUser(userId: string): Promise<Row | null> {
  const { rows } = await pool.query<Row>(
    `SELECT id, role, library_id, must_reset_password, status FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) return next(new AppError(401, "Authentication required"));

  const payload = verifyToken(token);
  const user = await loadLiveUser(payload.sub);
  if (!user) return next(new AppError(401, "Account no longer exists"));
  if (user.status === "blocked") return next(new AppError(403, "Account is blocked"));

  req.user = {
    sub: user.id,
    role: user.role,
    library_id: user.library_id,
    must_reset_password: user.must_reset_password,
  };
  next();
}

/** Force password reset on first login: only /auth/reset-password is allowed. */
export function enforcePasswordReset(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.must_reset_password && req.path !== "/reset-password") {
    return next(new AppError(403, "Password reset required before using the app"));
  }
  next();
}

export function authorize(...roles: Array<"developer" | "admin" | "student">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have permission for this action"));
    }
    next();
  };
}

/**
 * Inject req.libraryId for admins and verify students stay in their own
 * library. This is THE tenant-isolation guard — every admin query must
 * use req.libraryId, never a client-supplied library id.
 */
export function tenantScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, "Authentication required"));

  if (req.user.role === "admin") {
    if (!req.user.library_id) return next(new AppError(403, "Admin has no library assigned"));
    req.libraryId = req.user.library_id;
    return next();
  }

  if (req.user.role === "student") {
    if (!req.user.library_id) return next(new AppError(403, "Student has no library assigned"));
    req.libraryId = req.user.library_id;
    return next();
  }

  // developers are global — they pass an explicit :libraryId param where needed
  req.libraryId = (req.params.libraryId as string) || null;
  next();
}
