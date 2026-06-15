import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiFetch } from "../api/client";
import { resolvePhotoS3KeyForItem } from "../api/upload";
import { deletePhotoDraftsForItem } from "./photos";
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
        if (row.method === "PATCH") {
          const match = /^rounds\/([^/]+)\/items\/([^/]+)$/.exec(row.path);
          if (match) {
            await deletePhotoDraftsForItem(match[1], match[2]);
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
