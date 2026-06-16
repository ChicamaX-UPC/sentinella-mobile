export type ThemeMode = "dark" | "light";

export type ThemeColors = {
  bg: string;
  bgElevated: string;
  card: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accentSoft: string;
  accentOn: string;
  danger: string;
  success: string;
  warning: string;
  tabBar: string;
  inputBg: string;
  surface: string;
  surfaceAlt: string;
  mapOverlay: string;
};

export const darkColors: ThemeColors = {
  bg: "#0c1118",
  bgElevated: "#0c1118",
  card: "#0c1118",
  border: "#2a3340",
  borderStrong: "#3d4a5c",
  text: "#e8eaed",
  muted: "#9aa3ad",
  dim: "#6b7280",
  accent: "#ff8c42",
  accentSoft: "rgba(255, 140, 66, 0.1)",
  accentOn: "#1a0f08",
  danger: "#ef4444",
  success: "#22c55e",
  warning: "#eab308",
  tabBar: "#0c1118",
  inputBg: "#0c1118",
  surface: "#0c1118",
  surfaceAlt: "#121820",
  mapOverlay: "rgba(12, 17, 24, 0.85)",
};

export const lightColors: ThemeColors = {
  bg: "#fafafa",
  bgElevated: "#fafafa",
  card: "#fafafa",
  border: "#e4e4e7",
  borderStrong: "#d4d4d8",
  text: "#18181b",
  muted: "#52525b",
  dim: "#71717a",
  accent: "#c2410c",
  accentSoft: "rgba(194, 65, 12, 0.08)",
  accentOn: "#ffffff",
  danger: "#dc2626",
  success: "#16a34a",
  warning: "#ca8a04",
  tabBar: "#fafafa",
  inputBg: "#fafafa",
  surface: "#fafafa",
  surfaceAlt: "#f4f4f5",
  mapOverlay: "rgba(250, 250, 250, 0.9)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  full: 999,
} as const;

export function paletteFor(mode: ThemeMode): ThemeColors {
  return mode === "light" ? lightColors : darkColors;
}
