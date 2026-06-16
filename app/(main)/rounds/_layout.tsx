import { Stack } from "expo-router";

import { useTheme } from "@/theme/ThemeContext";

export default function RoundsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
