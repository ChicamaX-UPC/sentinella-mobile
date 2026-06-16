import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSession } from "@/auth/SessionContext";
import { canUseMobileApp } from "@/auth/roles";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { API_BASE_URL } from "@/config/api";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

export default function LoginScreen() {
  const { user, loading, login } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState("campo@sentinella.demo");
  const [password, setPassword] = useState("Sentinella2024!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href={canUseMobileApp(user.role) ? "/(main)" : "/unauthorized"} />;
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/(main)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <ThemeToggleButton />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>Sentinella</Text>
        <Text style={styles.subtitle}>Operario de campo</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor={colors.dim}
          />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor={colors.dim}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton title="Iniciar sesión" loading={busy} onPress={() => void onSubmit()} />
        </View>

        <Text style={styles.hint}>API: {API_BASE_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    topBar: {
      position: "absolute",
      top: spacing.lg,
      right: spacing.lg,
      zIndex: 2,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.lg,
    },
    logo: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "600",
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
      marginTop: -spacing.sm,
    },
    form: { gap: spacing.sm, marginTop: spacing.md },
    label: {
      color: colors.muted,
      fontSize: 13,
      marginTop: spacing.sm,
    },
    input: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      color: colors.text,
      paddingVertical: spacing.sm + 2,
      fontSize: 16,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      marginTop: spacing.sm,
    },
    hint: {
      color: colors.dim,
      fontSize: 11,
      marginTop: spacing.md,
    },
  });
}
