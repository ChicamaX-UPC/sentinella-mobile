import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

type Props = {
  size?: number;
};

export function ThemeToggleButton({ size = 20 }: Props) {
  const { colors, isDark, toggleMode } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onPress={toggleMode}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
    >
      <Ionicons
        name={isDark ? "sunny-outline" : "moon-outline"}
        size={size}
        color={colors.muted}
      />
    </Pressable>
  );
}
