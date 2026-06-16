/** Chicama Norte — [longitud, latitud] (MapLibre / mapcn) */
export const DEFAULT_MAP_CENTER: [number, number] = [-78.514, -7.921];

/** Mismos estilos base que sentinella-frontend/src/components/ui/map.tsx */
export const MAPCN_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

export const MARKER_BORDER = "#14b8a6";
export const MARKER_FILL = "#0d9488";

export const MAPCN_UI = {
  dark: {
    shellBorder: "rgba(255, 255, 255, 0.1)",
    controlsBg: "#16110e",
    controlsBorder: "rgba(255, 255, 255, 0.12)",
    controlsText: "#e2e8f0",
    popupBg: "#16110e",
    popupText: "#f1f5f9",
    popupMuted: "#94a3b8",
    popupBorder: "rgba(255, 255, 255, 0.12)",
  },
  light: {
    shellBorder: "rgba(15, 23, 42, 0.12)",
    controlsBg: "#ffffff",
    controlsBorder: "rgba(15, 23, 42, 0.12)",
    controlsText: "#1e293b",
    popupBg: "#ffffff",
    popupText: "#0f172a",
    popupMuted: "#64748b",
    popupBorder: "rgba(15, 23, 42, 0.12)",
  },
} as const;

export type MapcnTheme = keyof typeof MAPCN_UI;

export type MapcnMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status?: string;
  sensorType?: string;
};
