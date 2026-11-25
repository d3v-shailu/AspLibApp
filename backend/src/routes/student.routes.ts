import { Router, Request, Response } from "express";
import { pool, withTransaction } from "../config/db";
import { asyncHandler, AppError } from "../utils/errors";
import { authorize, tenantScope } from "../middleware/auth";
import { haversineMeters, MAX_GPS_ACCURACY } from "../utils/geo";
import { createBookingSchema, geoCheckSchema, waitlistSchema, messageSchema, parse } from "../utils/validation";
import { BookingRow, ChannelRow, Row, SeatRow, SlotRow } from "../types";

const router = Router();

// Students: scoped to their own library
router.use(authorize("student"), tenantScope);

/** GET /seats/available?date=&slot= — seat map with availability */
router.get(
  "/seats/available",
  asyncHandler(async (req: Request, res: Response) => {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const slotId = req.query.slot as string;
    if (!slotId) throw new AppError(400, "slot query param is required");

    // slot must belong to student's library
    const slot = await pool.query<SlotRow>(
      `SELECT * FROM time_slots WHERE id = $1 AND library_id = $2 AND is_active = true`,
      [slotId, req.libraryId]
    );
    if (!slot.rows[0]) throw new AppError(404, "Time slot not found");

    const { rows } = await pool.query<Row>(
      `SELECT s.id, s.seat_number, s.zone, s.seat_type, s.status,
              (b.id IS NOT NULL) AS is_booked
       FROM seats s
       LEFT JOIN bookings b
         ON b.seat_id = s.id AND b.slot_id = $1 AND b.booking_date = $2
            AND b.status IN ('booked','checked_in')
       WHERE s.library_id = $3
       ORDER BY s.seat_number`,
      [slotId, date, req.libraryId]
    );
    res.json({ date, slot_id: slotId, seats: rows });
  })
);

