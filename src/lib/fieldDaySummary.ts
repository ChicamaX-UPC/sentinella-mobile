import type { FieldKpi, Round } from "@/api/types";
import { dateInRange, formatDayLong, isToday } from "@/lib/calendar";

export type DayKpiSnapshot = {
  activeAlerts: number;
  sensorsOutOfRange: number;
  roundsInProgress: number;
  pendingSyncRounds: number;
  nodesOnline: number;
  nodeTotal: number;
  nodesNeedAttention: number;
  roundsCompleted: number;
  checklistItemsDone: number;
};

export type DaySummary = {
  dayLabel: string;
  isToday: boolean;
  kpi: DayKpiSnapshot;
  roundsScheduled: Round[];
  roundsCompleted: Round[];
  roundsInProgress: Round[];
  incidentNote: string | null;
};

function roundTouchesDay(round: Round, day: Date): boolean {
  return (
    dateInRange(round.scheduledAt, day) ||
    dateInRange(round.startedAt, day) ||
    dateInRange(round.completedAt, day) ||
    dateInRange(round.syncedAt, day)
  );
}

function countChecklistDone(rounds: Round[]): number {
  let n = 0;
  for (const r of rounds) {
    for (const it of r.checklistItems ?? []) {
      if (it.completedAt) n += 1;
    }
  }
  return n;
}

function deriveKpiForPastDay(day: Date, rounds: Round[]): Omit<DayKpiSnapshot, "nodesOnline" | "nodeTotal" | "nodesNeedAttention"> {
  const onDay = rounds.filter((r) => roundTouchesDay(r, day));
  const inProgress = onDay.filter((r) => {
    const s = (r.status ?? "").toUpperCase();
    return s.includes("PROGRESS") || s === "OPEN";
  });
  const pendingSync = onDay.filter((r) => {
    const s = (r.status ?? "").toUpperCase();
    return !r.syncedAt && (s.includes("COMPLETED") || dateInRange(r.completedAt, day));
  });
  const completed = onDay.filter((r) => dateInRange(r.completedAt, day));
  return {
    activeAlerts: 0,
    sensorsOutOfRange: 0,
    roundsInProgress: inProgress.length,
    pendingSyncRounds: pendingSync.length,
    roundsCompleted: completed.length,
    checklistItemsDone: countChecklistDone(onDay),
  };
}

export function buildDaySummary(
  day: Date,
  liveKpi: FieldKpi | null,
  rounds: Round[],
  nodeTotal: number,
  nodesOk: number,
  nodesNeedAttention: number,
): DaySummary {
  const today = isToday(day);
  const onDay = rounds.filter((r) => roundTouchesDay(r, day));

  const roundsScheduled = onDay.filter((r) => dateInRange(r.scheduledAt, day));
  const roundsCompleted = onDay.filter((r) => dateInRange(r.completedAt, day));
  const roundsInProgress = onDay.filter((r) => {
    const s = (r.status ?? "").toUpperCase();
    return (
      (s.includes("PROGRESS") || s === "OPEN") &&
      !dateInRange(r.completedAt, day)
    );
  });

  const derived = deriveKpiForPastDay(day, rounds);

  const kpi: DayKpiSnapshot = today && liveKpi
    ? {
        activeAlerts: liveKpi.activeAlerts ?? 0,
        sensorsOutOfRange: liveKpi.sensorsOutOfRange ?? 0,
        roundsInProgress: liveKpi.roundsInProgress ?? 0,
        pendingSyncRounds: liveKpi.pendingSyncRounds ?? 0,
        nodesOnline: nodesOk,
        nodeTotal,
        nodesNeedAttention,
        roundsCompleted: derived.roundsCompleted,
        checklistItemsDone: derived.checklistItemsDone,
      }
    : {
        ...derived,
        nodesOnline: today ? nodesOk : 0,
        nodeTotal: today ? nodeTotal : 0,
        nodesNeedAttention: today ? nodesNeedAttention : 0,
      };

  let incidentNote: string | null = null;
  if (liveKpi?.lastIncidentAt && dateInRange(liveKpi.lastIncidentAt, day)) {
    incidentNote = new Date(liveKpi.lastIncidentAt).toLocaleString("es-PE");
  }

  return {
    dayLabel: formatDayLong(day),
    isToday: today,
    kpi,
    roundsScheduled,
    roundsCompleted,
    roundsInProgress,
    incidentNote,
  };
}
