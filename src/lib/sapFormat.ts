/**
 * SAP date/time formatting utilities.
 * Converts JS Date objects to SAP plain-text formats.
 */

/** Format a Date to DDMMYY (e.g. 28/03/2026 → "280326") */
export function toSapDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/** Format a Date to HHMM (e.g. 14:02 → "1402") */
export function toSapTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}${mm}`;
}

/**
 * Calculate hours between two dates as a PT-BR decimal string with comma separator.
 * E.g. 18 minutes → "0,3", 90 minutes → "1,5"
 */
export function toSapHours(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  // Round to 1 decimal place, enforce minimum 0.1 for non-zero durations
  let rounded = Math.round(hours * 10) / 10;
  if (rounded === 0 && diffMs > 0) {
    rounded = 0.1;
  }
  return rounded.toString().replace(".", ",");
}

export interface SapApontamento {
  matricula: string;
  data_ini: string;
  hora_ini: string;
  data_fim: string;
  hora_fim: string;
  texto_servico: string;
  horas: string;
}

/**
 * Build an apontamento object from a work log entry.
 */
export function buildApontamento(
  registry: string,
  startedAt: Date,
  endedAt: Date,
  serviceText: string
): SapApontamento {
  return {
    matricula: registry,
    data_ini: toSapDate(startedAt),
    hora_ini: toSapTime(startedAt),
    data_fim: toSapDate(endedAt),
    hora_fim: toSapTime(endedAt),
    texto_servico: serviceText,
    horas: toSapHours(startedAt, endedAt),
  };
}
