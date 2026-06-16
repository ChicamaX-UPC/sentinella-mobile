import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useOnline } from "@/hooks/useOnline";
import { countPhotoDrafts } from "@/offline/photos";
import { countPendingOutbox, flushMutationOutbox } from "@/offline/outbox";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  title?: string;
};

export function SyncPanel({ title = "Sincronización" }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        Cola API: {outbox} · Fotos: {photos}
      </Text>
      <PrimaryButton
        title={busy ? "Sincronizando…" : "Reintentar cola"}
        variant="secondary"
        loading={busy}
        disabled={!online}
        onPress={() => void flush()}
      />
      {!online ? <Text style={styles.offline}>Sin conexión.</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    box: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginVertical: spacing.sm,
    },
    title: { color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    line: { color: colors.text, fontSize: 15 },
    offline: { color: colors.warning, fontSize: 13 },
  });
}
