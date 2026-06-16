import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import type { ReactNode } from "react";

import { SessionProvider } from "@/auth/SessionContext";
import { PushNotificationBootstrap } from "@/notifications/PushNotificationBootstrap";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";

function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="unauthorized" />
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
}

function FontGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <FontGate>
        <SessionProvider>
          <PushNotificationBootstrap />
          <RootNavigator />
        </SessionProvider>
      </FontGate>
    </ThemeProvider>
  );
}
