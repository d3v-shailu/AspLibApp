import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** System-generated default password, e.g. "Lib@A7F3C9" */
export function generateDefaultPassword(): string {
  return "Lib@" + crypto.randomBytes(3).toString("hex").toUpperCase();
}
