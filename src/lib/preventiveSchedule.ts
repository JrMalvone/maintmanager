import { addDays, format, parseISO } from "date-fns";

export const PERIODICITIES = {
  once: { label: "Única", days: 0 },
  weekly: { label: "Semanal", days: 7 },
  fortnightly: { label: "Quinzenal", days: 15 },
  monthly: { label: "Mensal", days: 30 },
  bimonthly: { label: "Bimestral", days: 60 },
  quarterly: { label: "Trimestral", days: 90 },
  semiannual: { label: "Semestral", days: 180 },
  annual: { label: "Anual", days: 365 },
} as const;
export type Periodicity = keyof typeof PERIODICITIES;
export const dateKey = (date: Date) => format(date, "yyyy-MM-dd");
export function nextPreventiveDate(completedDate: string, periodicity: Periodicity): string | null {
  const days = PERIODICITIES[periodicity].days;
  return days ? dateKey(addDays(parseISO(completedDate), days)) : null;
}
export function isInReleaseWindow(scheduledDate: string, today = dateKey(new Date())) {
  return scheduledDate <= dateKey(addDays(parseISO(today), 7));
}
export function projectPreventiveDates(nextDate: string, periodicity: Periodicity, start: string, end: string): string[] {
  const days = PERIODICITIES[periodicity].days;
  let current = parseISO(nextDate);
  const from = parseISO(start);
  const until = parseISO(end);
  if (days && current < from) {
    const elapsed = Math.floor((Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()) - Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())) / 86400000);
    current = addDays(current, Math.ceil(elapsed / days) * days);
  }
  const dates: string[] = [];
  while (current <= until) {
    if (current >= from) dates.push(dateKey(current));
    if (!days) break;
    current = addDays(current, days);
  }
  return dates;
}