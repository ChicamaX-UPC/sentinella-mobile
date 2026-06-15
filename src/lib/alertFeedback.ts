import * as Haptics from "expo-haptics";

/** Feedback al detectar alerta nueva (US13 escenario 2 — foreground). */
export async function playAlertFeedback(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}
