import { QueryResultRow } from "pg";

export type Row = QueryResultRow;

export interface LibraryRow extends Row {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: string;
  latitude: string | null;
  longitude: string | null;
  radius_meters: number;
  advance_booking_days: number;
  checkin_grace_minutes: number;
}

export interface UserRow extends Row {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  role: "developer" | "admin" | "student";
  library_id: string | null;
  full_name: string | null;
  gender: "male" | "female" | "other" | null;
  must_reset_password: boolean;
  status: string;
}

export interface SeatRow extends Row {
  id: string;
  library_id: string;
  seat_number: string;
  zone: string | null;
  seat_type: string;
  status: string;
}

export interface SlotRow extends Row {
  id: string;
  library_id: string;
  name: string;
  start_time: string;
  end_time: string;
  price: string;
  is_active: boolean;
}

export interface BookingRow extends Row {
  id: string;
  library_id: string;
  student_id: string;
  seat_id: string;
  slot_id: string;
  booking_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: "booked" | "checked_in" | "completed" | "no_show" | "cancelled";
  checkin_distance: string | null;
  checkout_distance: string | null;
  is_geofence_valid: boolean | null;
}

export interface ChannelRow extends Row {
  id: string;
  library_id: string;
  name: string;
  gender: "male" | "female" | "all";
}
