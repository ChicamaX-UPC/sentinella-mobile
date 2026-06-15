import * as SecureStore from "expo-secure-store";

import type { AuthSession, SessionUser } from "../api/types";

const KEYS = {
  access: "st_access",
  refresh: "st_refresh",
  user: "st_user",
} as const;

export async function saveSession(session: AuthSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.access, session.token),
    SecureStore.setItemAsync(KEYS.refresh, session.refreshToken),
    SecureStore.setItemAsync(KEYS.user, JSON.stringify(session.user)),
  ]);
}

export async function loadStoredSession(): Promise<AuthSession | null> {
  const [token, refreshToken, userJson] = await Promise.all([
    SecureStore.getItemAsync(KEYS.access),
    SecureStore.getItemAsync(KEYS.refresh),
    SecureStore.getItemAsync(KEYS.user),
  ]);
  if (!token || !refreshToken || !userJson) {
    return null;
  }
  try {
    const user = JSON.parse(userJson) as SessionUser;
    return { token, refreshToken, expiresIn: 900, user };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.access),
    SecureStore.deleteItemAsync(KEYS.refresh),
    SecureStore.deleteItemAsync(KEYS.user),
  ]);
}

export async function updateTokens(
  token: string,
  refreshToken: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.access, token),
    SecureStore.setItemAsync(KEYS.refresh, refreshToken),
  ]);
}