/** POST /bookings — { seat_id, slot_id, booking_date } */
router.post(
  "/bookings",
  asyncHandler(async (req: Request, res: Response) => {
    const { seat_id, slot_id, booking_date } = parse(createBookingSchema, req.body);

    const lib = await pool.query<{ advance_booking_days: number; status: string }>(
      `SELECT advance_booking_days, status FROM libraries WHERE id = $1 AND status = 'active'`,
      [req.libraryId]
    );
    if (!lib.rows[0]) throw new AppError(403, "Library is not active");
    const maxDays = lib.rows[0].advance_booking_days ?? 7;

    // advance booking limit
    const today = new Date();
    const max = new Date(today.getTime() + maxDays * 86400000);
    if (new Date(booking_date) > max) {
      throw new AppError(400, `Cannot book more than ${maxDays} days ahead`);
    }
    if (new Date(booking_date) < new Date(today.toISOString().slice(0, 10))) {
      throw new AppError(400, "Cannot book in the past");
    }

    // seat must belong to student's library and be available
    const seat = await pool.query<SeatRow>(
      `SELECT * FROM seats WHERE id = $1 AND library_id = $2 AND status = 'available'`,
      [seat_id, req.libraryId]
    );
    if (!seat.rows[0]) throw new AppError(404, "Seat not found or under maintenance");

    const slot = await pool.query<SlotRow>(
      `SELECT * FROM time_slots WHERE id = $1 AND library_id = $2 AND is_active = true`,
      [slot_id, req.libraryId]
    );
    if (!slot.rows[0]) throw new AppError(404, "Time slot not found");

    // reject overlapping active bookings for this student (covers adjacent/overlapping slots)
    const overlap = await pool.query<Row>(
      `SELECT 1 FROM bookings b
       JOIN time_slots t2 ON t2.id = b.slot_id
       WHERE b.student_id = $1 AND b.booking_date = $2
         AND b.status IN ('booked','checked_in')
         AND (t2.start_time, t2.end_time) OVERLAPS ($3::time, $4::time)
       LIMIT 1`,
      [req.user!.sub, booking_date, slot.rows[0].start_time, slot.rows[0].end_time]
    );
    if (overlap.rows[0]) throw new AppError(409, "You already have a booking overlapping this slot");

    const { rows } = await pool.query<BookingRow>(
      `INSERT INTO bookings (library_id, student_id, seat_id, slot_id, booking_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.libraryId, req.user!.sub, seat_id, slot_id, booking_date]
    );
    res.status(201).json({ booking: rows[0] });
    // double-booking races are rejected by uniq_active_booking (handled as 409 in errorHandler)
  })
);

/** GET /my/bookings — history */
router.get(
  "/my/bookings",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(
      `SELECT b.*, s.seat_number, t.name AS slot_name, t.start_time, t.end_time
       FROM bookings b
       JOIN seats s ON s.id = b.seat_id
       JOIN time_slots t ON t.id = b.slot_id
       WHERE b.student_id = $1
       ORDER BY b.booking_date DESC, t.start_time`,
      [req.user!.sub]
    );
    res.json({ bookings: rows });
  })
);

// ---------------- GEO CHECK-IN / CHECK-OUT ----------------

interface GeoBody {
  lat?: number;
  lng?: number;
  accuracy?: number;
}

async function logAttempt(
  bookingId: string,
  userId: string,
  kind: "checkin" | "checkout",
  geo: GeoBody,
  distance: number | null,
  inside: boolean,
  reason: string
) {
  await pool.query(
    `INSERT INTO checkin_attempts (booking_id, user_id, kind, lat, lng, accuracy, distance_m, inside, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [bookingId, userId, kind, geo.lat ?? null, geo.lng ?? null, geo.accuracy ?? null, distance, inside, reason]
  );
}

/** Validate check-in window: ±15 min around slot start. */
function withinCheckinWindow(slot: SlotRow, graceMinutes: number): boolean {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const start = new Date(`${today}T${slot.start_time}`);
  return Math.abs(now.getTime() - start.getTime()) <= graceMinutes * 60000;
}

async function loadBookingForStudent(req: Request): Promise<{ booking: BookingRow; slot: SlotRow; lib: Row }> {
  const { rows } = await pool.query<BookingRow>(
    `SELECT * FROM bookings WHERE id = $1 AND student_id = $2`,
    [req.params.id, req.user!.sub]
  );
  if (!rows[0]) throw new AppError(404, "Booking not found");
  const booking = rows[0];

  const slot = await pool.query<SlotRow>(`SELECT * FROM time_slots WHERE id = $1`, [booking.slot_id]);
  const lib = await pool.query<Row>(
    `SELECT latitude, longitude, radius_meters, checkin_grace_minutes FROM libraries WHERE id = $1`,
    [booking.library_id]
  );
  return { booking, slot: slot.rows[0], lib: lib.rows[0] };
}

/** POST /bookings/:id/check-in — geo-validated */
router.post(
  "/bookings/:id/check-in",
  asyncHandler(async (req: Request, res: Response) => {
    const geo = parse(geoCheckSchema, req.body);
    const { lat, lng, accuracy } = geo;
    if (lat == null || lng == null) throw new AppError(400, "Location required");

    const { booking, slot, lib } = await loadBookingForStudent(req);
    if (booking.status !== "booked") throw new AppError(400, "Booking not in bookable state");

    // check-in window
    const grace = Number(lib.checkin_grace_minutes ?? 15);
    if (!withinCheckinWindow(slot, grace)) {
      await logAttempt(booking.id, req.user!.sub, "checkin", req.body, null, false, "outside_window");
      throw new AppError(400, `Check-in only allowed ±${grace} min around slot start`);
    }

    // GPS quality gate
    if (accuracy != null && accuracy > MAX_GPS_ACCURACY) {
      await logAttempt(booking.id, req.user!.sub, "checkin", req.body, null, false, "weak_gps");
      throw new AppError(422, "GPS signal too weak. Move near a window and retry.");
    }

    // geofence configured?
    if (lib.latitude == null || lib.longitude == null) {
      throw new AppError(400, "Library geofence is not configured yet");
    }

    const distance = haversineMeters(lat, lng, Number(lib.latitude), Number(lib.longitude));
    const radius = Number(lib.radius_meters ?? 100);
    const inside = distance <= radius;

    await logAttempt(booking.id, req.user!.sub, "checkin", req.body, distance, inside, inside ? "ok" : "outside_fence");

    if (!inside) {
      return res.status(403).json({
        error: "You are not at the library",
        distance_meters: Math.round(distance),
        allowed_radius: radius,
      });
    }

    const { rows } = await pool.query<BookingRow>(
      `UPDATE bookings SET status = 'checked_in', check_in_at = now(),
         checkin_lat = $1, checkin_lng = $2, checkin_accuracy = $3,
         checkin_distance = $4, is_geofence_valid = true
       WHERE id = $5 RETURNING *`,
      [lat, lng, accuracy ?? null, distance, booking.id]
    );
    res.json({ ok: true, booking: rows[0], distance_meters: Math.round(distance) });
  })
);

/** POST /bookings/:id/check-out — geo-validated too */
router.post(
  "/bookings/:id/check-out",
  asyncHandler(async (req: Request, res: Response) => {
    const geo = parse(geoCheckSchema, req.body);
    const { lat, lng, accuracy } = geo;
    if (lat == null || lng == null) throw new AppError(400, "Location required");

    const { booking, lib } = await loadBookingForStudent(req);
    if (booking.status !== "checked_in") throw new AppError(400, "Booking is not checked in");

    if (lib.latitude == null || lib.longitude == null) {
      throw new AppError(400, "Library geofence is not configured yet");
    }

    const distance = haversineMeters(lat, lng, Number(lib.latitude), Number(lib.longitude));
    const radius = Number(lib.radius_meters ?? 100);
    const inside = distance <= radius;

    await logAttempt(booking.id, req.user!.sub, "checkout", req.body, distance, inside, inside ? "ok" : "outside_fence");

    if (!inside) {
      return res.status(403).json({
        error: "You are not at the library",
        distance_meters: Math.round(distance),
        allowed_radius: radius,
      });
    }

    const { rows } = await pool.query<BookingRow>(
      `UPDATE bookings SET status = 'completed', check_out_at = now(),
         checkout_lat = $1, checkout_lng = $2, checkout_distance = $3
       WHERE id = $4 RETURNING *`,
      [lat, lng, distance, booking.id]
    );
    res.json({ ok: true, booking: rows[0], distance_meters: Math.round(distance) });
  })
);

// ---------------- CANCEL / EXTEND ----------------

/** POST /bookings/:id/cancel — student cancels a not-yet-checked-in booking */
router.post(
  "/bookings/:id/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query<BookingRow>(
        `UPDATE bookings SET status = 'cancelled'
         WHERE id = $1 AND student_id = $2 AND status = 'booked'
         RETURNING *`,
        [req.params.id, req.user!.sub]
      );
      if (!rows[0]) throw new AppError(400, "Booking not found or cannot be cancelled (already checked in)");

      // notify the first waiting student for the same slot/date
      const wl = await client.query<Row>(
        `UPDATE waitlist SET status = 'notified'
         WHERE id = (
           SELECT id FROM waitlist
           WHERE slot_id = $1 AND booking_date = $2 AND status = 'waiting'
           ORDER BY created_at LIMIT 1
         )
         RETURNING student_id`,
        [rows[0].slot_id, rows[0].booking_date]
      );
      return { booking: rows[0], notified_student: wl.rows[0]?.student_id ?? null };
    });

    res.json({ ok: true, ...result });
  })
);

