import { api } from "./api";
import { saveToken } from "./tokenStore";
import { User } from "../types";

interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", { identifier, password });
    await saveToken(data.token);
    return data;
  },

  async resetPassword(newPassword: string): Promise<void> {
    const { data } = await api.post<{ token: string }>("/auth/reset-password", { newPassword });
    await saveToken(data.token);
  },
};
