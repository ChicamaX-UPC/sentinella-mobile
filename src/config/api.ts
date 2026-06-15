import { Platform } from "react-native";

const platformDefault = Platform.select({
  android: "http://10.0.2.2:8080",
  ios: "http://localhost:8080",
  default: "http://localhost:8080",
});

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? platformDefault
).replace(/\/$/, "");

export const API_V1 = `${API_BASE_URL}/api/v1`;
