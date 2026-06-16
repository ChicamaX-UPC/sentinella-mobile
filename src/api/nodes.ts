import { apiJson } from "./client";
import type { PageResponse, SensorNode, SensorReading } from "./types";

export async function fetchNode(nodeId: string): Promise<SensorNode> {
  return apiJson<SensorNode>(`nodes/${nodeId}`);
}

export async function fetchNodeReadingsPage(
  nodeId: string,
  page = 0,
  limit = 15,
): Promise<PageResponse<SensorReading>> {
  return apiJson<PageResponse<SensorReading>>(
    `nodes/${nodeId}/readings`,
    {},
    { page, limit },
  );
}

export async function fetchNodes(limit = 100): Promise<SensorNode[]> {
  const res = await apiJson<PageResponse<SensorNode>>("nodes", {}, { page: 0, limit });
  return res.content ?? [];
}

export async function fetchNodeReadings(
  nodeId: string,
  limit = 8,
): Promise<SensorReading[]> {
  const res = await apiJson<PageResponse<SensorReading>>(
    `nodes/${nodeId}/readings`,
    {},
    { page: 0, limit },
  );
  return res.content ?? [];
}

export async function fetchLatestReading(nodeId: string): Promise<SensorReading | null> {
  try {
    return await apiJson<SensorReading>(`nodes/${nodeId}/status`);
  } catch {
    return null;
  }
}

export type NodeStatusBucket = "ok" | "warn" | "crit" | "offline";

export function bucketNodeStatus(status: string | undefined): NodeStatusBucket {
  const u = (status ?? "").toUpperCase();
  if (u.includes("OFFLINE") || u.includes("OFF")) return "offline";
  if (u.includes("CRIT")) return "crit";
  if (u.includes("WARN") || u.includes("HIGH")) return "warn";
  return "ok";
}

export function summarizeNodes(nodes: SensorNode[]) {
  const counts = { ok: 0, warn: 0, crit: 0, offline: 0 };
  for (const n of nodes) {
    counts[bucketNodeStatus(n.status)] += 1;
  }
  return { counts, total: nodes.length };
}

export type NodeMapMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status?: string;
  sensorType?: string;
};

export function toMapMarkers(
  nodes: SensorNode[],
  labelFor: (id: string, fallback: string) => string,
): NodeMapMarker[] {
  const markers: NodeMapMarker[] = [];
  for (const n of nodes) {
    const lat = typeof n.latitude === "number" ? n.latitude : Number(n.latitude);
    const lng = typeof n.longitude === "number" ? n.longitude : Number(n.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    markers.push({
      id: n.id,
      name: labelFor(n.id, n.name),
      latitude: lat,
      longitude: lng,
      status: n.status,
      sensorType: n.sensorType,
    });
  }
  return markers;
}
