import { useCallback, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useScrollCollapse } from "@/context/ScrollCollapseContext";
import { spacing } from "@/theme/tokens";

/** Altura aproximada de la isla flotante (icono + etiqueta + márgenes). */
export const TAB_ISLAND_MIN_PAD = 108;

export function tabBarScrollPadding(bottomInset: number): number {
  return TAB_ISLAND_MIN_PAD + Math.max(bottomInset, 10) + spacing.md;
}

type Props = ScrollViewProps & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  trackCollapse?: boolean;
};

export function AppScrollView({
  children,
  contentContainerStyle,
  onScroll,
  trackCollapse = true,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();
  const { reportScroll } = useScrollCollapse();

  const handleScroll = useCallback<NonNullable<ScrollViewProps["onScroll"]>>(
    (e) => {
      if (trackCollapse) {
        reportScroll(e.nativeEvent.contentOffset.y);
      }
      onScroll?.(e);
    },
    [onScroll, reportScroll, trackCollapse],
  );

  const minBottomPad = tabBarScrollPadding(insets.bottom);
  const flat = StyleSheet.flatten(contentContainerStyle);
  const requestedBottom =
    typeof flat?.paddingBottom === "number" ? flat.paddingBottom : 0;

  return (
    <ScrollView
      {...rest}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: Math.max(requestedBottom, minBottomPad) },
      ]}
    >
      {children}
    </ScrollView>
  );
}
