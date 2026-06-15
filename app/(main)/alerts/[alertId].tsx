import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type {
  AlertDetail,
  AssignableUser,
  AuditRow,
} from "@/api/types";
import { useSession } from "@/auth/SessionContext";
import { markSyncedNow, MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useNodeLabels } from "@/hooks/useNodeLabels";
import { useOnline } from "@/hooks/useOnline";
import {
  labelAlertSeverity,
  labelAlertStatus,
  labelAssignableUser,
  labelAuditAction,
  labelSensorType,
} from "@/labels/spanish";
import { enqueueMutation } from "@/offline/outbox";
import { colors, radii, spacing } from "@/theme/colors";

export default function AlertDetailScreen() {
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  const { user } = useSession();
  const online = useOnline();
  const { getNodeLabel } = useNodeLabels(Boolean(alertId));
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignTo, setAssignTo] = useState("");

  const role = user?.role;
  const operatorOnly = role === "FIELD_OPERATOR";
  const canManage = role === "PLANT_MANAGER" || role === "SYSTEM_ADMIN";

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

  useEffect(() => {
    if (!canManage) return;
    void apiJson<AssignableUser[]>("users/assignable")
      .then((list) => setAssignableUsers(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [canManage]);

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
      setAssignTo("");
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
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {alert ? (
          <View style={styles.card}>
            <Text style={styles.severity}>{labelAlertSeverity(alert.severity)}</Text>
            <Text style={styles.line}>Estado: {labelAlertStatus(alert.status)}</Text>
            <Text style={styles.line}>
              {labelSensorType(alert.sensorType)}: {String(alert.triggeredValue ?? "—")}
            </Text>
            <Text style={styles.dim}>Nodo: {getNodeLabel(alert.nodeId)}</Text>

            <View style={styles.divider} />
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

            {canManage ? (
              <View style={styles.manage}>
                <Text style={styles.label}>Asignar a</Text>
                {assignableUsers.map((u) => (
                  <PrimaryButton
                    key={u.id}
                    title={labelAssignableUser(u)}
                    variant={assignTo === u.id ? "primary" : "secondary"}
                    onPress={() => setAssignTo(u.id)}
                  />
                ))}
                <PrimaryButton
                  title="Asignar"
                  variant="secondary"
                  loading={busy}
                  onPress={() => {
                    if (!assignTo) {
                      setError("Seleccione un responsable");
                      return;
                    }
                    setBusy(true);
                    void sendPatch({
                      action: "COMPLETE",
                      assignedTo: assignTo,
                      notes: notes.trim() || undefined,
                    }).finally(() => setBusy(false));
                  }}
                />
                <PrimaryButton
                  title="Cerrar alerta"
                  variant="danger"
                  loading={busy}
                  onPress={() => {
                    setBusy(true);
                    void sendPatch({
                      action: "CLOSE",
                      notes: notes.trim() || undefined,
                    }).finally(() => setBusy(false));
                  }}
                />
              </View>
            ) : null}

            {operatorOnly ? (
              <Text style={styles.hint}>Operario: solo confirmación (ACK).</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.section}>Auditoría</Text>
        {audit.map((row) => (
          <Text key={row.id} style={styles.audit}>
            {row.timestamp} — {labelAuditAction(row.action)} ({row.actorRole ?? "?"})
          </Text>
        ))}

        <PrimaryButton
          title="Volver a alertas"
          variant="secondary"
          onPress={() => router.back()}
        />
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.warning, fontSize: 14 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  severity: { color: colors.accent, fontSize: 20, fontWeight: "700" },
  line: { color: colors.muted, fontSize: 14 },
  dim: { color: colors.dim, fontSize: 12 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  label: { color: colors.muted, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.sm,
    minHeight: 72,
    textAlignVertical: "top",
  },
  manage: { gap: spacing.sm, marginTop: spacing.sm },
  hint: { color: colors.dim, fontSize: 12 },
  section: { color: colors.text, fontWeight: "600", fontSize: 16 },
  audit: { color: colors.dim, fontSize: 12 },
});
