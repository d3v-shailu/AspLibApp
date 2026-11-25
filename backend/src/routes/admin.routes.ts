import { Router, Request, Response } from "express";
import { pool, withTransaction } from "../config/db";
import { asyncHandler, AppError } from "../utils/errors";
import { authorize, tenantScope } from "../middleware/auth";
import { audit } from "../middleware/error";
import { hashPassword, generateDefaultPassword } from "../utils/password";
import {
  createSeatSchema,
  updateSeatSchema,
  createSlotSchema,
  updateSlotSchema,
  createStaffSchema,
  blockSchema,
  manualBookingSchema,
  geofenceSchema,
  parse,
} from "../utils/validation";
import { Row, SeatRow, SlotRow, UserRow } from "../types";

const router = Router();

// Every admin route: must be admin + scoped to own library
router.use(authorize("admin"), tenantScope);

// ---------------- SEATS ----------------

/** GET /seats */
router.get(
  "/seats",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<SeatRow>(
      `SELECT * FROM seats WHERE library_id = $1 ORDER BY seat_number`,
      [req.libraryId]
    );
    res.json({ seats: rows });
  })
);

/** POST /seats — { seat_number, zone?, seat_type? } */
router.post(
  "/seats",
  asyncHandler(async (req: Request, res: Response) => {
    const { seat_number, zone, seat_type } = parse(createSeatSchema, req.body);

    const { rows } = await pool.query<SeatRow>(
      `INSERT INTO seats (library_id, seat_number, zone, seat_type) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.libraryId, seat_number, zone ?? null, seat_type ?? "standard"]
    );
    res.status(201).json({ seat: rows[0] });
  })
);

/** PATCH /seats/:id — update zone/type/status (maintenance etc.) */
router.patch(
  "/seats/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { zone, seat_type, status } = parse(updateSeatSchema, req.body);
    const { rows } = await pool.query<SeatRow>(
      `UPDATE seats SET
         zone = COALESCE($1, zone),
         seat_type = COALESCE($2, seat_type),
         status = COALESCE($3, status)
       WHERE id = $4 AND library_id = $5 RETURNING *`,
      [zone ?? null, seat_type ?? null, status ?? null, req.params.id, req.libraryId]
    );
    if (!rows[0]) throw new AppError(404, "Seat not found");
    res.json({ seat: rows[0] });
  })
);

// ---------------- TIME SLOTS ----------------

/** GET /time-slots */
router.get(
  "/time-slots",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<SlotRow>(
      `SELECT * FROM time_slots WHERE library_id = $1 ORDER BY start_time`,
      [req.libraryId]
    );
    res.json({ time_slots: rows });
  })
);

/** POST /time-slots — { name, start_time, end_time, price? } */
router.post(
  "/time-slots",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, start_time, end_time, price } = parse(createSlotSchema, req.body);

    const { rows } = await pool.query<SlotRow>(
      `INSERT INTO time_slots (library_id, name, start_time, end_time, price) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.libraryId, name, start_time, end_time, price ?? 0]
    );
    res.status(201).json({ time_slot: rows[0] });
  })
);

/** PATCH /time-slots/:id */
router.patch(
  "/time-slots/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, start_time, end_time, price, is_active } = parse(updateSlotSchema, req.body);
    const { rows } = await pool.query<SlotRow>(
      `UPDATE time_slots SET
         name = COALESCE($1, name),
         start_time = COALESCE($2, start_time),
         end_time = COALESCE($3, end_time),
         price = COALESCE($4, price),
         is_active = COALESCE($5, is_active)
       WHERE id = $6 AND library_id = $7 RETURNING *`,
      [name ?? null, start_time ?? null, end_time ?? null, price ?? null, is_active ?? null, req.params.id, req.libraryId]
    );
    if (!rows[0]) throw new AppError(404, "Time slot not found");
    res.json({ time_slot: rows[0] });
  })
);

// ---------------- STUDENTS ----------------

