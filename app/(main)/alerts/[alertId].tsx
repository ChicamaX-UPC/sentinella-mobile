import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { AlertDetail, AuditRow } from "@/api/types";
import { AppScrollView } from "@/components/AppScrollView";
import {
  DetailPanel,
  DetailRow,
  formatShortId,
  formatWhen,
} from "@/components/DetailFields";
import { markSyncedNow, MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader, StatusLabel } from "@/components/ui";
import { useNodeLabels } from "@/hooks/useNodeLabels";
import { useOnline } from "@/hooks/useOnline";
import {
  labelAlertSeverity,
  labelAlertStatus,
  labelAuditAction,
  labelSensorType,
} from "@/labels/spanish";
import { canOperatorAckAlert } from "@/lib/alerts";
import { enqueueMutation } from "@/offline/outbox";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

export default function AlertDetailScreen() {
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  const online = useOnline();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getNodeLabel } = useNodeLabels(Boolean(alertId));
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");

  function load() {
    if (!alertId) return;
    setError(null);
    Promise.all([
      apiJson<AlertDetail>(`alerts/${alertId}`),
      apiJson<AuditRow[]>(`alerts/${alertId}/audit`),
    ])
      .then(([a, au]) => {
        setAlert(a);
        setAudit(Array.isArray(au) ? au : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? `Error ${e.status}` : "Error al cargar");
      });
  }

  useEffect(() => {
    load();
  }, [alertId]);

  const canAck = alert ? canOperatorAckAlert(alert.status) : false;

  async function captureAckGeo(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch {
      return null;
    }
  }

  async function sendPatch(body: Record<string, unknown>) {
    if (!alertId) return;
    const json = JSON.stringify(body);
    const queue = async () => {
      await enqueueMutation({
        method: "PATCH",
        path: `alerts/${alertId}`,
        body: json,
        createdAt: Date.now(),
      });
      setError("Sin red: acción en cola de sincronización");
    };

    if (!online) {
      await queue();
      return;
    }

    try {
      const updated = await apiJson<AlertDetail>(`alerts/${alertId}`, {
        method: "PATCH",
        body: json,
      });
      setAlert(updated);
      setNotes("");
      const au = await apiJson<AuditRow[]>(`alerts/${alertId}/audit`);
      setAudit(Array.isArray(au) ? au : []);
      setError(null);
      await markSyncedNow();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.body || `Error ${e.status}`);
        return;
      }
      await queue();
    }
  }

  return (
    <MobileShell title="Alerta" showBack>
      <AppScrollView contentContainerStyle={styles.content} trackCollapse={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {alert ? (
          <>
            <View style={styles.meta}>
              <StatusLabel label={labelAlertSeverity(alert.severity)} tone="accent" />
              <Text style={styles.dot}>·</Text>
              <StatusLabel label={labelAlertStatus(alert.status)} />
            </View>

            <DetailPanel>
              <DetailRow label="ID" value={formatShortId(alert.id)} mono />
              {alert.ruleId ? (
                <DetailRow label="Regla" value={formatShortId(alert.ruleId)} mono />
              ) : null}
              <DetailRow
                label="Lectura"
                value={`${labelSensorType(alert.sensorType)}: ${String(alert.triggeredValue ?? "—")}`}
              />
              <DetailRow label="Nodo" value={getNodeLabel(alert.nodeId)} />
              {alert.acknowledgedAt ? (
                <DetailRow label="Reconocida" value={formatWhen(alert.acknowledgedAt)} />
              ) : null}
              {alert.assignedTo ? (
                <DetailRow label="Asignada a" value={formatShortId(alert.assignedTo)} mono />
              ) : null}
              {alert.closedAt ? (
                <DetailRow label="Cerrada" value={formatWhen(alert.closedAt)} />
              ) : null}
              {alert.resolutionNotes ? (
                <DetailRow label="Resolución" value={alert.resolutionNotes} />
              ) : null}
            </DetailPanel>

            {alert.nodeId ? (
              <PrimaryButton
                title="Ver sensor"
                variant="secondary"
                onPress={() =>
                  alert.nodeId &&
                  router.push({
                    pathname: "/(main)/sensors/[nodeId]",
                    params: { nodeId: alert.nodeId },
                  })
                }
              />
            ) : null}

            {canAck ? (
              <View style={styles.block}>
                <SectionHeader title="Confirmar recepción" />
                <Text style={styles.label}>Notas (opcional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  placeholderTextColor={colors.dim}
                />
                <PrimaryButton
                  title="Reconocer alerta"
                  loading={busy}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      const geo = await captureAckGeo();
                      await sendPatch({
                        action: "ACKNOWLEDGE",
                        notes: notes.trim() || undefined,
                        ...(geo ?? {}),
                      });
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </View>
            ) : (
              <Text style={styles.dim}>
                Esta alerta ya fue reconocida o cerrada. Solo lectura.
              </Text>
            )}
          </>
        ) : null}

        <SectionHeader title="Historial" />
        {audit.length === 0 ? (
          <Text style={styles.dim}>Sin eventos de auditoría.</Text>
        ) : (
          audit.map((row) => (
            <View key={row.id} style={styles.auditRow}>
              <Text style={styles.audit}>
                {formatWhen(row.timestamp)} — {labelAuditAction(row.action)} (
                {row.actorRole ?? "?"})
              </Text>
              {row.notes ? <Text style={styles.auditNotes}>{row.notes}</Text> : null}
            </View>
          ))
        )}

        <PrimaryButton title="Volver" variant="secondary" onPress={() => router.back()} />
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.sm },
    error: { color: colors.danger, fontSize: 14 },
    block: { gap: spacing.sm },
    meta: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { color: colors.dim },
    label: { color: colors.muted, fontSize: 13 },
    input: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      color: colors.text,
      paddingVertical: spacing.sm,
      minHeight: 72,
      textAlignVertical: "top",
      fontSize: 15,
    },
    dim: { color: colors.dim, fontSize: 13 },
    auditRow: { marginBottom: spacing.sm },
    audit: { color: colors.dim, fontSize: 12 },
    auditNotes: { color: colors.muted, fontSize: 12, marginTop: 2, paddingLeft: spacing.sm },
  });
}
