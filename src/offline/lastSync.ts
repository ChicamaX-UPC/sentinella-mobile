import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sentinella_last_sync_at";

export async function recordLastSync(iso?: string): Promise<void> {
  await AsyncStorage.setItem(KEY, iso ?? new Date().toISOString());
}

export async function loadLastSync(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export function formatLastSync(iso: string | null): string {
  if (!iso) return "Sin sync exitosa aún";
  try {
    return new Date(iso).toLocaleString("es-PE");
  } catch {
    return iso;
  }
}
