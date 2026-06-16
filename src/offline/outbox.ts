import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiFetch } from "../api/client";
import { fetchRound } from "../api/rounds";
import type { ChecklistItem, Round } from "../api/types";
import { resolvePhotoS3KeyForItem } from "../api/upload";
import { deleteGeoDraftForItem, deletePhotoDraftsForItem } from "./photos";
import { recordLastSync } from "./lastSync";

export type OutboxRow = {
  id: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: string;
  createdAt: number;
  status: "queued";
};

const OUTBOX_KEY = "sentinella_outbox";
const ALERTS_CACHE_KEY = "sentinella_alerts_cache";
const ROUND_SNAPSHOT_PREFIX = "sentinella_round_";

async function readOutbox(): Promise<OutboxRow[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxRow[];
  } catch {
    return [];
  }
}

async function writeOutbox(rows: OutboxRow[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(rows));
}

export async function enqueueMutation(
  row: Pick<OutboxRow, "method" | "path" | "body"> & { createdAt?: number },
): Promise<void> {
  const rows = await readOutbox();
  rows.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: row.method,
    path: row.path,
    body: row.body,
    createdAt: row.createdAt ?? Date.now(),
    status: "queued",
  });
  await writeOutbox(rows);
}

export async function countPendingOutbox(): Promise<number> {
  const rows = await readOutbox();
  return rows.filter((r) => r.status === "queued").length;
}

