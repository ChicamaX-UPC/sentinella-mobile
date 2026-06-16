import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "@/api/client";
import { fetchLatestReading, fetchNode, fetchNodeReadingsPage } from "@/api/nodes";
import type { SensorNode, SensorReading } from "@/api/types";
import { AppScrollView } from "@/components/AppScrollView";
import { DetailPanel, DetailRow, formatWhen } from "@/components/DetailFields";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/ui";
import { useNodeLabels } from "@/hooks/useNodeLabels";
import { labelSensorType } from "@/labels/spanish";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

const PAGE_SIZE = 15;

function readingValue(r: SensorReading | null | undefined): string {
  if (r?.value == null) return "—";
  const n = typeof r.value === "number" ? r.value : Number(r.value);
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(r.value);
}

export default function SensorDetailScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getNodeLabel } = useNodeLabels(Boolean(nodeId));
  const [node, setNode] = useState<SensorNode | null>(null);
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readingsBusy, setReadingsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReadings = useCallback(async (id: string, nextPage: number) => {
    setReadingsBusy(true);
    try {
      const res = await fetchNodeReadingsPage(id, nextPage, PAGE_SIZE);
      setReadings(res.content ?? []);
      setTotalPages(res.totalPages ?? 0);
      setTotalElements(res.totalElements ?? 0);
      setPage(nextPage);
    } catch {
      setReadings([]);
    } finally {
      setReadingsBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!nodeId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchNode(nodeId),
      fetchLatestReading(nodeId),
      loadReadings(nodeId, 0),
    ])
      .then(([n, st]) => {
        setNode(n);
        setLatest(st);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      })
      .finally(() => setLoading(false));
  }, [nodeId, loadReadings]);

  const title = node ? getNodeLabel(node.id) || node.name : "Sensor";

  return (
    <MobileShell title={title} showBack>
      <AppScrollView contentContainerStyle={styles.content} trackCollapse={false}>
        {loading ? <ActivityIndicator color={colors.accent} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {node ? (
          <>
            <DetailPanel>
              {node.externalId ? (
                <DetailRow label="Referencia" value={node.externalId} />
              ) : null}
              <DetailRow label="Identificador" value={node.id} mono />
              <DetailRow label="Sensor" value={labelSensorType(node.sensorType)} />
              <DetailRow label="Estado" value={node.status ?? "OK"} />
              <DetailRow label="Última señal" value={formatWhen(node.lastSeen)} />
            </DetailPanel>

            <SectionHeader title="Última lectura" />
            {latest ? (
              <View style={styles.readingBox}>
                <Text style={styles.readingMain}>
                  {labelSensorType(latest.sensorType)}: {readingValue(latest)}{" "}
                  {latest.unit ?? ""}
                </Text>
                <Text style={styles.dim}>
                  {latest.status ?? "—"} · {formatWhen(latest.timestamp)}
                </Text>
              </View>
            ) : (
              <Text style={styles.dim}>Sin lecturas recientes.</Text>
            )}

            <SectionHeader title="Historial de lecturas" />
            {readingsBusy && readings.length === 0 ? (
              <ActivityIndicator color={colors.accent} />
            ) : null}
            {readings.map((r) => (
              <Text key={r.id} style={styles.historyRow}>
                {formatWhen(r.timestamp)} — {labelSensorType(r.sensorType)}:{" "}
                {readingValue(r)} {r.unit ?? ""}
              </Text>
            ))}
            {readings.length === 0 && !readingsBusy ? (
              <Text style={styles.dim}>Sin entradas.</Text>
            ) : null}

            {totalElements > 0 ? (
              <View style={styles.pager}>
                <Text style={styles.dim}>
                  Página {page + 1} de {Math.max(totalPages, 1)} · {totalElements} lecturas
                </Text>
                <View style={styles.pagerButtons}>
                  <PrimaryButton
                    title="Anterior"
                    variant="secondary"
                    disabled={page <= 0 || readingsBusy}
                    onPress={() => nodeId && void loadReadings(nodeId, page - 1)}
                  />
                  <PrimaryButton
                    title="Siguiente"
                    variant="secondary"
                    disabled={page + 1 >= totalPages || readingsBusy}
                    onPress={() => nodeId && void loadReadings(nodeId, page + 1)}
                  />
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.sm },
    error: { color: colors.danger, fontSize: 14 },
    readingBox: { gap: 4, paddingVertical: spacing.sm },
    readingMain: { color: colors.text, fontSize: 15, fontWeight: "600" },
    dim: { color: colors.dim, fontSize: 12 },
    historyRow: {
      color: colors.muted,
      fontSize: 12,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pager: { gap: spacing.sm, marginTop: spacing.sm },
    pagerButtons: { flexDirection: "row", gap: spacing.sm },
  });
}
