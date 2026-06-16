import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useScrollCollapse } from "@/context/ScrollCollapseContext";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/typography";
import { radii, spacing } from "@/theme/tokens";

const ICON_SIZE = 22;
const ICON_SIZE_COMPACT = 24;

export function DynamicIslandTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { collapse, resetScroll } = useScrollCollapse();
  const compact = collapse > 0.45;

  useEffect(() => {
    resetScroll();
  }, [state.index, resetScroll]);

  const bottom = Math.max(insets.bottom, 10);
  const padV = compact ? 8 : 10;

  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom }]}>
      <View
        style={[
          styles.island,
          {
            backgroundColor: isDark ? "#161b24" : "#ffffff",
            borderColor: colors.border,
            paddingVertical: padV,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (route.name === "sync") return null;

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;

          const focused = state.index === index;
          const color = focused ? colors.accent : colors.dim;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const iconName = iconForRoute(route.name, focused);
          const badge = options.tabBarBadge;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              style={styles.tab}
            >
              <View>
                <Ionicons
                  name={iconName}
                  size={compact ? ICON_SIZE_COMPACT : ICON_SIZE}
                  color={color}
                />
                {badge != null && Number(badge) > 0 ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.badgeText}>{String(badge)}</Text>
                  </View>
                ) : null}
              </View>
              {!compact ? (
                <Text style={[styles.label, { color }, focused && styles.labelActive]}>
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function iconForRoute(
  name: string,
  focused: boolean,
): keyof typeof Ionicons.glyphMap {
  const map: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
    index: ["home", "home-outline"],
    sensors: ["pulse", "pulse-outline"],
    alerts: ["notifications", "notifications-outline"],
    rounds: ["clipboard", "clipboard-outline"],
    profile: ["person-circle", "person-circle-outline"],
  };
  const pair = map[name] ?? ["ellipse", "ellipse-outline"];
  return focused ? pair[0] : pair[1];
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
  },
  island: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 44,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  labelActive: {
    fontFamily: fonts.bodySemi,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: fonts.bodySemi,
  },
});
