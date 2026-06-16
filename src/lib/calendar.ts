export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Domingo como inicio de semana (como en la referencia). */
export function startOfWeekSunday(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function addWeeks(d: Date, weeks: number): Date {
  return addDays(d, weeks * 7);
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatMonthYear(d: Date, locale = "es-PE"): string {
  const raw = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatDayLong(d: Date, locale = "es-PE"): string {
  const raw = d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function shortDayLabel(d: Date): string {
  return DAY_LABELS[d.getDay()];
}

export function isoDateKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

export function parseIsoDay(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? startOfDay(new Date(t)) : null;
}

export function dateInRange(iso: string | undefined | null, day: Date): boolean {
  const parsed = parseIsoDay(iso);
  return parsed ? isSameDay(parsed, day) : false;
}
