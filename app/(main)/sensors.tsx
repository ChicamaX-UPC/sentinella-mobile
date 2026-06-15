import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { SensorNode } from "@/api/types";
import { MobileShell } from "@/components/MobileShell";
import { useNodeLabels } from "@/hooks/useNodeLabels";
import { labelSensorType } from "@/labels/spanish";
import { colors, radii, spacing } from "@/theme/colors";

function statusColor(status: string | undefined): string {
  const u = (status ?? "").toUpperCase();
  if (u.includes("CRIT")) return colors.danger;
  if (u.includes("WARN") || u.includes("OFFLINE")) return colors.warning;
  return colors.success;
}

export default function SensorsScreen() {
  const { getNodeLabel } = useNodeLabels(true);
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiJson<SensorNode[]>("nodes")
      .then((list) => setNodes(Array.isArray(list) ? list : []))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar sensores");
      });
  }, []);

  return (
    <MobileShell title="Sensores">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Lecturas simuladas del seed demo (Monitoring). IoT físico pendiente.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {nodes.map((n) => (
          <View key={n.id} style={styles.card}>
            <Text style={styles.name}>{getNodeLabel(n.id) || n.name}</Text>
            <Text style={styles.meta}>{labelSensorType(n.sensorType)}</Text>
            <Text style={[styles.status, { color: statusColor(n.status) }]}>
              {n.status ?? "OK"}
            </Text>
            {n.lastSeen ? (
              <Text style={styles.dim}>Última señal: {new Date(n.lastSeen).toLocaleString("es-PE")}</Text>
            ) : null}
          </View>
        ))}
        {nodes.length === 0 && !error ? (
          <Text style={styles.dim}>Sin nodos en tu tranque.</Text>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.muted, fontSize: 13 },
  error: { color: colors.warning },
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: 4,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 14 },
  status: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  dim: { color: colors.dim, fontSize: 12, marginTop: 4 },
});
