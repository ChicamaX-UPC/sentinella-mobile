import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { Round } from "@/api/types";
import { AppScrollView } from "@/components/AppScrollView";
import { DetailPanel, DetailRow, formatShortId, formatWhen } from "@/components/DetailFields";
import { markSyncedNow, MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RoundChecklistItemCard } from "@/components/RoundChecklistItemCard";
import { SectionHeader } from "@/components/ui";
import { useTailingDamLabels } from "@/hooks/useTailingDamLabels";
import { useOnline } from "@/hooks/useOnline";
import { labelRoundStatus } from "@/labels/spanish";
import { roundChecklistProgress } from "@/lib/roundProgress";
import {
  enqueueMutation,
  flushRoundOutbox,
  loadRoundSnapshot,
  resolveRound,
  saveRoundSnapshot,
} from "@/offline/outbox";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

function checklistProgress(round: Round) {
  return roundChecklistProgress(round);
}

export default function RoundDetailScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const online = useOnline();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getTailingDamLabel } = useTailingDamLabels();
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const progress = useMemo(
    () => (round ? checklistProgress(round) : null),
    [round],
  );

  function load() {
    if (!roundId) return;
    setError(null);
    setFromCache(false);
    void resolveRound(roundId).then(async (r) => {
      if (r) {
        setRound(r);
        return;
      }
      const snap = await loadRoundSnapshot(roundId);
      if (snap) {
        try {
          setRound(JSON.parse(snap) as Round);
          setFromCache(true);
        } catch {
          setError("Error al cargar la ronda");
        }
      } else {
        setError("Error al cargar la ronda");
      }
    });
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [roundId]),
  );

  async function syncRound() {
    if (!roundId || !round) return;

    const status = (round.status ?? "").toUpperCase();
    if (round.syncedAt || status === "SYNCED") {
      setError("Esta ronda ya está sincronizada.");
      return;
    }

    setSyncBusy(true);
    setError(null);
    try {
      if (online) {
        await flushRoundOutbox(roundId, true);
        const refreshed = await resolveRound(roundId);
        if (refreshed) setRound(refreshed);
        const prog = refreshed ? checklistProgress(refreshed) : progress;
        if (prog && prog.requiredPending > 0) {
          setError(
            `Faltan ${prog.requiredPending} ítem(s) obligatorio(s). Envía los ítems pendientes antes de sincronizar.`,
          );
          return;
        }
      } else if (progress && progress.requiredPending > 0) {
        setError(
          `Faltan ${progress.requiredPending} ítem(s) obligatorio(s) por completar antes de sincronizar.`,
        );
        return;
      }

      if (!online) {
        await enqueueMutation({
          method: "POST",
          path: `rounds/${roundId}/sync`,
          body: JSON.stringify({}),
          createdAt: Date.now(),
        });
        setError("Sin red: sincronización en cola");
        return;
      }

      const updated = await apiJson<Round>(`rounds/${roundId}/sync`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setRound(updated);
      void saveRoundSnapshot(roundId, JSON.stringify(updated));
      await markSyncedNow();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.body || `No se pudo sincronizar (${e.status})`);
        return;
      }
      await enqueueMutation({
        method: "POST",
        path: `rounds/${roundId}/sync`,
        body: JSON.stringify({}),
        createdAt: Date.now(),
      });
      setError("Error de red: acción en cola");
    } finally {
      setSyncBusy(false);
    }
  }

  const alreadySynced =
    Boolean(round?.syncedAt) || (round?.status ?? "").toUpperCase() === "SYNCED";

  return (
    <MobileShell title="Ronda" showBack>
      <AppScrollView contentContainerStyle={styles.content} trackCollapse={false}>
        {fromCache ? (
          <Text style={styles.cache}>Checklist desde caché local</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {round ? (
          <>
            <DetailPanel>
              <DetailRow label="ID" value={formatShortId(round.id)} mono />
              <DetailRow label="Tranque" value={getTailingDamLabel(round.tailingDamId)} />
              <DetailRow label="Estado" value={labelRoundStatus(round.status)} />
              <DetailRow label="Programada" value={formatWhen(round.scheduledAt)} />
              <DetailRow label="Inicio" value={formatWhen(round.startedAt)} />
              <DetailRow label="Sincronizada" value={formatWhen(round.syncedAt)} />
              {round.offlineCreated ? (
                <DetailRow label="Origen" value="Creada offline" />
              ) : null}
            </DetailPanel>

            {progress && progress.total > 0 ? (
              <View style={styles.progressBox}>
                <Text style={styles.progressText}>
                  Progreso: {progress.done}/{progress.total} ítems
                </Text>
                {progress.requiredPending > 0 ? (
                  <Text style={styles.progressWarn}>
                    Obligatorios pendientes: {progress.requiredPending}
                  </Text>
                ) : (
                  <Text style={styles.progressOk}>Listo para sincronizar</Text>
                )}
              </View>
            ) : null}

            <PrimaryButton
              title={
                alreadySynced
                  ? "Ronda sincronizada"
                  : syncBusy
                    ? "Sincronizando…"
                    : "Sincronizar ronda"
              }
              variant="secondary"
              loading={syncBusy}
              disabled={alreadySynced}
              onPress={() => void syncRound()}
            />

            <SectionHeader title="Checklist" />
            {(round.checklistItems ?? []).map((it) => (
              <RoundChecklistItemCard key={it.id} roundId={roundId!} item={it} />
            ))}
          </>
        ) : null}
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { gap: spacing.md, paddingBottom: spacing.xl },
    cache: { color: colors.warning, fontSize: 12 },
    error: { color: colors.warning, fontSize: 14 },
    progressBox: {
      paddingVertical: spacing.sm,
      gap: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    progressText: { color: colors.text, fontSize: 15, fontWeight: "600" },
    progressWarn: { color: colors.warning, fontSize: 13 },
    progressOk: { color: colors.success, fontSize: 13 },
  });
}
