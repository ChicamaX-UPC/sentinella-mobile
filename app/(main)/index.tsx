import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError, apiJson } from "@/api/client";
import { fetchNodes, summarizeNodes, toMapMarkers } from "@/api/nodes";
import { fetchRounds } from "@/api/rounds";
import type { FieldKpi } from "@/api/types";
import { useSession } from "@/auth/SessionContext";
import { AppScrollView } from "@/components/AppScrollView";
import { MobileShell } from "@/components/MobileShell";
import { NodesMapView } from "@/components/NodesMapView";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { ListGroup, ListRow, SectionHeader } from "@/components/ui";
import { StatBlock } from "@/components/visuals";
import { buildDaySummary } from "@/lib/fieldDaySummary";
import { enrichRoundsWithSnapshots } from "@/offline/outbox";
import { labelRoundStatus } from "@/labels/spanish";
import { useNodeLabels } from "@/hooks/useNodeLabels";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

export default function HomeScreen() {
  const { user } = useSession();
  const { colors, type } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getNodeLabel } = useNodeLabels(true);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [kpi, setKpi] = useState<FieldKpi | null>(null);
  const [rounds, setRounds] = useState<Awaited<ReturnType<typeof fetchRounds>>>([]);
  const [nodeTotal, setNodeTotal] = useState(0);
  const [nodesOk, setNodesOk] = useState(0);
  const [nodesNeedAttention, setNodesNeedAttention] = useState(0);
  const [mapMarkers, setMapMarkers] = useState<ReturnType<typeof toMapMarkers>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      apiJson<FieldKpi>("dashboard/field"),
      fetchRounds(50)
        .then((list) => enrichRoundsWithSnapshots(list))
        .catch(() => []),
      fetchNodes(100).catch(() => []),
    ])
      .then(([k, roundList, nodes]) => {
        setKpi(k);
        setRounds(roundList);
        const summary = summarizeNodes(nodes);
        setNodeTotal(summary.total);
        setNodesOk(summary.counts.ok);
        setNodesNeedAttention(summary.counts.warn + summary.counts.crit);
        setMapMarkers(toMapMarkers(nodes, (id, fallback) => getNodeLabel(id) || fallback));
      })
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError
            ? `No se pudo cargar el turno (${e.status})`
            : "Error de red",
        );
      });
  }, [getNodeLabel]);

  const day = useMemo(
    () => buildDaySummary(selectedDay, kpi, rounds, nodeTotal, nodesOk, nodesNeedAttention),
    [selectedDay, kpi, rounds, nodeTotal, nodesOk, nodesNeedAttention],
  );

  const critical = day.kpi.activeAlerts > 0;
  const firstName = user?.fullName?.split(" ")[0] ?? "Operario";

  const dayRounds = useMemo(() => {
    const seen = new Set<string>();
    const merged = [
      ...day.roundsInProgress,
      ...day.roundsScheduled,
      ...day.roundsCompleted,
    ].filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    return merged.slice(0, 6);
  }, [day.roundsCompleted, day.roundsInProgress, day.roundsScheduled]);

  return (
    <MobileShell>
      <AppScrollView contentContainerStyle={styles.content}>
        <Text style={type.hero}>Hola, {firstName}</Text>
        <Text style={[type.subtitle, { marginBottom: spacing.md }]}>Turno de campo</Text>

        <WeeklyCalendar selected={selectedDay} onSelect={setSelectedDay} />

        {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}

        <SectionHeader title={day.isToday ? "Hoy" : day.dayLabel} />
        <Text style={[type.caption, { marginBottom: spacing.sm }]}>
          {day.isToday ? "Indicadores del turno" : "Resumen según rondas del día"}
        </Text>

        <View style={styles.statsRow}>
          <StatBlock
            value={day.kpi.activeAlerts}
            label="Alertas"
            tone={critical ? "danger" : "success"}
          />
          <StatBlock
            value={day.kpi.sensorsOutOfRange}
            label="Fuera rango"
            tone={day.kpi.sensorsOutOfRange > 0 ? "warning" : "success"}
          />
          <StatBlock value={day.kpi.roundsInProgress} label="Rondas" tone="accent" />
          <StatBlock
            value={day.kpi.pendingSyncRounds}
            label="Sync"
            tone={day.kpi.pendingSyncRounds > 0 ? "warning" : "neutral"}
          />
        </View>

        <View style={styles.statsRow}>
          {day.isToday && day.kpi.nodeTotal > 0 ? (
            <>
              <StatBlock
                value={`${day.kpi.nodesOnline}/${day.kpi.nodeTotal}`}
                label="En línea"
                tone="success"
              />
              <StatBlock
                value={day.kpi.nodesNeedAttention}
                label="Atención"
                tone={day.kpi.nodesNeedAttention > 0 ? "warning" : "success"}
              />
            </>
          ) : null}
          <StatBlock value={day.kpi.roundsCompleted} label="Completadas" tone="neutral" />
          <StatBlock value={day.kpi.checklistItemsDone} label="Ítems hechos" tone="accent" />
        </View>

        {day.incidentNote ? (
          <Text style={[type.caption, { marginBottom: spacing.sm }]}>
            Incidencia · {day.incidentNote}
          </Text>
        ) : null}

        {day.isToday && critical ? (
          <Text style={[type.bodyMedium, styles.alertLine]}>
            Alertas activas — confirma con ACK + GPS
          </Text>
        ) : null}

        {dayRounds.length > 0 ? (
          <>
            <SectionHeader title="Actividad del día" />
            <ListGroup>
              {dayRounds.map((r, i) => {
                const time =
                  r.completedAt ?? r.startedAt ?? r.scheduledAt ?? null;
                const subtitle = [
                  labelRoundStatus(r.status),
                  time ? new Date(time).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <ListRow
                    key={r.id}
                    title={`Ronda ${r.id.slice(0, 8)}`}
                    subtitle={subtitle}
                    onPress={() => router.push(`/(main)/rounds/${r.id}`)}
                    last={i === dayRounds.length - 1}
                  />
                );
              })}
            </ListGroup>
          </>
        ) : !error ? (
          <Text style={[type.caption, { marginBottom: spacing.md }]}>
            No hay rondas registradas para este día.
          </Text>
        ) : null}

        {day.isToday && mapMarkers.length > 0 ? (
          <>
            <SectionHeader title="Mapa" />
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(main)/sensors",
                  params: { view: "map" },
                })
              }
            >
              <NodesMapView markers={mapMarkers.slice(0, 40)} height={200} />
              <Text style={[type.caption, { marginTop: spacing.sm }]}>Ver mapa completo →</Text>
            </Pressable>
          </>
        ) : null}
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { paddingTop: spacing.sm },
    statsRow: {
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    alertLine: {
      color: colors.danger,
      marginBottom: spacing.sm,
      paddingLeft: spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: colors.danger,
    },
  });
}
