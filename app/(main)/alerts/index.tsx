import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { apiJson } from "@/api/client";
import type { AlertRow, PageResponse } from "@/api/types";
import { AppScrollView } from "@/components/AppScrollView";
import { MobileShell } from "@/components/MobileShell";
import { ListGroup, StatusLabel } from "@/components/ui";
import { useNodeLabels } from "@/hooks/useNodeLabels";
import { playAlertFeedback } from "@/lib/alertFeedback";
import { labelAlertSeverity, labelAlertStatus, labelSensorType } from "@/labels/spanish";
import { loadAlertsCache, saveAlertsCache } from "@/offline/outbox";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

function severityTone(severity: string | undefined): "danger" | "warning" | "accent" | "neutral" {
  const s = (severity ?? "").toUpperCase();
  if (s.includes("CRIT")) return "danger";
  if (s.includes("HIGH") || s.includes("WARN")) return "warning";
  if (s.includes("MED")) return "accent";
  return "neutral";
}

export default function AlertsListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getNodeLabel } = useNodeLabels(true);
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
      <AppScrollView contentContainerStyle={styles.content}>
        {fromCache ? <Text style={styles.cache}>Caché local</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {rows.length > 0 ? (
          <ListGroup>
            {rows.map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => router.push(`/(main)/alerts/${a.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  i < rows.length - 1 && styles.rowBorder,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>Alerta #{a.id.slice(0, 8)}</Text>
                  <Text style={styles.sub}>
                    {labelSensorType(a.sensorType)}: {String(a.triggeredValue ?? "—")}
                    {a.nodeId ? ` · ${getNodeLabel(a.nodeId)}` : ""}
                  </Text>
                  <View style={styles.meta}>
                    <StatusLabel label={labelAlertSeverity(a.severity)} tone={severityTone(a.severity)} />
                    <Text style={styles.dot}>·</Text>
                    <StatusLabel label={labelAlertStatus(a.status)} />
                  </View>
                </View>
              </Pressable>
            ))}
          </ListGroup>
        ) : !error ? (
          <Text style={styles.muted}>Sin alertas.</Text>
        ) : null}
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.sm },
    cache: { color: colors.warning, fontSize: 12 },
    error: { color: colors.danger, fontSize: 14 },
    muted: { color: colors.muted, fontSize: 14 },
    row: {
      paddingVertical: spacing.md,
      minHeight: 48,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowMain: { gap: 4 },
    rowTitle: { color: colors.text, fontSize: 16, fontWeight: "500" },
    sub: { color: colors.muted, fontSize: 13 },
    meta: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { color: colors.dim, fontSize: 12 },
  });
}
