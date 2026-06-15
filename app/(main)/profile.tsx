import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/auth/SessionContext";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SyncPanel } from "@/components/SyncPanel";
import { API_BASE_URL } from "@/config/api";
import { useTailingDamLabels } from "@/hooks/useTailingDamLabels";
import { labelRole } from "@/labels/spanish";
import { colors, radii, spacing } from "@/theme/colors";

export default function ProfileScreen() {
  const { user, logout } = useSession();
  const { getTailingDamLabel } = useTailingDamLabels();

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <MobileShell title="Perfil">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.fullName ?? "—"}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.meta}>Rol: {labelRole(user?.role)}</Text>
        </View>

        <Text style={styles.section}>Tranques asignados</Text>
        {(user?.tailingDamIds ?? []).length > 0 ? (
          user!.tailingDamIds.map((id) => (
            <Text key={id} style={styles.dam}>
              {getTailingDamLabel(id)}
            </Text>
          ))
        ) : (
          <Text style={styles.meta}>Sin tranques asignados</Text>
        )}

        <SyncPanel />

        <Text style={styles.section}>Conexión</Text>
        <Text style={styles.meta}>API: {API_BASE_URL}</Text>
        <Text style={styles.dim}>Telemetría: seed demo (IoT físico pendiente)</Text>

        <PrimaryButton title="Cerrar sesión" variant="danger" onPress={() => void onLogout()} />
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  name: { color: colors.text, fontSize: 20, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 14 },
  dim: { color: colors.dim, fontSize: 12 },
  section: { color: colors.text, fontWeight: "600", fontSize: 16, marginTop: spacing.sm },
  dam: { color: colors.text, fontSize: 15 },
});
