import { router } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnline } from "@/hooks/useOnline";
import { formatLastSync, loadLastSync, recordLastSync } from "@/offline/lastSync";
import { countMobilePendingTotal } from "@/offline/photos";
import { flushMutationOutbox } from "@/offline/outbox";
import { colors, spacing } from "@/theme/colors";

type Props = {
  title?: string;
  children: ReactNode;
  showBack?: boolean;
};

export function MobileShell({ title, children, showBack }: Props) {
  const insets = useSafeAreaInsets();
  const online = useOnline();
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBack ? (
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.replace("/(main)")}>
              <Text style={styles.logo}>Sentinella</Text>
            </Pressable>
          )}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.online, online ? styles.onlineOn : styles.onlineOff]}>
            {online ? "En línea" : "Offline"}
          </Text>
          <Text style={styles.syncLine}>Sync: {formatLastSync(lastSync)}</Text>
          {pending > 0 ? (
            <Text style={styles.pending}>
              {pending} pendiente{pending === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

/** Llamar tras mutación online exitosa (ACK, ítem, sync). */
export async function markSyncedNow(): Promise<void> {
  await recordLastSync();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  headerLeft: { flex: 1, gap: 4 },
  headerRight: { alignItems: "flex-end", gap: 2, maxWidth: "52%" },
  logo: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { color: colors.accent, fontSize: 22 },
  online: { fontSize: 12, fontWeight: "600" },
  onlineOn: { color: colors.success },
  onlineOff: { color: colors.warning },
  syncLine: { fontSize: 10, color: colors.dim, textAlign: "right" },
  pending: { fontSize: 11, color: colors.warning },
  body: { flex: 1, padding: spacing.md },
});
