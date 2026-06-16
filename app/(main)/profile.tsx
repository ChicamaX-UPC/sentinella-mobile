import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useSession } from "@/auth/SessionContext";
import { AppScrollView } from "@/components/AppScrollView";
import { MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SyncPanel } from "@/components/SyncPanel";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { ListGroup, SectionHeader } from "@/components/ui";
import { API_BASE_URL } from "@/config/api";
import { useTailingDamLabels } from "@/hooks/useTailingDamLabels";
import { labelRole } from "@/labels/spanish";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

export default function ProfileScreen() {
  const { user, logout } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getTailingDamLabel } = useTailingDamLabels();

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <MobileShell title="Perfil">
      <AppScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{user?.fullName ?? "—"}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>Rol: {labelRole(user?.role)}</Text>

        <SectionHeader title="Tranques" />
        <ListGroup>
          {(user?.tailingDamIds ?? []).length > 0 ? (
            user!.tailingDamIds.map((id, i, arr) => (
              <Text
                key={id}
                style={[styles.dam, i < arr.length - 1 && styles.damBorder]}
              >
                {getTailingDamLabel(id)}
              </Text>
            ))
          ) : (
            <Text style={styles.meta}>Sin tranques asignados</Text>
          )}
        </ListGroup>

        <SyncPanel />

        <SectionHeader title="Apariencia" />
        <View style={styles.themeRow}>
          <ThemeToggleButton />
          <Text style={styles.meta}>Tema claro / oscuro</Text>
        </View>

        <SectionHeader title="Conexión" />
        <Text style={styles.meta}>API: {API_BASE_URL}</Text>
        <Text style={styles.dim}>Telemetría demo</Text>

        <PrimaryButton
          title="Cerrar sesión"
          variant="danger"
          onPress={() => void onLogout()}
        />
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.sm },
    name: { color: colors.text, fontSize: 20, fontWeight: "600" },
    meta: { color: colors.muted, fontSize: 14 },
    dim: { color: colors.dim, fontSize: 12 },
    dam: {
      color: colors.text,
      fontSize: 15,
      paddingVertical: spacing.md,
    },
    damBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
  });
}
