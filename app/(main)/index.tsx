import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { FieldKpi } from "@/api/types";
import { KpiCard } from "@/components/KpiCard";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radii, spacing } from "@/theme/colors";

export default function HomeScreen() {
  const [kpi, setKpi] = useState<FieldKpi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    apiJson<FieldKpi>("dashboard/field")
      .then(setKpi)
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError
            ? `No se pudo cargar el turno (${e.status})`
            : "Error de red",
        );
      });
  }, []);

  const critical = (kpi?.activeAlerts ?? 0) > 0;

  return (
    <MobileShell>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Turno de campo</Text>
        <Text style={styles.subtitle}>Vista operario — datos demo simulados</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {kpi ? (
          <>
            <View style={styles.kpiRow}>
              <KpiCard value={kpi.activeAlerts ?? 0} label="Alertas activas" accent />
              <KpiCard value={kpi.sensorsOutOfRange ?? 0} label="Sensores fuera de rango" />
            </View>
            <View style={styles.kpiRow}>
              <KpiCard value={kpi.roundsInProgress ?? 0} label="Rondas en curso" />
              <KpiCard value={kpi.pendingSyncRounds ?? 0} label="Sync pendiente" />
            </View>
            {kpi.lastIncidentAt ? (
              <Text style={styles.incident}>
                Última incidencia: {new Date(kpi.lastIncidentAt).toLocaleString("es-PE")}
              </Text>
            ) : null}
          </>
        ) : !error ? (
          <Text style={styles.muted}>Cargando…</Text>
        ) : null}

        {critical ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Hay alertas activas: revisa el listado y confirma recepción.
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton title="Ver alertas" onPress={() => router.push("/(main)/alerts")} />
          <PrimaryButton
            title="Sensores del tranque"
            variant="secondary"
            onPress={() => router.push("/(main)/sensors")}
          />
          <PrimaryButton
            title="Iniciar ronda"
            variant="secondary"
            onPress={() => router.push("/(main)/rounds/start")}
          />
        </View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14 },
  error: { color: colors.warning, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 14 },
  kpiRow: { flexDirection: "row", gap: spacing.md },
  incident: { color: colors.dim, fontSize: 12, textAlign: "center" },
  banner: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
  },
  bannerText: { color: "#fecaca", fontSize: 14, textAlign: "center" },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
