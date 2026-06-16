import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

import { buildNodesMapHtml } from "@/components/map/buildNodesMapHtml";
import { MAPCN_STYLES, MAPCN_UI, type MapcnMarker } from "@/components/map/mapcnTokens";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

export type NodeMapMarker = MapcnMarker;

export { DEFAULT_MAP_CENTER } from "@/components/map/mapcnTokens";

type Props = {
  markers: NodeMapMarker[];
  height?: number;
};

type WebPayload =
  | { type: "ready" }
  | { type: "select"; nodeId: string; name: string }
  | { type: "openNode"; nodeId: string };

export function NodesMapView({ markers, height = 340 }: Props) {
  const { isDark, type, colors } = useTheme();
  const theme = isDark ? "dark" : "light";
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const html = useMemo(
    () => buildNodesMapHtml({ theme, markers }),
    [theme, markers],
  );

  const shellBorder = MAPCN_UI[theme].shellBorder;

  useEffect(() => {
    setReady(false);
    setSelectedName(null);
  }, [theme]);

  useEffect(() => {
    if (!ready || !webRef.current) return;
    const payload = JSON.stringify({
      type: "update",
      theme,
      styleUrl: MAPCN_STYLES[theme],
      markers,
    });
    webRef.current.injectJavaScript(`window.__mapcnUpdate && window.__mapcnUpdate(${JSON.stringify(payload)}); true;`);
  }, [ready, theme, markers]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as WebPayload;
      if (data.type === "ready") {
        setReady(true);
        return;
      }
      if (data.type === "select") {
        setSelectedName(data.name);
        return;
      }
      if (data.type === "openNode") {
        router.push({
          pathname: "/(main)/sensors/[nodeId]",
          params: { nodeId: data.nodeId },
        });
      }
    } catch {
      /* ignore malformed messages */
    }
  }

  if (markers.length === 0) {
    return (
      <View style={[styles.empty, { height, borderColor: shellBorder }]}>
        <Text style={type.subtitle}>Sin coordenadas GPS en los nodos del tranque.</Text>
        <Text style={type.caption}>Usa la vista lista para revisar telemetría.</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.shell,
        {
          height,
          borderColor: shellBorder,
          backgroundColor: isDark ? "#120d0a" : "#ffffff",
        },
      ]}
    >
      {!ready ? (
        <View style={[styles.loader, { backgroundColor: isDark ? "rgba(7, 10, 15, 0.35)" : "rgba(255,255,255,0.72)" }]}>
          <ActivityIndicator color={colors.accent} />
          <Text style={type.caption}>Cargando mapa…</Text>
        </View>
      ) : null}
      <WebView
        key={theme}
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        style={StyleSheet.absoluteFill}
        /** Tiles Carto (mapcn) requieren acceso a internet, igual que en web. */
        allowsInlineMediaPlayback
      />
      {selectedName ? (
        <View style={[styles.banner, { backgroundColor: colors.mapOverlay }]}>
          <Text style={type.caption}>{selectedName} · toca el popup para abrir detalle</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
  },
  empty: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  banner: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
});