/** POST /bookings/:id/extend — book the SAME seat for the NEXT contiguous slot */
router.post(
  "/bookings/:id/extend",
  asyncHandler(async (req: Request, res: Response) => {
    const created = await withTransaction(async (client) => {
      // current booking + its slot
      const { rows: cur } = await client.query<BookingRow & { start_time: string; end_time: string }>(
        `SELECT b.*, t.start_time, t.end_time
         FROM bookings b JOIN time_slots t ON t.id = b.slot_id
         WHERE b.id = $1 AND b.student_id = $2
           AND b.status IN ('booked','checked_in')
           AND b.booking_date = CURRENT_DATE`,
        [req.params.id, req.user!.sub]
      );
      if (!cur[0]) throw new AppError(400, "Active booking for today not found");
      const current = cur[0];

      // next contiguous active slot in the same library
      const { rows: next } = await client.query<SlotRow>(
        `SELECT * FROM time_slots
         WHERE library_id = $1 AND is_active = true
           AND start_time = $2 AND end_time > start_time
         LIMIT 1`,
        [current.library_id, current.end_time]
      );
      if (!next[0]) throw new AppError(400, "No next slot available to extend into");

      // seat must still be free for the next slot
      const { rows: clash } = await client.query<Row>(
        `SELECT 1 FROM bookings
         WHERE seat_id = $1 AND slot_id = $2 AND booking_date = CURRENT_DATE
           AND status IN ('booked','checked_in') LIMIT 1`,
        [current.seat_id, next[0].id]
      );
      if (clash[0]) throw new AppError(409, "Seat is already booked for the next slot");

      const { rows } = await client.query<BookingRow>(
        `INSERT INTO bookings (library_id, student_id, seat_id, slot_id, booking_date)
         VALUES ($1,$2,$3,$4,CURRENT_DATE) RETURNING *`,
        [current.library_id, current.student_id, current.seat_id, next[0].id]
      );
      return rows[0];
    });

    res.status(201).json({ booking: created });
  })
);

