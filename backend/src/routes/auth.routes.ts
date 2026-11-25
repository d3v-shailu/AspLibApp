import { Router, Request, Response } from "express";
import { pool } from "../config/db";
import { asyncHandler, AppError } from "../utils/errors";
import { authenticate } from "../middleware/auth";
import { verifyPassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { loginSchema, resetPasswordSchema, parse } from "../utils/validation";
import { UserRow } from "../types";

const router = Router();

/**
 * POST /auth/login
 * body: { identifier: email-or-phone, password }
 * → token + role + must_reset_password
 */
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const body = parse(loginSchema, req.body);
    const { identifier, password } = body;
    if (!identifier || !password) throw new AppError(400, "identifier and password are required");

    const { rows } = await pool.query<UserRow>(
      `SELECT * FROM users WHERE (email = $1 OR phone = $1) LIMIT 1`,
      [identifier.trim()]
    );
    const user = rows[0];
    if (!user) throw new AppError(401, "Invalid credentials");
    if (user.status === "blocked") throw new AppError(403, "Account is blocked");

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new AppError(401, "Invalid credentials");

    const token = signToken({
      sub: user.id,
      role: user.role,
      library_id: user.library_id,
      must_reset_password: user.must_reset_password,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        library_id: user.library_id,
        full_name: user.full_name,
        gender: user.gender,
        must_reset_password: user.must_reset_password,
      },
    });
  })
);

/**
 * POST /auth/reset-password
 * The ONLY endpoint reachable while must_reset_password = true.
 * body: { newPassword }
 */
router.post(
  "/reset-password",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError(401, "Authentication required");
    const { newPassword } = parse(resetPasswordSchema, req.body);

    const hash = await hashPassword(newPassword);
    await pool.query(
      `UPDATE users SET password_hash = $1, must_reset_password = false WHERE id = $2`,
      [hash, req.user.sub]
    );

    // re-issue token with must_reset_password cleared
    const token = signToken({
      sub: req.user.sub,
      role: req.user.role,
      library_id: req.user.library_id,
      must_reset_password: false,
    });

    res.json({ ok: true, token });
  })
);

export default router;
