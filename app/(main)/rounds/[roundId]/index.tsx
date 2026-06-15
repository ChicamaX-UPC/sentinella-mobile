import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { Round } from "@/api/types";
import { markSyncedNow, MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useOnline } from "@/hooks/useOnline";
import { labelRoundStatus } from "@/labels/spanish";
import {
  enqueueMutation,
  loadRoundSnapshot,
  saveRoundSnapshot,
} from "@/offline/outbox";
import { colors, radii, spacing } from "@/theme/colors";

function checklistProgress(round: Round) {
  const items = round.checklistItems ?? [];
  const total = items.length;
  const done = items.filter((it) => Boolean(it.completedAt)).length;
  const requiredPending = items.filter(
    (it) => it.required !== false && !it.completedAt,
  ).length;
  return { total, done, requiredPending };
}

export default function RoundDetailScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const online = useOnline();
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
    apiJson<Round>(`rounds/${roundId}`)
      .then((r) => {
        setRound(r);
        void saveRoundSnapshot(roundId, JSON.stringify(r));
      })
      .catch(async (e: unknown) => {
        const snap = await loadRoundSnapshot(roundId);
        if (snap) {
          try {
            setRound(JSON.parse(snap) as Round);
            setFromCache(true);
            setError(null);
          } catch {
            setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
          }
        } else {
          setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
        }
      });
  }

  useEffect(() => {
    load();
  }, [roundId]);

  async function syncRound() {
    if (!roundId || !round) return;
    if (progress && progress.requiredPending > 0) {
      setError(
        `Faltan ${progress.requiredPending} ítem(s) obligatorio(s) por completar antes de sincronizar.`,
      );
      return;
    }

    setSyncBusy(true);
    setError(null);
    try {
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

  return (
    <MobileShell title="Ronda" showBack>
      <ScrollView contentContainerStyle={styles.content}>
        {fromCache ? (
          <Text style={styles.cache}>Checklist desde caché local</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {round ? (
          <>
            <Text style={styles.status}>Estado: {labelRoundStatus(round.status)}</Text>
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
              title={syncBusy ? "Sincronizando…" : "Sincronizar ronda"}
              variant="secondary"
              loading={syncBusy}
              onPress={() => void syncRound()}
            />
            {(round.checklistItems ?? []).map((it) => (
              <View key={it.id} style={styles.card}>
                <Text style={styles.point}>
                  {it.pointName}
                  {it.required !== false ? " *" : ""}
                </Text>
                {it.completedAt ? (
                  <Text style={styles.done}>Listo</Text>
                ) : (
                  <Pressable
                    onPress={() =>
                      router.push(`/(main)/rounds/${roundId}/item/${it.id}`)
                    }
                  >
                    <Text style={styles.link}>Completar ítem →</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  cache: { color: colors.warning, fontSize: 12 },
  error: { color: colors.warning, fontSize: 14 },
  status: { color: colors.muted, fontSize: 15 },
  progressBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.sm,
    gap: 4,
  },
  progressText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  progressWarn: { color: colors.warning, fontSize: 13 },
  progressOk: { color: colors.success, fontSize: 13 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  point: { color: colors.text, fontSize: 16, fontWeight: "600" },
  done: { color: colors.success, fontSize: 12, marginTop: spacing.sm },
  link: { color: colors.accent, marginTop: spacing.sm, fontWeight: "600" },
});
