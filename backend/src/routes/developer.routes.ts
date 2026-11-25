import { Router, Request, Response } from "express";
import { pool, withTransaction } from "../config/db";
import { asyncHandler, AppError } from "../utils/errors";
import { authorize } from "../middleware/auth";
import { audit } from "../middleware/error";
import { hashPassword, generateDefaultPassword } from "../utils/password";
import { createLibrarySchema, updateLibrarySchema, createStaffSchema, parse } from "../utils/validation";
import { LibraryRow, Row, UserRow } from "../types";

const router = Router();

// All developer routes require role=developer
router.use(authorize("developer"));

const MAX_LIBRARIES = 50;

/** Auto-create the gendered chat channels for a library. */
async function createGenderChannels(client: import("pg").PoolClient, libraryId: string, name: string) {
  await client.query(
    `INSERT INTO chat_channels (library_id, name, gender) VALUES ($1, $2, 'male'), ($1, $3, 'female')`,
    [libraryId, `${name} (Male)`, `${name} (Female)`]
  );
}

/** POST /libraries — create library (enforces the 50-library cap) */
router.post(
  "/libraries",
  asyncHandler(async (req: Request, res: Response) => {
    const body = parse(createLibrarySchema, req.body);
    const { name, address, phone, latitude, longitude, radius_meters } = body;

    const { rows: countRows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM libraries WHERE status != 'archived'`
    );
    if (parseInt(countRows[0].count, 10) >= MAX_LIBRARIES) {
      throw new AppError(409, `Library cap reached (${MAX_LIBRARIES})`);
    }

    const library = await withTransaction(async (client) => {
      const { rows } = await client.query<LibraryRow>(
        `INSERT INTO libraries (name, address, phone, created_by, latitude, longitude, radius_meters)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [name, address ?? null, phone ?? null, req.user!.sub, latitude ?? null, longitude ?? null, radius_meters ?? 100]
      );
      await createGenderChannels(client, rows[0].id, name);
      return rows[0];
    });

    await audit(req.user!.sub, library.id, "library.create", "library", library.id);
    res.status(201).json({ library });
  })
);

/** GET /libraries — all libraries + basic stats */
router.get(
  "/libraries",
  asyncHandler(async (_req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(`
      SELECT l.*,
             (SELECT COUNT(*) FROM users u WHERE u.library_id = l.id AND u.role = 'student') AS student_count,
             (SELECT COUNT(*) FROM seats s WHERE s.library_id = l.id) AS seat_count,
             (SELECT COUNT(*) FROM bookings b
               WHERE b.library_id = l.id AND b.booking_date = CURRENT_DATE
                 AND b.status IN ('booked','checked_in')) AS today_active_bookings
      FROM libraries l
      WHERE l.status != 'archived'
      ORDER BY l.created_at DESC
    `);
    res.json({ libraries: rows });
  })
);

/** PATCH /libraries/:id — suspend / activate / update geofence */
router.patch(
  "/libraries/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = parse(updateLibrarySchema, req.body);
    const { name, address, phone, status, latitude, longitude, radius_meters } = body;

    const { rows } = await pool.query<LibraryRow>(
      `UPDATE libraries SET
         name = COALESCE($1, name),
         address = COALESCE($2, address),
         phone = COALESCE($3, phone),
         status = COALESCE($4, status),
         latitude = COALESCE($5, latitude),
         longitude = COALESCE($6, longitude),
         radius_meters = COALESCE($7, radius_meters)
       WHERE id = $8 RETURNING *`,
      [name ?? null, address ?? null, phone ?? null, status ?? null, latitude ?? null, longitude ?? null, radius_meters ?? null, id]
    );
    if (!rows[0]) throw new AppError(404, "Library not found");

    await audit(req.user!.sub, id, "library.update", "library", id, { status });
    res.json({ library: rows[0] });
  })
);

/** POST /libraries/:id/admins — create admin with default password */
router.post(
  "/libraries/:id/admins",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = parse(createStaffSchema, req.body);
    const { full_name, email, phone, gender } = body;

    const lib = await pool.query(`SELECT id FROM libraries WHERE id = $1 AND status = 'active'`, [id]);
    if (!lib.rows[0]) throw new AppError(404, "Library not found or not active");

    const defaultPassword = generateDefaultPassword();
    const hash = await hashPassword(defaultPassword);

    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (email, phone, password_hash, role, library_id, full_name, gender, must_reset_password, created_by)
       VALUES ($1,$2,$3,'admin',$4,$5,$6,true,$7) RETURNING *`,
      [email ?? null, phone ?? null, hash, id, full_name, gender ?? null, req.user!.sub]
    );

    await audit(req.user!.sub, id, "admin.create", "user", rows[0].id);
    // NOTE: in production, send credentials via SMS/WhatsApp/Email instead of returning them.
    res.status(201).json({ admin: { ...rows[0], password_hash: undefined }, default_password: defaultPassword });
  })
);

/** GET /analytics/global — platform-wide stats */
router.get(
  "/analytics/global",
  asyncHandler(async (_req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(`
      SELECT
        (SELECT COUNT(*) FROM libraries WHERE status = 'active')          AS active_libraries,
        (SELECT COUNT(*) FROM users   WHERE role = 'admin')               AS admin_count,
        (SELECT COUNT(*) FROM users   WHERE role = 'student')             AS student_count,
        (SELECT COUNT(*) FROM bookings WHERE booking_date = CURRENT_DATE) AS bookings_today,
        (SELECT COUNT(*) FROM bookings WHERE booking_date = CURRENT_DATE
           AND status = 'checked_in')                                     AS checked_in_now,
        (SELECT COUNT(*) FROM bookings WHERE status = 'no_show')          AS total_no_shows
    `);
    res.json({ stats: rows[0] });
  })
);

export default router;
