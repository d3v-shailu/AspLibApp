import cron from "node-cron";
import { pool } from "../config/db";

/**
 * Late check-in auto-release:
 * Any booking still 'booked' whose slot started more than
 * checkin_grace_minutes ago becomes 'no_show' and frees the seat.
 * Runs every 5 minutes.
 */
export function startNoShowCron() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const { rows } = await pool.query<{ id: string }>(
        `UPDATE bookings b SET status = 'no_show'
         FROM time_slots t, libraries l
         WHERE b.slot_id = t.id
           AND b.library_id = l.id
           AND b.booking_date = CURRENT_DATE
           AND b.status = 'booked'
           AND (CURRENT_TIME::text > t.start_time::text)
           AND (now() - (CURRENT_DATE + t.start_time)) > make_interval(mins => l.checkin_grace_minutes)
         RETURNING b.id`
      );
      if (rows.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[cron] marked ${rows.length} booking(s) as no_show`);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[cron] no-show job failed", e);
    }
  });
}
