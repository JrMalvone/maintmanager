/**
 * Reliability formulas (NBR 5462 / SMRP):
 *  Planned time Tp = elapsed period (capped at now) × shifts × 8h, per active machine
 *  Operating time To = Tp − downtime
 *  Availability = To / Tp × 100
 *  MTBF = To / number of stops (To itself when there were no stops)
 */
export function plannedMinutes(start: Date, end: Date, shifts = 3, now = new Date()): number {
  const effEnd = end > now ? now : end;
  const days = Math.max(0, effEnd.getTime() - start.getTime()) / 86_400_000;
  return days * shifts * 8 * 60;
}

export function reliability(planned: number, downtime: number, stops: number) {
  const operating = Math.max(0, planned - downtime);
  const availability = planned > 0 ? Math.round((operating / planned) * 1000) / 10 : 100;
  const mtbf = Math.round(stops > 0 ? operating / stops : operating);
  return { operating, availability, mtbf };
}