export async function flushMutationOutbox(isOnline: boolean): Promise<void> {
  if (!isOnline) return;

  let rows = await readOutbox();
  const pending = rows
    .filter((r) => r.status === "queued")
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const row of pending) {
    try {
      let body = row.body;
      if (row.method === "PATCH") {
        const match = /^rounds\/([^/]+)\/items\/([^/]+)$/.exec(row.path);
        if (match) {
          body = await resolvePhotoS3KeyForItem(match[1], match[2], body ?? "{}");
        }
      }
      const res = await apiFetch(row.path, {
        method: row.method,
        body,
      });
      if (res.ok || res.status === 204) {
        rows = rows.filter((r) => r.id !== row.id);
        const text = await res.text();
        if (row.method === "PATCH") {
          const match = /^rounds\/([^/]+)\/items\/([^/]+)$/.exec(row.path);
          if (match) {
            await deletePhotoDraftsForItem(match[1], match[2]);
            await deleteGeoDraftForItem(match[1], match[2]);
            if (text) {
              try {
                await persistRoundFromApi(match[1], JSON.parse(text) as Round);
              } catch {
                /* ignore */
              }
            }
          }
        } else if (row.method === "POST" && row.path === "rounds" && text) {
          try {
            const created = JSON.parse(text) as Round;
            if (created?.id) {
              await persistRoundFromApi(created.id, created);
            }
          } catch {
            /* ignore */
          }
        }
        await writeOutbox(rows);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  if (pending.some((p) => !rows.find((r) => r.id === p.id))) {
    await recordLastSync();
  }
}

export async function saveAlertsCache(json: string): Promise<void> {
  await AsyncStorage.setItem(
    ALERTS_CACHE_KEY,
    JSON.stringify({ json, updatedAt: Date.now() }),
  );
}

export async function loadAlertsCache(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(ALERTS_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { json: string };
    return parsed.json;
  } catch {
    return null;
  }
}

export async function saveRoundSnapshot(
  roundId: string,
  json: string,
): Promise<void> {
  await AsyncStorage.setItem(`${ROUND_SNAPSHOT_PREFIX}${roundId}`, json);
}

export async function loadRoundSnapshot(roundId: string): Promise<string | null> {
  return AsyncStorage.getItem(`${ROUND_SNAPSHOT_PREFIX}${roundId}`);
}

function completionFields(item: ChecklistItem): ChecklistItem {
  return {
    ...item,
    completedAt: item.completedAt ?? null,
    observations: item.observations ?? null,
    photoS3Key: item.photoS3Key ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    anomaly: item.anomaly ?? false,
  };
}

/** Combina checklist local (offline) con la respuesta del servidor. */
export function mergeRoundSnapshots(server: Round, local: Round): Round {
  const serverItems = server.checklistItems ?? [];
  const localItems = local.checklistItems ?? [];
  if (serverItems.length === 0 && localItems.length > 0) {
    return { ...server, checklistItems: localItems };
  }

  const localById = new Map(localItems.map((it) => [it.id, it]));
  const items = serverItems.map((serverItem) => {
    const localItem = localById.get(serverItem.id);
    if (!localItem?.completedAt) return serverItem;
    if (!serverItem.completedAt) {
      return completionFields({ ...serverItem, ...localItem });
    }
    return completionFields({ ...localItem, ...serverItem });
  });
  return { ...server, checklistItems: items };
}

export async function persistRoundFromApi(roundId: string, payload: Round): Promise<void> {
  if (!payload?.checklistItems?.length) {
    return;
  }
  const snap = await loadRoundSnapshot(roundId);
  let merged = payload;
  if (snap) {
    try {
      merged = mergeRoundSnapshots(payload, JSON.parse(snap) as Round);
    } catch {
      merged = payload;
    }
  }
  await saveRoundSnapshot(roundId, JSON.stringify(merged));
}

/** Descarga la ronda y fusiona con la caché local (completados offline). */
export async function resolveRound(roundId: string): Promise<Round | null> {
  let local: Round | null = null;
  const snap = await loadRoundSnapshot(roundId);
  if (snap) {
    try {
      local = JSON.parse(snap) as Round;
    } catch {
      local = null;
    }
  }

  try {
    const server = await fetchRound(roundId);
    const merged = local ? mergeRoundSnapshots(server, local) : server;
    await saveRoundSnapshot(roundId, JSON.stringify(merged));
    return merged;
  } catch {
    return local;
  }
}

export async function hasPendingRoundPatches(roundId: string): Promise<boolean> {
  const rows = await readOutbox();
  const prefix = `rounds/${roundId}/items/`;
  return rows.some((r) => r.status === "queued" && r.method === "PATCH" && r.path.startsWith(prefix));
}

export async function enrichRoundsWithSnapshots(rounds: Round[]): Promise<Round[]> {
  return Promise.all(
    rounds.map(async (round) => {
      const snap = await loadRoundSnapshot(round.id);
      if (!snap) return round;
      try {
        const local = JSON.parse(snap) as Round;
        if (!local.checklistItems?.some((it) => it.completedAt)) return round;
        return mergeRoundSnapshots(round, local);
      } catch {
        return round;
      }
    }),
  );
}

export async function flushRoundOutbox(roundId: string, isOnline: boolean): Promise<void> {
  if (!isOnline) return;
  await flushMutationOutbox(true);
  if (await hasPendingRoundPatches(roundId)) return;
  try {
    await resolveRound(roundId);
  } catch {
    /* keep local merge */
  }
}

export type LocalItemCompletion = {
  observations: string;
  anomaly: boolean;
  latitude?: number | null;
  longitude?: number | null;
  photoS3Key?: string | null;
};

/** Marca un ítem como completado en la caché local (offline o hasta refrescar del servidor). */
export async function applyLocalItemCompletion(
  roundId: string,
  itemId: string,
  patch: LocalItemCompletion,
): Promise<void> {
  const snap = await loadRoundSnapshot(roundId);
  if (!snap) return;
  try {
    const round = JSON.parse(snap) as Round;
    const items = round.checklistItems ?? [];
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    const current = items[idx];
    items[idx] = {
      ...current,
      observations: patch.observations,
      anomaly: patch.anomaly,
      latitude: patch.latitude ?? current.latitude ?? null,
      longitude: patch.longitude ?? current.longitude ?? null,
      photoS3Key: patch.photoS3Key ?? current.photoS3Key ?? null,
      completedAt: new Date().toISOString(),
    };
    round.checklistItems = items;
    await saveRoundSnapshot(roundId, JSON.stringify(round));
  } catch {
    /* ignore corrupt snapshot */
  }
}
