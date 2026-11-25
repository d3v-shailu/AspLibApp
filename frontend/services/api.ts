import axios from "axios";
import { getToken, clearToken } from "./tokenStore";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message: string =
      error?.response?.data?.error || error?.message || "Something went wrong";
    if (error?.response?.status === 401) clearToken();
    return Promise.reject(new Error(message));
  }
);

export function apiError(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}