/** POST /students — create student with default password + auto channel add */
router.post(
  "/students",
  asyncHandler(async (req: Request, res: Response) => {
    const body = parse(createStaffSchema, req.body);
    const { full_name, email, phone, gender } = body;

    const defaultPassword = generateDefaultPassword();
    const hash = await hashPassword(defaultPassword);

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query<UserRow>(
        `INSERT INTO users (email, phone, password_hash, role, library_id, full_name, gender, must_reset_password, created_by)
         VALUES ($1,$2,$3,'student',$4,$5,$6,true,$7) RETURNING *`,
        [email ?? null, phone ?? null, hash, req.libraryId, full_name, gender ?? null, req.user!.sub]
      );
      const student = rows[0];

      // NOTE: channel membership is computed from gender at read time
      // (see channels access rule) — no join table needed.
      return student;
    });

    await audit(req.user!.sub, req.libraryId!, "student.create", "user", result.id);
    res.status(201).json({
      student: { ...result, password_hash: undefined },
      default_password: defaultPassword,
    });
  })
);

/** GET /students */
router.get(
  "/students",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(
      `SELECT id, email, phone, full_name, gender, status, must_reset_password, created_at
       FROM users WHERE library_id = $1 AND role = 'student' ORDER BY created_at DESC`,
      [req.libraryId]
    );
    res.json({ students: rows });
  })
);

/** PATCH /students/:id/block — block/unblock (body: { blocked: true|false }) */
router.patch(
  "/students/:id/block",
  asyncHandler(async (req: Request, res: Response) => {
    const { blocked } = parse(blockSchema, req.body);
    const status = blocked ? "blocked" : "active";

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query<UserRow>(
        `UPDATE users SET status = $1 WHERE id = $2 AND library_id = $3 AND role = 'student' RETURNING *`,
        [status, req.params.id, req.libraryId]
      );
      if (!rows[0]) throw new AppError(404, "Student not found");

      if (blocked) {
        // cancel future bookings of the blocked student
        await client.query(
          `UPDATE bookings SET status = 'cancelled'
           WHERE student_id = $1 AND status IN ('booked','checked_in') AND booking_date >= CURRENT_DATE`,
          [req.params.id]
        );
      }
      return rows[0];
    });

    await audit(req.user!.sub, req.libraryId!, blocked ? "student.block" : "student.unblock", "user", req.params.id);
    res.json({ student: { ...result, password_hash: undefined } });
  })
);

// ---------------- BOOKINGS (admin view + manual) ----------------

/** GET /bookings?date=YYYY-MM-DD */
router.get(
  "/bookings",
  asyncHandler(async (req: Request, res: Response) => {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query<Row>(
      `SELECT b.*, u.full_name AS student_name, s.seat_number, t.name AS slot_name
       FROM bookings b
       JOIN users u ON u.id = b.student_id
       JOIN seats s ON s.id = b.seat_id
       JOIN time_slots t ON t.id = b.slot_id
       WHERE b.library_id = $1 AND b.booking_date = $2
       ORDER BY t.start_time, s.seat_number`,
      [req.libraryId, date]
    );
    res.json({ bookings: rows });
  })
);

/** POST /bookings/manual — admin books on behalf of a student (audit-logged) */
router.post(
  "/bookings/manual",
  asyncHandler(async (req: Request, res: Response) => {
    const { student_id, seat_id, slot_id, booking_date } = parse(manualBookingSchema, req.body);

    // student must belong to this library
    const student = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND library_id = $2 AND role = 'student'`,
      [student_id, req.libraryId]
    );
    if (!student.rows[0]) throw new AppError(404, "Student not found in your library");

    const { rows } = await pool.query<Row>(
      `INSERT INTO bookings (library_id, student_id, seat_id, slot_id, booking_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.libraryId, student_id, seat_id, slot_id, booking_date]
    );

    await audit(req.user!.sub, req.libraryId!, "booking.manual", "booking", rows[0].id, { student_id, seat_id, slot_id });
    res.status(201).json({ booking: rows[0] });
  })
);

// ---------------- REPORTS ----------------

