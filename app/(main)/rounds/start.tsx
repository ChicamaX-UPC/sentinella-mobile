import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { Round } from "@/api/types";
import { useSession } from "@/auth/SessionContext";
import { AppScrollView } from "@/components/AppScrollView";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useOnline } from "@/hooks/useOnline";
import { useTailingDamLabels } from "@/hooks/useTailingDamLabels";
import { enqueueMutation, persistRoundFromApi } from "@/offline/outbox";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function RoundStartScreen() {
  const { user } = useSession();
  const online = useOnline();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { options } = useTailingDamLabels();
  const [tailingDamId, setTailingDamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.tailingDamIds?.length && !tailingDamId) {
      setTailingDamId(user.tailingDamIds[0]);
    } else if (options.length && !tailingDamId) {
      setTailingDamId(options[0].id);
    }
  }, [user, options, tailingDamId]);

  async function onSubmit() {
    if (!tailingDamId.trim()) {
      setError("Seleccione un tranque");
      return;
    }
    setBusy(true);
    setError(null);
    const iso = new Date(scheduledAt).toISOString();
    const body = JSON.stringify({
      tailingDamId: tailingDamId.trim(),
      scheduledAt: iso,
      offlineCreated: !online,
    });

    try {
      if (!online) {
        await enqueueMutation({
          method: "POST",
          path: "rounds",
          body,
          createdAt: Date.now(),
        });
        router.replace("/(main)/profile");
        return;
      }

      const created = await apiJson<Round>("rounds", {
        method: "POST",
        body,
      });
      await persistRoundFromApi(created.id, created);
      router.replace("/(main)/rounds");
    } catch (err: unknown) {
      if (!online) {
        await enqueueMutation({
          method: "POST",
          path: "rounds",
          body,
          createdAt: Date.now(),
        });
        router.replace("/(main)/profile");
        return;
      }
      setError(
        err instanceof ApiError ? err.body || `Error ${err.status}` : "Error al crear",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileShell title="Iniciar ronda" showBack>
      <AppScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Ronda de inspección en tranque asignado. Sin red, se encola en Perfil → Sync.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Tranque</Text>
          {options.length > 0 ? (
            options.map((o) => (
              <Pressable
                key={o.id}
                style={[styles.option, tailingDamId === o.id && styles.optionActive]}
                onPress={() => setTailingDamId(o.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    tailingDamId === o.id && styles.optionTextActive,
                  ]}
                >
                  {o.label}
                </Text>
              </Pressable>
            ))
          ) : (
            <TextInput
              value={tailingDamId}
              onChangeText={setTailingDamId}
              style={styles.input}
              placeholder="UUID del tranque"
              placeholderTextColor={colors.dim}
            />
          )}
          <Text style={styles.label}>Programada (ISO local)</Text>
          <TextInput
            value={scheduledAt}
            onChangeText={setScheduledAt}
            style={styles.input}
            placeholder="2026-06-14T08:00"
            placeholderTextColor={colors.dim}
          />
          <PrimaryButton
            title={busy ? "Guardando…" : "Crear ronda"}
            loading={busy}
            onPress={() => void onSubmit()}
          />
        </View>
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.muted, fontSize: 13 },
  error: { color: colors.warning, fontSize: 14 },
  card: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  label: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  option: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
    justifyContent: "center",
  },
  optionActive: {
    borderBottomColor: colors.text,
  },
  optionText: { color: colors.muted, fontSize: 15 },
  optionTextActive: { color: colors.text, fontWeight: "500" },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    color: colors.text,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  });
}
