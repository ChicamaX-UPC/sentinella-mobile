import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Tabs } from "expo-router";

import { apiJson } from "@/api/client";
import type { FieldKpi } from "@/api/types";
import { useSession } from "@/auth/SessionContext";
import { canUseMobileApp } from "@/auth/roles";
import { DynamicIslandTabBar } from "@/components/DynamicIslandTabBar";
import { ScrollCollapseProvider } from "@/context/ScrollCollapseContext";
import { useTheme } from "@/theme/ThemeContext";

export default function MainLayout() {
  const { user, loading } = useSession();
  const { colors } = useTheme();
  const [alertBadge, setAlertBadge] = useState(0);

  useEffect(() => {
    if (!user || !canUseMobileApp(user.role)) return;
    void apiJson<FieldKpi>("dashboard/field")
      .then((k) => setAlertBadge(k.activeAlerts ?? 0))
      .catch(() => setAlertBadge(0));
  }, [user]);

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: "transparent",
        borderTopWidth: 0,
        elevation: 0,
        height: 0,
      },
    }),
    [],
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!canUseMobileApp(user.role)) {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <ScrollCollapseProvider>
      <Tabs screenOptions={screenOptions} tabBar={(props) => <DynamicIslandTabBar {...props} />}>
        <Tabs.Screen name="index" options={{ title: "Inicio" }} />
        <Tabs.Screen name="sensors" options={{ title: "Sensores" }} />
        <Tabs.Screen
          name="alerts"
          options={{
            title: "Alertas",
            tabBarBadge: alertBadge > 0 ? alertBadge : undefined,
          }}
        />
        <Tabs.Screen name="rounds" options={{ title: "Rondas" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
        <Tabs.Screen name="sync" options={{ href: null }} />
      </Tabs>
    </ScrollCollapseProvider>
  );
}
