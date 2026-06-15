import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useOnline } from "@/hooks/useOnline";
import { countPhotoDrafts } from "@/offline/photos";
import { countPendingOutbox, flushMutationOutbox } from "@/offline/outbox";
import { colors, radii, spacing } from "@/theme/colors";

type Props = {
  title?: string;
};

export function SyncPanel({ title = "Sincronización offline" }: Props) {
  const online = useOnline();
  const [outbox, setOutbox] = useState(0);
  const [photos, setPhotos] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [o, p] = await Promise.all([countPendingOutbox(), countPhotoDrafts()]);
    setOutbox(o);
    setPhotos(p);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function flush() {
    setBusy(true);
    try {
      await flushMutationOutbox(online);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.line}>
        Cola API: <Text style={styles.accent}>{outbox}</Text>
      </Text>
      <Text style={styles.line}>
        Fotos en borrador: <Text style={styles.accent}>{photos}</Text>
      </Text>
      <PrimaryButton
        title={busy ? "Sincronizando…" : "Reintentar cola"}
        variant="secondary"
        loading={busy}
        disabled={!online}
        onPress={() => void flush()}
      />
      {!online ? (
        <Text style={styles.offline}>Conéctate para procesar la cola.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { color: colors.text, fontWeight: "600", fontSize: 16 },
  line: { color: colors.muted, fontSize: 14 },
  accent: { color: colors.accent, fontWeight: "700" },
  offline: { color: colors.warning, fontSize: 13 },
});
