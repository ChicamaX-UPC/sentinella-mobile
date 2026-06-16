import { apiJson } from "./client";
import type { PageResponse, Round } from "./types";

export async function fetchRounds(limit = 50): Promise<Round[]> {
  const res = await apiJson<PageResponse<Round>>("rounds", {}, { page: 0, limit });
  return res.content ?? [];
}

export async function fetchRound(roundId: string): Promise<Round> {
  return apiJson<Round>(`rounds/${roundId}`);
}
