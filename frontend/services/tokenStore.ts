import * as SecureStore from "expo-secure-store";

const KEY = "dlms_token";

let inMemory: string | null = null;

export async function loadToken(): Promise<string | null> {
  if (inMemory) return inMemory;
  try {
    inMemory = await SecureStore.getItemAsync(KEY);
  } catch {
    inMemory = null;
  }
  return inMemory;
}

export async function saveToken(token: string): Promise<void> {
  inMemory = token;
  await SecureStore.setItemAsync(KEY, token);
}

export function getToken(): string | null {
  return inMemory;
}

export async function clearToken(): Promise<void> {
  inMemory = null;
  await SecureStore.deleteItemAsync(KEY);
}
