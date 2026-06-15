import { Redirect, router } from "expo-router";
import { useState } from "react";
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
import { PrimaryButton } from "@/components/PrimaryButton";
import { API_BASE_URL } from "@/config/api";
import { colors, radii, spacing } from "@/theme/colors";

export default function LoginScreen() {
  const { user, loading, login } = useSession();
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
    return <Redirect href="/(main)" />;
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.logo}>Sentinella Campo</Text>
        <Text style={styles.subtitle}>Operaciones en relavera</Text>

        <View style={styles.card}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  logo: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
  },
  error: {
    color: colors.warning,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  hint: {
    color: colors.dim,
    fontSize: 11,
    textAlign: "center",
  },
});
