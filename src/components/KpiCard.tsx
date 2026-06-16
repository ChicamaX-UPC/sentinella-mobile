import { useMemo } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  value: string | number;
  label: string;
  highlight?: boolean;
  style?: ViewStyle;
};

/** Métrica plana, sin card. */
export function StatItem({ value, label, highlight, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.item, style]}>
      <Text style={[styles.value, highlight && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    item: { flex: 1, gap: 2 },
    value: { fontSize: 28, fontWeight: "600", color: colors.text },
    label: { fontSize: 12, color: colors.muted },
  });
}
