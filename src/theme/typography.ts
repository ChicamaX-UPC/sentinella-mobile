import type { TextStyle } from "react-native";

import type { ThemeColors } from "./tokens";

export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displaySemi: "SpaceGrotesk_600SemiBold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemi: "DMSans_600SemiBold",
} as const;

export function createTypography(colors: ThemeColors) {
  const base = { color: colors.text } satisfies TextStyle;

  return {
    hero: {
      ...base,
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: -0.5,
    } satisfies TextStyle,
    title: {
      ...base,
      fontFamily: fonts.displaySemi,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: -0.3,
    } satisfies TextStyle,
    subtitle: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    } satisfies TextStyle,
    eyebrow: {
      color: colors.dim,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    } satisfies TextStyle,
    body: {
      ...base,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
    } satisfies TextStyle,
    bodyMedium: {
      ...base,
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      lineHeight: 22,
    } satisfies TextStyle,
    caption: {
      color: colors.dim,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    } satisfies TextStyle,
    label: {
      color: colors.muted,
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      letterSpacing: 0.3,
    } satisfies TextStyle,
    metric: {
      ...base,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.5,
    } satisfies TextStyle,
    tab: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
    } satisfies TextStyle,
  };
}

export type Typography = ReturnType<typeof createTypography>;
