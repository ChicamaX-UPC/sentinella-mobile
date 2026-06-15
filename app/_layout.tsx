import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SessionProvider } from "@/auth/SessionContext";
import { PushNotificationBootstrap } from "@/notifications/PushNotificationBootstrap";
import { colors } from "@/theme/colors";

export default function RootLayout() {
  return (
    <SessionProvider>
      <PushNotificationBootstrap />
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(main)" />
      </Stack>
    </SessionProvider>
  );
}
