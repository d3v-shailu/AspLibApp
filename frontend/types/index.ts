export type Role = "developer" | "admin" | "student";

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  library_id: string | null;
  full_name: string | null;
  gender: "male" | "female" | "other" | null;
  must_reset_password: boolean;
}

export interface Library {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: "active" | "suspended" | "archived";
  latitude: string | number | null;
  longitude: string | number | null;
  radius_meters: number;
  advance_booking_days: number;
  checkin_grace_minutes: number;
  student_count?: number;
  seat_count?: number;
  today_active_bookings?: number;
}

export interface Seat {
  id: string;
  library_id: string;
  seat_number: string;
  zone: string | null;
  seat_type: string;
  status: "available" | "maintenance";
  is_booked?: boolean;
}

export interface TimeSlot {
  id: string;
  library_id: string;
  name: string;
  start_time: string;
  end_time: string;
  price: string;
  is_active: boolean;
}

export type BookingStatus = "booked" | "checked_in" | "completed" | "no_show" | "cancelled";

export interface Booking {
  id: string;
  library_id: string;
  student_id: string;
  seat_id: string;
  slot_id: string;
  booking_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: BookingStatus;
  checkin_distance?: string | number | null;
  is_geofence_valid?: boolean | null;
  // joined fields from API
  seat_number?: string;
  slot_name?: string;
  start_time?: string;
  end_time?: string;
  student_name?: string;
}

export interface ChatChannel {
  id: string;
  library_id: string;
  name: string;
  gender: "male" | "female" | "all";
  member_count?: number;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

export interface Student {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  gender: string | null;
  status: string;
  must_reset_password: boolean;
  created_at: string;
}

export interface GlobalStats {
  active_libraries: number;
  admin_count: number;
  student_count: number;
  bookings_today: number;
  checked_in_now: number;
  total_no_shows: number;
}

export interface OccupancyReport {
  date: string;
  total_seats: number;
  booked: number;
  checked_in: number;
  no_shows: number;
  completed: number;
  occupancy_percent: number;
}
