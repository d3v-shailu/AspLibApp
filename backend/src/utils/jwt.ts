import { Request } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errors";

export interface JwtPayload {
  sub: string; // user id
  role: "developer" | "admin" | "student";
  library_id: string | null;
  must_reset_password: boolean;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    subject: payload.sub,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    return {
      sub: decoded.sub as string,
      role: decoded.role,
      library_id: decoded.library_id ?? null,
      must_reset_password: Boolean(decoded.must_reset_password),
    };
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}
