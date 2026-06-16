import { useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type TextStyle } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  label: string;
  tone?: "neutral" | "danger" | "success" | "warning" | "accent";
};

export function StatusLabel({ label, tone = "neutral" }: Props) {
  const { colors, type } = useTheme();

  const color =
    tone === "danger"
      ? colors.danger
      : tone === "success"
        ? colors.success
        : tone === "warning"
          ? colors.warning
          : tone === "accent"
            ? colors.accent
            : colors.muted;

  return <Text style={[type.caption, { color }]}>{label}</Text>;
}

type SectionProps = {
  title: string;
  style?: TextStyle;
};

export function SectionHeader({ title, style }: SectionProps) {
  const { type } = useTheme();
  return (
    <Text style={[type.label, { marginTop: spacing.lg, marginBottom: spacing.sm }, style]}>
      {title}
    </Text>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
};

export function ListRow({ title, subtitle, onPress, last }: ListRowProps) {
  const { colors, type } = useTheme();
  const styles = useMemo(() => createListStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.65 }]}
    >
      <View style={styles.copy}>
        <Text style={[type.bodyMedium, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
      </View>
      <Text style={[type.caption, { color: colors.dim }]}>→</Text>
    </Pressable>
  );
}

function createListStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      minHeight: 48,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    copy: { flex: 1, gap: 2 },
  });
}

/** Lista con borde superior e inferior — sin tarjetas. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}
    >
      {children}
    </View>
  );
}

export const StatusChip = StatusLabel;
export const QuickActionTile = ListRow;
