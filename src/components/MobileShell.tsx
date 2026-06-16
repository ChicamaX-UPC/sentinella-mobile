import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnline } from "@/hooks/useOnline";
import { formatLastSync, loadLastSync, recordLastSync } from "@/offline/lastSync";
import { countMobilePendingTotal } from "@/offline/photos";
import { flushMutationOutbox } from "@/offline/outbox";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/typography";
import { spacing } from "@/theme/tokens";

import { ThemeToggleButton } from "./ThemeToggleButton";

type Props = {
  title?: string;
  children: ReactNode;
  showBack?: boolean;
};

export function MobileShell({ title, children, showBack }: Props) {
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const { colors, type } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refreshMeta = useCallback(async () => {
    try {
      setPending(await countMobilePendingTotal());
      setLastSync(await loadLastSync());
    } catch {
      setPending(0);
    }
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    if (!online) return;
    void (async () => {
      await flushMutationOutbox(true);
      await refreshMeta();
    })();
  }, [online, refreshMeta]);

  const statusLine = pending > 0
    ? `${pending} pendiente${pending === 1 ? "" : "s"}`
    : `Sync ${formatLastSync(lastSync)}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <Text style={styles.logo}>Sentinella</Text>
          )}
          {title ? <Text style={type.subtitle}>{title}</Text> : null}
        </View>
        <View style={styles.headerRight}>
          <ThemeToggleButton />
          <Text style={[type.caption, { color: online ? colors.dim : colors.warning }]}>
            {online ? "En línea" : "Offline"} · {statusLine}
          </Text>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export async function markSyncedNow(): Promise<void> {
  await recordLastSync();
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    headerLeft: { flex: 1, gap: 2, paddingRight: spacing.sm },
    headerRight: { alignItems: "flex-end", gap: 6 },
    logo: {
      color: colors.text,
      fontFamily: fonts.displaySemi,
      fontSize: 18,
      letterSpacing: -0.3,
    },
    backBtn: { paddingVertical: 2, marginLeft: -4, marginBottom: 2 },
    body: { flex: 1, paddingHorizontal: spacing.md },
  });
}