// ---------------- WAITLIST ----------------

/** POST /waitlist — { slot_id, booking_date } join the waitlist for a full slot */
router.post(
  "/waitlist",
  asyncHandler(async (req: Request, res: Response) => {
    const { slot_id, booking_date } = parse(waitlistSchema, req.body);

    const slot = await pool.query<SlotRow>(
      `SELECT * FROM time_slots WHERE id = $1 AND library_id = $2 AND is_active = true`,
      [slot_id, req.libraryId]
    );
    if (!slot.rows[0]) throw new AppError(404, "Time slot not found");

    const { rows } = await pool.query<Row>(
      `INSERT INTO waitlist (library_id, student_id, slot_id, booking_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.libraryId, req.user!.sub, slot_id, booking_date]
    );
    res.status(201).json({ waitlist: rows[0] });
  })
);

/** GET /waitlist — my waitlist entries */
router.get(
  "/waitlist",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(
      `SELECT w.*, t.name AS slot_name, t.start_time, t.end_time
       FROM waitlist w JOIN time_slots t ON t.id = w.slot_id
       WHERE w.student_id = $1 ORDER BY w.booking_date, t.start_time`,
      [req.user!.sub]
    );
    res.json({ waitlist: rows });
  })
);

/** DELETE /waitlist/:id — leave the waitlist */
router.delete(
  "/waitlist/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query<Row>(
      `UPDATE waitlist SET status = 'cancelled'
       WHERE id = $1 AND student_id = $2 AND status IN ('waiting','notified') RETURNING *`,
      [req.params.id, req.user!.sub]
    );
    if (!rows[0]) throw new AppError(404, "Waitlist entry not found");
    res.json({ ok: true });
  })
);

// ---------------- CHANNELS ----------------

/** GET /channels — only channels this student is allowed to see */
router.get(
  "/channels",
  asyncHandler(async (req: Request, res: Response) => {
    const me = await pool.query<{ gender: string | null }>(`SELECT gender FROM users WHERE id = $1`, [req.user!.sub]);
    const gender = me.rows[0]?.gender;
    if (!gender) throw new AppError(400, "Your profile has no gender set — ask admin to fix it");

    const { rows } = await pool.query<ChannelRow>(
      `SELECT * FROM chat_channels
       WHERE library_id = $1 AND (gender = $2 OR gender = 'all')
       ORDER BY name`,
      [req.libraryId, gender]
    );
    res.json({ channels: rows });
  })
);

/** GET /channels/:id/messages */
router.get(
  "/channels/:id/messages",
  asyncHandler(async (req: Request, res: Response) => {
    const me = await pool.query<{ gender: string | null }>(`SELECT gender FROM users WHERE id = $1`, [req.user!.sub]);
    const gender = me.rows[0]?.gender;

    const channel = await pool.query<ChannelRow>(
      `SELECT * FROM chat_channels WHERE id = $1 AND library_id = $2 AND (gender = $3 OR gender = 'all')`,
      [req.params.id, req.libraryId, gender]
    );
    if (!channel.rows[0]) throw new AppError(403, "You cannot access this channel");

    const { rows } = await pool.query<Row>(
      `SELECT m.*, u.full_name AS sender_name
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.channel_id = $1 ORDER BY m.created_at ASC LIMIT 200`,
      [req.params.id]
    );
    res.json({ messages: rows });
  })
);

/** POST /channels/:id/messages — { message } */
router.post(
  "/channels/:id/messages",
  asyncHandler(async (req: Request, res: Response) => {
    const { message } = parse(messageSchema, req.body);
    if (!message?.trim()) throw new AppError(400, "message is required");

    const me = await pool.query<{ gender: string | null }>(`SELECT gender FROM users WHERE id = $1`, [req.user!.sub]);
    const gender = me.rows[0]?.gender;

    const channel = await pool.query<ChannelRow>(
      `SELECT * FROM chat_channels WHERE id = $1 AND library_id = $2 AND (gender = $3 OR gender = 'all')`,
      [req.params.id, req.libraryId, gender]
    );
    if (!channel.rows[0]) throw new AppError(403, "You cannot post in this channel");

    const { rows } = await pool.query<Row>(
      `INSERT INTO chat_messages (channel_id, sender_id, message) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user!.sub, message.trim()]
    );
    res.status(201).json({ message: rows[0] });
  })
);

export default router;
