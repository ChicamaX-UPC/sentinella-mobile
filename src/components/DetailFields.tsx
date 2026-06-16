import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

export function DetailPanel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.panel}>{children}</View>;
}

type RowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

export function DetailRow({ label, value, mono }: RowProps) {
  const { colors, type } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={[type.caption, styles.label]}>{label}</Text>
      <Text style={[type.body, mono && styles.mono]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

export function formatShortId(id: string | undefined | null): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

export function formatWhen(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-PE");
  } catch {
    return iso;
  }
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    panel: {
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    row: { gap: 2 },
    label: { color: colors.dim },
    mono: { fontFamily: "monospace", fontSize: 13 },
  });
}
