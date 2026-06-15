import { router } from "expo-router";
import { useEffect } from "react";

import { useSession } from "@/auth/SessionContext";
import {
  attachNotificationListeners,
  syncPushRegistration,
  unregisterPushTokenFromBackend,
} from "@/notifications/push";

export function PushNotificationBootstrap() {
  const { user } = useSession();

  useEffect(() => {
    if (!user) return;
    void syncPushRegistration().catch(() => {});
    return attachNotificationListeners((alertId) => {
      router.push(`/(main)/alerts/${alertId}`);
    });
  }, [user]);

  useEffect(() => {
    if (user) return;
    void unregisterPushTokenFromBackend().catch(() => {});
  }, [user]);

  return null;
}
