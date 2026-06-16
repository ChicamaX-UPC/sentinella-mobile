import Constants from "expo-constants";
import { Platform } from "react-native";

import { apiFetch } from "@/api/client";
import { playAlertFeedback } from "@/lib/alertFeedback";

let registeredToken: string | null = null;

/** Push remoto no funciona en Expo Go desde SDK 53; solo en development build. */
export function isPushAvailableInThisBuild(): boolean {
  return Constants.appOwnership !== "expo";
}

async function notificationsModule() {
  return import("expo-notifications");
}

async function deviceModule() {
  return import("expo-device");
}

function resolveProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android" || !isPushAvailableInThisBuild()) return;
  const Notifications = await notificationsModule();
  await Notifications.setNotificationChannelAsync("alerts", {
    name: "Alertas Sentinella",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#ff8c42",
    sound: "default",
  });
}

export async function configurePushHandler(): Promise<void> {
  if (!isPushAvailableInThisBuild()) return;
  const Notifications = await notificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!isPushAvailableInThisBuild()) return false;
  const Device = await deviceModule();
  if (!Device.isDevice) return false;
  const Notifications = await notificationsModule();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function obtainExpoPushToken(): Promise<string | null> {
  if (!isPushAvailableInThisBuild()) return null;
  const Device = await deviceModule();
  if (!Device.isDevice) return null;
  const projectId = resolveProjectId();
  if (!projectId) return null;
  const Notifications = await notificationsModule();
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

export async function syncPushRegistration(): Promise<void> {
  if (!isPushAvailableInThisBuild()) return;
  await configurePushHandler();
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
  if (!isPushAvailableInThisBuild()) {
    return () => {};
  }

  let receivedSub: { remove: () => void } | null = null;
  let responseSub: { remove: () => void } | null = null;

  void (async () => {
    const Notifications = await notificationsModule();
    receivedSub = Notifications.addNotificationReceivedListener(() => {
      void playAlertFeedback();
    });
    responseSub = Notifications.addNotificationResponseReceivedListener((event) => {
      const alertId = event.notification.request.content.data?.alertId;
      if (typeof alertId === "string" && alertId.length > 0) {
        onOpenAlert(alertId);
      }
    });
  })();

  return () => {
    receivedSub?.remove();
    responseSub?.remove();
  };
}
