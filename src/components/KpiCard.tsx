import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, radii, spacing } from "../theme/colors";

type Props = {
  value: string | number;
  label: string;
  accent?: boolean;
  style?: ViewStyle;
};

export function KpiCard({ value, label, accent, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  value: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
  },
  valueAccent: {
    color: colors.accent,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    textAlign: "center",
  },
});
