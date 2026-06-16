import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

export type PhotoDraftMeta = {
  id: string;
  roundId: string;
  itemId: string;
  uri: string;
  mime: string;
  createdAt: number;
};

export type GeoDraftMeta = {
  roundId: string;
  itemId: string;
  latitude: number;
  longitude: number;
  createdAt: number;
};

const PHOTOS_KEY = "sentinella_photo_drafts";
const GEO_KEY = "sentinella_geo_drafts";
const PHOTO_DIR = `${FileSystem.documentDirectory ?? ""}sentinella-photos/`;

async function ensureDir() {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

async function readDrafts(): Promise<PhotoDraftMeta[]> {
  const raw = await AsyncStorage.getItem(PHOTOS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PhotoDraftMeta[];
  } catch {
    return [];
  }
}

async function writeDrafts(rows: PhotoDraftMeta[]): Promise<void> {
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(rows));
}

export async function savePhotoDraft(
  roundId: string,
  itemId: string,
  sourceUri: string,
  mime: string,
): Promise<void> {
  await ensureDir();
  const id = `${roundId}-${itemId}-${Date.now()}`;
  const dest = `${PHOTO_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  const rows = await readDrafts();
  const filtered = rows.filter(
    (r) => !(r.roundId === roundId && r.itemId === itemId),
  );
  filtered.push({
    id,
    roundId,
    itemId,
    uri: dest,
    mime,
    createdAt: Date.now(),
  });
  await writeDrafts(filtered);
}

export async function getPhotoDraft(
  roundId: string,
  itemId: string,
): Promise<PhotoDraftMeta | null> {
  const rows = await readDrafts();
  return rows.find((r) => r.roundId === roundId && r.itemId === itemId) ?? null;
}

export async function deletePhotoDraftsForItem(
  roundId: string,
  itemId: string,
): Promise<void> {
  const rows = await readDrafts();
  const toDelete = rows.filter(
    (r) => r.roundId === roundId && r.itemId === itemId,
  );
  for (const row of toDelete) {
    await FileSystem.deleteAsync(row.uri, { idempotent: true });
  }
  await writeDrafts(
    rows.filter((r) => !(r.roundId === roundId && r.itemId === itemId)),
  );
}

async function readGeoDrafts(): Promise<GeoDraftMeta[]> {
  const raw = await AsyncStorage.getItem(GEO_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GeoDraftMeta[];
  } catch {
    return [];
  }
}

async function writeGeoDrafts(rows: GeoDraftMeta[]): Promise<void> {
  await AsyncStorage.setItem(GEO_KEY, JSON.stringify(rows));
}

export async function saveGeoDraft(
  roundId: string,
  itemId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  const rows = await readGeoDrafts();
  const filtered = rows.filter(
    (r) => !(r.roundId === roundId && r.itemId === itemId),
  );
  filtered.push({
    roundId,
    itemId,
    latitude,
    longitude,
    createdAt: Date.now(),
  });
  await writeGeoDrafts(filtered);
}

export async function getGeoDraft(
  roundId: string,
  itemId: string,
): Promise<GeoDraftMeta | null> {
  const rows = await readGeoDrafts();
  return rows.find((r) => r.roundId === roundId && r.itemId === itemId) ?? null;
}

export async function deleteGeoDraftForItem(
  roundId: string,
  itemId: string,
): Promise<void> {
  const rows = await readGeoDrafts();
  await writeGeoDrafts(
    rows.filter((r) => !(r.roundId === roundId && r.itemId === itemId)),
  );
}

export async function countPhotoDrafts(): Promise<number> {
  const rows = await readDrafts();
  return rows.length;
}

export async function countMobilePendingTotal(): Promise<number> {
  const { countPendingOutbox } = await import("./outbox");
  const [outbox, photos] = await Promise.all([
    countPendingOutbox(),
    countPhotoDrafts(),
  ]);
  return outbox + photos;
}
