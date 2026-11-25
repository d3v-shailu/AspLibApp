import { z } from "zod";
import { AppError } from "./errors";

/** Parse & validate input; throws a 400 with a readable message. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): T["_output"] {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first.path.length ? `${first.path.join(".")}: ` : "";
    throw new AppError(400, `${path}${first.message}`);
  }
  return result.data;
}

const uuid = z.string().uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");
const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "must be HH:MM or HH:MM:SS");

// ---------------- AUTH ----------------
export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "must be at least 8 characters"),
});

// ---------------- DEVELOPER ----------------
export const createLibrarySchema = z.object({
  name: z.string().min(1).max(150),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_meters: z.number().int().positive().max(5000).optional(),
});

export const updateLibrarySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(["active", "suspended", "archived"]).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_meters: z.number().int().positive().max(5000).optional(),
});

export const createStaffSchema = z
  .object({
    full_name: z.string().min(1).max(150),
    email: z.string().email().optional(),
    phone: z.string().min(5).max(20).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
  })
  .refine((v) => v.email || v.phone, { message: "email or phone is required" });

// ---------------- ADMIN ----------------
export const createSeatSchema = z.object({
  seat_number: z.string().min(1).max(20),
  zone: z.string().max(50).optional(),
  seat_type: z.enum(["standard", "premium", "quiet"]).optional(),
});

export const updateSeatSchema = z.object({
  zone: z.string().max(50).optional(),
  seat_type: z.enum(["standard", "premium", "quiet"]).optional(),
  status: z.enum(["available", "maintenance"]).optional(),
});

export const createSlotSchema = z
  .object({
    name: z.string().min(1).max(50),
    start_time: timeStr,
    end_time: timeStr,
    price: z.number().min(0).optional(),
  })
  .refine((v) => v.end_time > v.start_time, { message: "end_time must be after start_time" });

export const updateSlotSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  start_time: timeStr.optional(),
  end_time: timeStr.optional(),
  price: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const blockSchema = z.object({ blocked: z.boolean() });

export const manualBookingSchema = z.object({
  student_id: uuid,
  seat_id: uuid,
  slot_id: uuid,
  booking_date: dateStr,
});

export const geofenceSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meters: z.number().int().positive().max(5000).optional(),
});

// ---------------- STUDENT ----------------
export const createBookingSchema = z.object({
  seat_id: uuid,
  slot_id: uuid,
  booking_date: dateStr,
});

export const geoCheckSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
});

export const waitlistSchema = z.object({
  slot_id: uuid,
  booking_date: dateStr,
});

export const messageSchema = z.object({
  message: z.string().min(1).max(2000),
});
