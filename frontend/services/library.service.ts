import { api } from "./api";
import { Library, GlobalStats, Student } from "../types";

export const libraryService = {
  async list(): Promise<Library[]> {
    const { data } = await api.get<{ libraries: Library[] }>("/developer/libraries");
    return data.libraries;
  },

  async create(payload: {
    name: string;
    address?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
  }): Promise<Library> {
    const { data } = await api.post<{ library: Library }>("/developer/libraries", payload);
    return data.library;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await api.patch(`/developer/libraries/${id}`, { status });
  },

  async createAdmin(
    libraryId: string,
    payload: { full_name: string; email?: string; phone?: string; gender?: string }
  ): Promise<{ admin: Record<string, unknown>; default_password: string }> {
    const { data } = await api.post(`/developer/libraries/${libraryId}/admins`, payload);
    return data;
  },

  async globalStats(): Promise<GlobalStats> {
    const { data } = await api.get<{ stats: GlobalStats }>("/developer/analytics/global");
    return data.stats;
  },
};

export const studentAdminService = {
  async list(): Promise<Student[]> {
    const { data } = await api.get<{ students: Student[] }>("/admin/students");
    return data.students;
  },

  async create(payload: {
    full_name: string;
    email?: string;
    phone?: string;
    gender?: string;
  }): Promise<{ student: Student; default_password: string }> {
    const { data } = await api.post("/admin/students", payload);
    return data;
  },

  async setBlocked(id: string, blocked: boolean): Promise<void> {
    await api.patch(`/admin/students/${id}/block`, { blocked });
  },
};
