import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiFetch } from "@/api/client";
import { playAlertFeedback } from "@/lib/alertFeedback";

let registeredToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function resolveProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("alerts", {
    name: "Alertas Sentinella",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#ff8c42",
    sound: "default",
  });
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function obtainExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }
  const projectId = resolveProjectId();
  if (!projectId) {
    return null;
  }
  await ensureAndroidChannel();
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function registerPushTokenWithBackend(token: string): Promise<void> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const res = await apiFetch("users/me/device-tokens", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  registeredToken = token;
}

export async function unregisterPushTokenFromBackend(): Promise<void> {
  if (!registeredToken) return;
  try {
    await apiFetch("users/me/device-tokens", {
      method: "DELETE",
      body: JSON.stringify({ token: registeredToken, platform: Platform.OS }),
    });
  } finally {
    registeredToken = null;
  }
}

/** Tras login o restaurar sesión. */
export async function syncPushRegistration(): Promise<void> {
  const granted = await requestPushPermissions();
  if (!granted) return;
  const token = await obtainExpoPushToken();
  if (!token || token === registeredToken) {
    if (token) registeredToken = token;
    return;
  }
  await registerPushTokenWithBackend(token);
}

export function attachNotificationListeners(
  onOpenAlert: (alertId: string) => void,
): () => void {
  const received = Notifications.addNotificationReceivedListener(() => {
    void playAlertFeedback();
  });
  const response = Notifications.addNotificationResponseReceivedListener((event) => {
    const alertId = event.notification.request.content.data?.alertId;
    if (typeof alertId === "string" && alertId.length > 0) {
      onOpenAlert(alertId);
    }
  });
  return () => {
    received.remove();
    response.remove();
  };
}
