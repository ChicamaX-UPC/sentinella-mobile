import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { Round } from "@/api/types";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { labelRoundStatus } from "@/labels/spanish";
import { colors, radii, spacing } from "@/theme/colors";

export default function RoundsHistoryScreen() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Round[]>("rounds")
      .then((list) => setRounds(Array.isArray(list) ? list : []))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }, []);

  return (
    <MobileShell title="Rondas">
      <ScrollView contentContainerStyle={styles.content}>
        <PrimaryButton
          title="Iniciar nueva ronda"
          onPress={() => router.push("/(main)/rounds/start")}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {rounds.map((r) => (
          <Pressable
            key={r.id}
            style={styles.card}
            onPress={() => router.push(`/(main)/rounds/${r.id}`)}
          >
            <Text style={styles.status}>{labelRoundStatus(r.status)}</Text>
            <Text style={styles.meta}>
              {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString("es-PE") : "—"}
            </Text>
            <Text style={styles.link}>Abrir checklist →</Text>
          </Pressable>
        ))}

        {rounds.length === 0 && !error ? (
          <Text style={styles.muted}>Sin rondas registradas.</Text>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.warning, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 14 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  status: { color: colors.text, fontSize: 16, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  link: { color: colors.accent, marginTop: spacing.sm, fontWeight: "600" },
});
