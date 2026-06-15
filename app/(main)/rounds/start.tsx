import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import { useSession } from "@/auth/SessionContext";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useOnline } from "@/hooks/useOnline";
import { useTailingDamLabels } from "@/hooks/useTailingDamLabels";
import { enqueueMutation } from "@/offline/outbox";
import { colors, radii, spacing } from "@/theme/colors";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function RoundStartScreen() {
  const { user } = useSession();
  const online = useOnline();
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

      const created = await apiJson<{ id: string }>("rounds", {
        method: "POST",
        body,
      });
      router.replace(`/(main)/rounds/${created.id}`);
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
      <ScrollView contentContainerStyle={styles.content}>
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
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.muted, fontSize: 13 },
  error: { color: colors.warning, fontSize: 14 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  optionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionText: { color: colors.muted, fontSize: 15 },
  optionTextActive: { color: colors.text, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.sm,
    fontSize: 14,
  },
});
