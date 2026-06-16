import type { Round } from "@/api/types";

export type RoundChecklistProgress = {
  total: number;
  done: number;
  requiredPending: number;
};

export function roundChecklistProgress(round: Round): RoundChecklistProgress {
  const items = round.checklistItems ?? [];
  const total = items.length;
  const done = items.filter((it) => Boolean(it.completedAt)).length;
  const requiredPending = items.filter(
    (it) => it.required !== false && !it.completedAt,
  ).length;
  return { total, done, requiredPending };
}

export function roundStatusTone(
  status: string | undefined,
): "accent" | "success" | "warning" | "neutral" | "danger" {
  const s = (status ?? "").toUpperCase().replace(/-/g, "_");
  if (s === "IN_PROGRESS" || s === "OPEN") return "accent";
  if (s === "COMPLETED") return "warning";
  if (s === "SYNCED") return "success";
  if (s === "PENDING" || s === "SCHEDULED") return "neutral";
  if (s === "CANCELLED") return "danger";
  return "neutral";
}
