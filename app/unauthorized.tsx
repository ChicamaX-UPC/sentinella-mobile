import { Redirect, router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/auth/SessionContext";
import { canUseMobileApp } from "@/auth/roles";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { labelRole } from "@/labels/spanish";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

export default function UnauthorizedScreen() {
  const { user, loading, logout } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (canUseMobileApp(user.role)) {
    return <Redirect href="/(main)" />;
  }

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <ThemeToggleButton />
      </View>
      <Text style={styles.logo}>Sentinella</Text>
      <Text style={styles.title}>Acceso no permitido</Text>
      <Text style={styles.body}>
        Esta app es para operarios de campo. Tu rol: {labelRole(user.role)}.
      </Text>
      <Text style={styles.hint}>Usa el panel web para otros roles.</Text>
      <PrimaryButton title="Cerrar sesión" onPress={() => void onLogout()} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: spacing.lg,
      justifyContent: "center",
      gap: spacing.md,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    topBar: { position: "absolute", top: spacing.lg, right: spacing.lg },
    logo: { color: colors.text, fontSize: 17, fontWeight: "600" },
    title: { color: colors.text, fontSize: 20, fontWeight: "600" },
    body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
    hint: { color: colors.dim, fontSize: 13 },
  });
}
