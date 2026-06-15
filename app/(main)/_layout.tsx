import { Redirect } from "expo-router";
import { Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";

import { apiJson } from "@/api/client";
import type { FieldKpi } from "@/api/types";
import { useSession } from "@/auth/SessionContext";
import { colors } from "@/theme/colors";

export default function MainLayout() {
  const { user, loading } = useSession();
  const [alertBadge, setAlertBadge] = useState(0);

  useEffect(() => {
    if (!user) return;
    void apiJson<FieldKpi>("dashboard/field")
      .then((k) => setAlertBadge(k.activeAlerts ?? 0))
      .catch(() => setAlertBadge(0));
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="sensors" options={{ title: "Sensores" }} />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alertas",
          tabBarBadge: alertBadge > 0 ? alertBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
        }}
      />
      <Tabs.Screen name="rounds" options={{ title: "Registros" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
      <Tabs.Screen name="sync" options={{ href: null }} />
    </Tabs>
  );
}
