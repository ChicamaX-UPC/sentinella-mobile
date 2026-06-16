import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

type Tab<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const { colors, type } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.tab}>
            <Text style={[type.tab, active ? styles.active : styles.inactive]}>{tab.label}</Text>
            {active ? <View style={styles.underline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      gap: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: spacing.md,
    },
    tab: {
      paddingBottom: spacing.sm,
      minWidth: 56,
    },
    active: { color: colors.text },
    inactive: { color: colors.dim },
    underline: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: -StyleSheet.hairlineWidth,
      height: 2,
      backgroundColor: colors.accent,
    },
  });
}
