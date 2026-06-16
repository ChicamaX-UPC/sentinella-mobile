import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/** IP del PC en LAN (misma que Metro, p. ej. 192.168.18.4:8081 → 192.168.18.4). */
function resolveLanHostFromExpo(): string | null {
  const raw =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    "";
  return raw.match(/(\d{1,3}(?:\.\d{1,3}){3})/)?.[1] ?? null;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (Platform.OS === "android" && !Device.isDevice) {
    return "http://10.0.2.2:8080";
  }

  if (Platform.OS === "ios" && !Device.isDevice) {
    return "http://localhost:8080";
  }

  const lan = resolveLanHostFromExpo();
  if (lan && (Platform.OS === "ios" || Platform.OS === "android")) {
    return `http://${lan}:8080`;
  }

  return Platform.select({
    android: "http://10.0.2.2:8080",
    ios: "http://localhost:8080",
    default: "http://localhost:8080",
  })!;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const API_V1 = `${API_BASE_URL}/api/v1`;
