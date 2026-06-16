import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useSession } from "@/auth/SessionContext";
import { canUseMobileApp } from "@/auth/roles";
import { useTheme } from "@/theme/ThemeContext";

export default function Index() {
  const { user, loading } = useSession();
  const { colors } = useTheme();

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
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href={canUseMobileApp(user.role) ? "/(main)" : "/unauthorized"} />;
  }

  return <Redirect href="/login" />;
}
