import { api } from "./api";
import { Booking, Seat, TimeSlot, OccupancyReport } from "../types";

// ---------------- STUDENT ----------------

export const bookingService = {
  async availableSeats(date: string, slotId: string): Promise<Seat[]> {
    const { data } = await api.get<{ seats: Seat[] }>(
      `/student/seats/available?date=${date}&slot=${slotId}`
    );
    return data.seats;
  },

  async book(seatId: string, slotId: string, bookingDate: string): Promise<Booking> {
    const { data } = await api.post<{ booking: Booking }>("/student/bookings", {
      seat_id: seatId,
      slot_id: slotId,
      booking_date: bookingDate,
    });
    return data.booking;
  },

  async myBookings(): Promise<Booking[]> {
    const { data } = await api.get<{ bookings: Booking[] }>("/student/my/bookings");
    return data.bookings;
  },

  async cancel(id: string): Promise<void> {
    await api.post(`/student/bookings/${id}/cancel`);
  },

  async extend(id: string): Promise<Booking> {
    const { data } = await api.post<{ booking: Booking }>(`/student/bookings/${id}/extend`);
    return data.booking;
  },

  async checkIn(id: string, lat: number, lng: number, accuracy?: number): Promise<Booking> {
    const { data } = await api.post<{ booking: Booking }>(`/student/bookings/${id}/check-in`, {
      lat,
      lng,
      accuracy,
    });
    return data.booking;
  },

  async checkOut(id: string, lat: number, lng: number, accuracy?: number): Promise<Booking> {
    const { data } = await api.post<{ booking: Booking }>(`/student/bookings/${id}/check-out`, {
      lat,
      lng,
      accuracy,
    });
    return data.booking;
  },
};

// ---------------- ADMIN ----------------

export const adminService = {
  async seats(): Promise<Seat[]> {
    const { data } = await api.get<{ seats: Seat[] }>("/admin/seats");
    return data.seats;
  },

  async addSeat(seat_number: string, zone?: string, seat_type?: string): Promise<Seat> {
    const { data } = await api.post<{ seat: Seat }>("/admin/seats", { seat_number, zone, seat_type });
    return data.seat;
  },

  async updateSeat(id: string, patch: { status?: string; zone?: string; seat_type?: string }): Promise<void> {
    await api.patch(`/admin/seats/${id}`, patch);
  },

  async slots(): Promise<TimeSlot[]> {
    const { data } = await api.get<{ time_slots: TimeSlot[] }>("/admin/time-slots");
    return data.time_slots;
  },

  async addSlot(payload: { name: string; start_time: string; end_time: string; price?: number }): Promise<TimeSlot> {
    const { data } = await api.post<{ time_slot: TimeSlot }>("/admin/time-slots", payload);
    return data.time_slot;
  },

  async updateSlot(id: string, patch: Partial<{ name: string; start_time: string; end_time: string; price: number; is_active: boolean }>): Promise<void> {
    await api.patch(`/admin/time-slots/${id}`, patch);
  },

  async bookings(date?: string): Promise<Booking[]> {
    const q = date ? `?date=${date}` : "";
    const { data } = await api.get<{ bookings: Booking[] }>(`/admin/bookings${q}`);
    return data.bookings;
  },

  async occupancy(date?: string): Promise<OccupancyReport> {
    const q = date ? `?date=${date}` : "";
    const { data } = await api.get<OccupancyReport>(`/admin/reports/occupancy${q}`);
    return data;
  },

  async saveGeofence(latitude: number, longitude: number, radius_meters: number): Promise<void> {
    await api.patch("/admin/libraries/geofence", { latitude, longitude, radius_meters });
  },
};
