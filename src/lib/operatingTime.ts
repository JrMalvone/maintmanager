// Productive-time calculation: counts only minutes inside the sector's shift windows,
// on weekdays (Mon–Fri), excluding Brazilian national holidays.

function easter(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const holidayCache = new Map<number, Set<string>>();
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function holidays(year: number): Set<string> {
  let set = holidayCache.get(year);
  if (set) return set;
  set = new Set<string>();
  [[0, 1], [3, 21], [4, 1], [8, 7], [9, 12], [10, 2], [10, 15], [10, 20], [11, 25]].forEach(
    ([m, d]) => set!.add(key(new Date(year, m, d))));
  const e = easter(year);
  [-48, -47, -2, 60].forEach((off) => { // Carnaval (seg/ter), Sexta Santa, Corpus Christi
    const d = new Date(e); d.setDate(e.getDate() + off); set!.add(key(d));
  });
  holidayCache.set(year, set);
  return set;
}

export function isWorkingDay(d: Date): boolean {
  const wd = d.getDay();
  return wd !== 0 && wd !== 6 && !holidays(d.getFullYear()).has(key(d));
}

function windows(shifts: number): [number, number][] {
  if (shifts >= 3) return [[0, 24]];
  if (shifts === 2) return [[6, 22]];
  return [[6, 14]];
}

export function operatingMinutes(startIso: string | Date, endIso: string | Date, shifts = 3): number {
  const start = new Date(startIso), end = new Date(endIso);
  if (!(end > start)) return 0;
  let total = 0;
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (day < end) {
    if (isWorkingDay(day)) {
      for (const [h1, h2] of windows(shifts)) {
        const ws = new Date(day); ws.setHours(h1, 0, 0, 0);
        const we = new Date(day); we.setHours(h2, 0, 0, 0);
        const s = Math.max(ws.getTime(), start.getTime());
        const e = Math.min(we.getTime(), end.getTime());
        if (e > s) total += (e - s) / 60000;
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return Math.round(total);
}
