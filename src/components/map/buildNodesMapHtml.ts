import type { MapcnMarker, MapcnTheme } from "./mapcnTokens";
import {
  DEFAULT_MAP_CENTER,
  MAPCN_STYLES,
  MAPCN_UI,
  MARKER_BORDER,
  MARKER_FILL,
} from "./mapcnTokens";

const MAPLIBRE_VERSION = "5.24.0";

type BuildOptions = {
  theme: MapcnTheme;
  markers: MapcnMarker[];
};

/** HTML embebido con MapLibre (mapcn) — paridad con sentinella-frontend NodesMap + ui/map. */
export function buildNodesMapHtml({ theme, markers }: BuildOptions): string {
  const ui = MAPCN_UI[theme];
  const styleUrl = MAPCN_STYLES[theme];
  const markersJson = JSON.stringify(markers);
  const centerJson = JSON.stringify(DEFAULT_MAP_CENTER);
  const themeJson = JSON.stringify(theme);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: ${theme === "dark" ? "#120d0a" : "#ffffff"}; }
    .maplibregl-popup-content { background: transparent !important; box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; }
    .maplibregl-popup-tip { display: none !important; }
    .mapcn-popup {
      min-width: 140px;
      max-width: 220px;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid ${ui.popupBorder};
      background: ${ui.popupBg};
      color: ${ui.popupText};
      box-shadow: 0 8px 24px rgba(0,0,0,${theme === "dark" ? "0.35" : "0.12"});
    }
    .mapcn-popup-title { font-size: 14px; font-weight: 600; line-height: 1.3; }
    .mapcn-popup-meta { margin-top: 4px; font-size: 12px; color: ${ui.popupMuted}; }
    .mapcn-popup-link { margin-top: 8px; font-size: 12px; font-weight: 600; color: #ff8c42; cursor: pointer; }
    .mapcn-marker {
      width: 16px;
      height: 16px;
      border-radius: 999px;
      border: 2px solid ${MARKER_BORDER};
      background: ${MARKER_FILL};
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      cursor: pointer;
    }
    .mapcn-controls {
      position: absolute;
      bottom: 40px;
      right: 8px;
      z-index: 2;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 6px;
      border: 1px solid ${ui.controlsBorder};
      background: ${ui.controlsBg};
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .mapcn-controls button {
      width: 32px;
      height: 32px;
      border: 0;
      background: transparent;
      color: ${ui.controlsText};
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }
    .mapcn-controls button + button { border-top: 1px solid ${ui.controlsBorder}; }
    .mapcn-controls button:active { background: rgba(255, 140, 66, 0.15); }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="mapcn-controls" aria-label="Controles del mapa">
    <button type="button" id="zoom-in" aria-label="Acercar">+</button>
    <button type="button" id="zoom-out" aria-label="Alejar">−</button>
  </div>
  <script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
  <script>
    (function () {
      var theme = ${themeJson};
      var markers = ${markersJson};
      var center = ${centerJson};
      var styleUrl = ${JSON.stringify(styleUrl)};
      var markerInstances = [];

      function post(payload) {
        var msg = JSON.stringify(payload);
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(msg);
        }
      }

      function sanitize(text) {
        return String(text || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function fitNodes(map, nodes) {
        var withCoords = nodes.filter(function (n) {
          return Number.isFinite(n.latitude) && Number.isFinite(n.longitude);
        });
        if (withCoords.length === 0) {
          map.jumpTo({ center: center, zoom: 13 });
          return;
        }
        if (withCoords.length === 1) {
          var one = withCoords[0];
          map.jumpTo({ center: [one.longitude, one.latitude], zoom: 14 });
          return;
        }
        var lngs = withCoords.map(function (n) { return n.longitude; });
        var lats = withCoords.map(function (n) { return n.latitude; });
        map.fitBounds(
          [[Math.min.apply(null, lngs), Math.min.apply(null, lats)], [Math.max.apply(null, lngs), Math.max.apply(null, lats)]],
          { padding: 60, animate: false }
        );
      }

      function clearMarkers() {
        markerInstances.forEach(function (m) { try { m.remove(); } catch (e) {} });
        markerInstances = [];
      }

      function bindPopup(node, popup) {
        popup.on("open", function () {
          var btn = document.querySelector('[data-node-id="' + node.id + '"]');
          if (btn) {
            btn.onclick = function (ev) {
              ev.preventDefault();
              post({ type: "openNode", nodeId: node.id });
            };
          }
        });
      }

      function renderMarkers(map, nodes) {
        clearMarkers();
        nodes.forEach(function (node) {
          if (!Number.isFinite(node.latitude) || !Number.isFinite(node.longitude)) return;
          var el = document.createElement("div");
          el.className = "mapcn-marker";
          el.title = node.name;

          var popupHtml =
            '<div class="mapcn-popup">' +
              '<div class="mapcn-popup-title">' + sanitize(node.name) + '</div>' +
              (node.status ? '<div class="mapcn-popup-meta">' + sanitize(node.status) + '</div>' : '') +
              '<div class="mapcn-popup-link" data-node-id="' + sanitize(node.id) + '">Ver detalle →</div>' +
            '</div>';

          var popup = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: "240px" })
            .setHTML(popupHtml);

          var marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([node.longitude, node.latitude])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener("click", function () {
            post({ type: "select", nodeId: node.id, name: node.name });
          });

          bindPopup(node, popup);
          markerInstances.push(marker);
        });
      }

      var map = new maplibregl.Map({
        container: "map",
        style: styleUrl,
        center: center,
        zoom: 13,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });

      map.on("load", function () {
        renderMarkers(map, markers);
        fitNodes(map, markers);
        post({ type: "ready" });
      });

      document.getElementById("zoom-in").onclick = function () {
        map.zoomTo(map.getZoom() + 1, { duration: 300 });
      };
      document.getElementById("zoom-out").onclick = function () {
        map.zoomTo(map.getZoom() - 1, { duration: 300 });
      };

      window.__mapcnUpdate = function (raw) {
        try {
          var data = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (data.type !== "update") return;
          markers = data.markers || markers;
          if (data.theme && data.theme !== theme && data.styleUrl) {
            theme = data.theme;
            map.setStyle(data.styleUrl);
            map.once("styledata", function () {
              renderMarkers(map, markers);
              fitNodes(map, markers);
            });
          } else {
            renderMarkers(map, markers);
            fitNodes(map, markers);
          }
        } catch (e) {}
      };

      document.addEventListener("message", function (event) { window.__mapcnUpdate(event.data); });
    })();
  </script>
</body>
</html>`;
}