/** GET /reports/occupancy?date= */
router.get(
  "/reports/occupancy",
  asyncHandler(async (req: Request, res: Response) => {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query<Row>(
      `SELECT
         (SELECT COUNT(*) FROM seats WHERE library_id = $1 AND status = 'available') AS total_seats,
         COUNT(b.id) FILTER (WHERE b.status IN ('booked','checked_in'))               AS booked,
         COUNT(b.id) FILTER (WHERE b.status = 'checked_in')                           AS checked_in,
         COUNT(b.id) FILTER (WHERE b.status = 'no_show')                              AS no_shows,
         COUNT(b.id) FILTER (WHERE b.status = 'completed')                            AS completed
       FROM bookings b
       WHERE b.library_id = $1 AND b.booking_date = $2`,
      [req.libraryId, date]
    );
    const r = rows[0];
    const total = parseInt(r.total_seats, 10) || 0;
    const booked = parseInt(r.booked, 10) || 0;
    res.json({
      date,
      total_seats: total,
      booked,
      checked_in: r.checked_in,
      no_shows: r.no_shows,
      completed: r.completed,
      occupancy_percent: total > 0 ? Math.round((booked / total) * 100) : 0,
    });
  })
);

// ---------------- GEOFENCE ----------------

/** PATCH /libraries/geofence — { latitude, longitude, radius_meters } */
router.patch(
  "/libraries/geofence",
  asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius_meters } = parse(geofenceSchema, req.body);

    const { rows } = await pool.query<Row>(
      `UPDATE libraries SET latitude = $1, longitude = $2,
         radius_meters = COALESCE($3, radius_meters)
       WHERE id = $4 RETURNING latitude, longitude, radius_meters`,
      [latitude, longitude, radius_meters ?? null, req.libraryId]
    );
    if (!rows[0]) throw new AppError(404, "Library not found");

    await audit(req.user!.sub, req.libraryId!, "geofence.update", "library", req.libraryId!, { latitude, longitude, radius_meters });
    res.json({ geofence: rows[0] });
  })
);

// ---------------- CHAT (moderation) ----------------

/** GET /channels — all channels of the library (both genders) */
router.get(
  "/channels",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(
      `SELECT c.*, (SELECT COUNT(*) FROM users u
                     WHERE u.library_id = c.library_id AND u.gender = c.gender) AS member_count
       FROM chat_channels c WHERE c.library_id = $1 ORDER BY c.name`,
      [req.libraryId]
    );
    res.json({ channels: rows });
  })
);

/** GET /channels/:id/messages */
router.get(
  "/channels/:id/messages",
  asyncHandler(async (req: Request, res: Response) => {
    const channel = await pool.query<Row>(
      `SELECT id FROM chat_channels WHERE id = $1 AND library_id = $2`,
      [req.params.id, req.libraryId]
    );
    if (!channel.rows[0]) throw new AppError(404, "Channel not found");

    const { rows } = await pool.query<Row>(
      `SELECT m.*, u.full_name AS sender_name
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.channel_id = $1 ORDER BY m.created_at DESC LIMIT 200`,
      [req.params.id]
    );
    res.json({ messages: rows });
  })
);

/** DELETE /channels/:id/messages/:messageId — moderation (audit-logged) */
router.delete(
  "/channels/:id/messages/:messageId",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(
      `DELETE FROM chat_messages
       WHERE id = $1 AND channel_id = $2
         AND channel_id IN (SELECT id FROM chat_channels WHERE library_id = $3)
       RETURNING id, sender_id`,
      [req.params.messageId, req.params.id, req.libraryId]
    );
    if (!rows[0]) throw new AppError(404, "Message not found");

    await audit(req.user!.sub, req.libraryId!, "chat.message.delete", "chat_message", req.params.messageId, {
      sender_id: rows[0].sender_id,
    });
    res.json({ ok: true });
  })
);

// ---------------- WAITLIST (admin view) ----------------

/** GET /waitlist?date= — waitlist entries for the library */
router.get(
  "/waitlist",
  asyncHandler(async (req: Request, res: Response) => {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query<Row>(
      `SELECT w.*, u.full_name AS student_name, t.name AS slot_name
       FROM waitlist w
       JOIN users u ON u.id = w.student_id
       JOIN time_slots t ON t.id = w.slot_id
       WHERE w.library_id = $1 AND w.booking_date = $2
       ORDER BY t.start_time, w.created_at`,
      [req.libraryId, date]
    );
    res.json({ waitlist: rows });
  })
);

export default router;
