import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/api/client";
import { fetchRounds } from "@/api/rounds";
import type { Round } from "@/api/types";
import { AppScrollView } from "@/components/AppScrollView";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ListGroup, StatusLabel } from "@/components/ui";
import { useOnline } from "@/hooks/useOnline";
import { labelRoundStatus } from "@/labels/spanish";
import { roundChecklistProgress, roundStatusTone } from "@/lib/roundProgress";
import { enrichRoundsWithSnapshots, flushMutationOutbox } from "@/offline/outbox";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

export default function RoundsHistoryScreen() {
  const online = useOnline();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      setError(null);
      try {
        if (online) {
          await flushMutationOutbox(true);
        }
        const list = await fetchRounds(50);
        const enriched = await enrichRoundsWithSnapshots(list);
        setRounds(enriched);
      } catch (e: unknown) {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      } finally {
        setRefreshing(false);
      }
    },
    [online],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <MobileShell title="Rondas">
      <AppScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.accent}
          />
        }
      >
        <PrimaryButton
          title="Iniciar nueva ronda"
          onPress={() => router.push("/(main)/rounds/start")}
        />

        <Text style={styles.legend}>
          En curso: checklist abierto · Completada: todos los ítems · Sincronizada: registrada en
          el sistema
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {rounds.length > 0 ? (
          <ListGroup>
            {rounds.map((r, i) => {
              const progress = roundChecklistProgress(r);
              const progressLabel =
                progress.total > 0
                  ? `${progress.done}/${progress.total} ítems`
                  : "Sin checklist en listado";
              return (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/(main)/rounds/${r.id}`)}
                  style={({ pressed }) => [
                    styles.row,
                    i < rounds.length - 1 && styles.rowBorder,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.rowHead}>
                    <StatusLabel
                      label={labelRoundStatus(r.status)}
                      tone={roundStatusTone(r.status)}
                    />
                    <StatusLabel label="Abrir" tone="accent" />
                  </View>
                  <Text style={styles.meta}>
                    {r.scheduledAt
                      ? new Date(r.scheduledAt).toLocaleString("es-PE")
                      : "—"}
                    {" · "}
                    {progressLabel}
                  </Text>
                </Pressable>
              );
            })}
          </ListGroup>
        ) : !error ? (
          <Text style={styles.muted}>Sin rondas registradas.</Text>
        ) : null}
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { gap: spacing.md, paddingTop: spacing.sm },
    legend: { color: colors.dim, fontSize: 12, lineHeight: 17 },
    error: { color: colors.danger, fontSize: 14 },
    muted: { color: colors.muted, fontSize: 14 },
    row: { paddingVertical: spacing.md, gap: 4 },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    meta: { color: colors.muted, fontSize: 13 },
  });
}
