import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  fetchLatestReading,
  fetchNodeReadings,
  fetchNodes,
  summarizeNodes,
  toMapMarkers,
} from "@/api/nodes";
import type { SensorNode, SensorReading } from "@/api/types";
import { MobileShell } from "@/components/MobileShell";
import { AppScrollView } from "@/components/AppScrollView";
import { NodesMapView } from "@/components/NodesMapView";
import { SegmentTabs } from "@/components/SegmentTabs";
import { Sparkline, StatusDistribution, StatusDot, nodeStatusTone } from "@/components/visuals";
import { useNodeLabels } from "@/hooks/useNodeLabels";
import { labelSensorType } from "@/labels/spanish";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/typography";
import { spacing } from "@/theme/tokens";

type ViewMode = "map" | "list";
type NodeExtras = {
  latest?: SensorReading | null;
  spark: number[];
};

const SPARKLINE_NODES = 12;

function readingValue(r: SensorReading | null | undefined): number | null {
  if (r?.value == null) return null;
  const n = typeof r.value === "number" ? r.value : Number(r.value);
  return Number.isFinite(n) ? n : null;
}

function normalizeView(value: string | string[] | undefined): ViewMode {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "map" ? "map" : "list";
}

export default function SensorsScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const { colors, type } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getNodeLabel } = useNodeLabels(true);
  const [view, setView] = useState<ViewMode>(() => normalizeView(params.view));
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [extras, setExtras] = useState<Record<string, NodeExtras>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setView(normalizeView(params.view));
  }, [params.view]);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const list = await fetchNodes(100);
      setNodes(list);

      const sparkTargets = list.slice(0, SPARKLINE_NODES);
      const nextExtras: Record<string, NodeExtras> = {};

      await Promise.all(
        sparkTargets.map(async (node) => {
          const [latest, readings] = await Promise.all([
            fetchLatestReading(node.id),
            fetchNodeReadings(node.id, 8),
          ]);
          const spark = readings
            .map((r) => readingValue(r))
            .filter((v): v is number => v != null)
            .reverse();
          nextExtras[node.id] = { latest, spark };
        }),
      );

      setExtras(nextExtras);
    } catch {
      setError("No se pudieron cargar los sensores");
      setNodes([]);
      setExtras({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const summary = summarizeNodes(nodes);
  const mapMarkers = useMemo(
    () => toMapMarkers(nodes, (id, fallback) => getNodeLabel(id) || fallback),
    [nodes, getNodeLabel],
  );

  return (
    <MobileShell title="Sensores">
      <AppScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.accent} />
        }
      >
        <Text style={type.subtitle}>{summary.total} nodos en tu tranque</Text>

        <SegmentTabs
          tabs={[
            { id: "map", label: "Mapa" },
            { id: "list", label: "Lista" },
          ]}
          value={view}
          onChange={setView}
        />

        {loading && nodes.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
        ) : null}
        {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}

        {view === "map" ? (
          <View style={styles.mapBlock}>
            <NodesMapView markers={mapMarkers} height={340} />
            <Text style={[type.caption, { marginTop: spacing.sm }]}>
              {mapMarkers.length} con GPS
            </Text>
          </View>
        ) : null}

        {view === "list" && summary.total > 0 ? (
          <StatusDistribution
            ok={summary.counts.ok}
            warn={summary.counts.warn}
            crit={summary.counts.crit}
            offline={summary.counts.offline}
          />
        ) : null}

        {view === "list"
          ? nodes.map((n, i) => {
              const extra = extras[n.id];
              const tone = nodeStatusTone(n.status);
              const latestVal = readingValue(extra?.latest);
              const unit = extra?.latest?.unit ?? "";

              return (
                <Pressable
                  key={n.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/sensors/[nodeId]",
                      params: { nodeId: n.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.row,
                    i < nodes.length - 1 && styles.rowBorder,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <View style={styles.rowTop}>
                    <StatusDot tone={tone} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.name}>{getNodeLabel(n.id) || n.name}</Text>
                      <Text style={type.caption}>{labelSensorType(n.sensorType)}</Text>
                    </View>
                    <View style={styles.valueCol}>
                      {latestVal != null ? (
                        <Text style={[styles.value, { color: tone === "danger" ? colors.danger : colors.text }]}>
                          {latestVal.toFixed(1)}
                          <Text style={type.caption}> {unit}</Text>
                        </Text>
                      ) : (
                        <Text style={type.caption}>—</Text>
                      )}
                      <Text style={type.caption}>{n.status ?? "OK"}</Text>
                    </View>
                  </View>

                  {extra?.spark && extra.spark.length > 1 ? (
                    <Sparkline values={extra.spark} tone={tone === "neutral" ? "accent" : tone} />
                  ) : null}
                </Pressable>
              );
            })
          : null}

        {!loading && nodes.length === 0 && !error ? (
          <Text style={type.subtitle}>Sin nodos asignados.</Text>
        ) : null}
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { paddingBottom: spacing.xxl, paddingTop: spacing.sm },
    mapBlock: { marginBottom: spacing.md },
    row: {
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    rowCopy: { flex: 1, gap: 2 },
    name: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
    },
    valueCol: { alignItems: "flex-end", gap: 2 },
    value: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
    },
  });
}
