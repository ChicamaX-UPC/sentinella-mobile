import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { AlertRow, PageResponse } from "@/api/types";
import { MobileShell } from "@/components/MobileShell";
import { playAlertFeedback } from "@/lib/alertFeedback";
import { labelAlertSeverity, labelAlertStatus } from "@/labels/spanish";
import { loadAlertsCache, saveAlertsCache } from "@/offline/outbox";
import { colors, radii, spacing } from "@/theme/colors";

export default function AlertsListScreen() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setError(null);
    setFromCache(false);
    apiJson<PageResponse<AlertRow>>("alerts", {}, { page: 0, limit: 100 })
      .then((res) => {
        setRows(res.content ?? []);
        void saveAlertsCache(JSON.stringify(res.content ?? []));
      })
      .catch(async () => {
        const raw = await loadAlertsCache();
        if (raw) {
          try {
            setRows(JSON.parse(raw) as AlertRow[]);
            setFromCache(true);
          } catch {
            setError("Sin datos (offline sin caché previa)");
          }
        } else {
          setError("Sin datos (offline sin caché previa)");
        }
      });
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    const now = new Set(rows.map((r) => r.id));
    const hadPrev = prevIdsRef.current.size > 0;
    const hasNew = [...now].some((id) => !prevIdsRef.current.has(id));
    if (hadPrev && hasNew) {
      void playAlertFeedback();
    }
    prevIdsRef.current = now;
  }, [rows]);

  return (
    <MobileShell title="Alertas">
      <ScrollView contentContainerStyle={styles.content}>
        {fromCache ? (
          <Text style={styles.cache}>Mostrando última lista en caché local</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {rows.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.severity}>{labelAlertSeverity(a.severity)}</Text>
            <Text style={styles.status}>{labelAlertStatus(a.status)}</Text>
            <Pressable
              style={styles.linkBtn}
              onPress={() => router.push(`/(main)/alerts/${a.id}`)}
            >
              <Text style={styles.linkText}>Abrir alerta</Text>
            </Pressable>
          </View>
        ))}

        {rows.length === 0 && !error ? (
          <Text style={styles.muted}>Sin alertas.</Text>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  cache: { color: colors.warning, fontSize: 12 },
  error: { color: colors.warning, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 14 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  severity: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "700",
  },
  status: { color: colors.muted, fontSize: 14, marginTop: 4 },
  linkBtn: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: { color: "#fff", fontWeight: "600" },
});
