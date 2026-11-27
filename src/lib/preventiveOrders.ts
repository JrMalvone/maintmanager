import { differenceInCalendarDays, parseISO } from "date-fns";
import { dateKey, type Periodicity } from "./preventiveSchedule";

export type PreventiveOrderType = "preventive" | "backlog";
export type PreventiveOrderStatus =
  | "pending_planning"
  | "planned"
  | "in_progress"
  | "completed"
  | "canceled";
export type PreventivePriority = "low" | "medium" | "high" | "critical";
export type PreventiveMaintenanceType =
  | "electronic"
  | "mechanical"
  | "metalwork"
  | "parts_purchase";

export interface PreventiveOrder {
  id: string;
  plan_id?: string | null;
  scheduled_date?: string | null;
  periodicity?: Periodicity | null;
  order_type: PreventiveOrderType;
  status: PreventiveOrderStatus;
  priority: PreventivePriority;
  maintenance_type: PreventiveMaintenanceType;
  machine_id: string | null;
  machine_number: string | null;
  sector_id: string | null;
  title: string;
  description: string;
  materials_needed: string | null;
  estimated_minutes: number | null;
  planned_at: string | null;
  planned_by: string | null;
  opener_name: string;
  opener_registry: string;
  technician_name: string | null;
  technician_registry: string | null;
  solution_description: string | null;
  spare_parts_used: string[] | null;
  started_at: string | null;
  finished_at: string | null;
  sap_sync_status: string;
  sap_notification_number: string | null;
  sap_sync_message: string | null;
  work_center: string | null;
  start_date_sap: string | null;
  start_time_sap: string | null;
  end_date_sap: string | null;
  end_time_sap: string | null;
  apontamentos: unknown[] | null;
  created_at: string;
  updated_at: string;
}

export interface PreventiveWorkLog {
  id: string;
  order_id: string;
  technician_name: string;
  technician_registry: string | null;
  work_center: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export const PREVENTIVE_ORDER_TYPE_LABELS: Record<PreventiveOrderType, string> = {
  preventive: "Preventiva",
  backlog: "Backlog (Melhoria)",
};

export const PREVENTIVE_STATUS_LABELS: Record<PreventiveOrderStatus, string> = {
  pending_planning: "Aguardando Planejamento",
  planned: "Planejada",
  in_progress: "Em Andamento",
  completed: "Concluída",
  canceled: "Cancelada",
};

export const PREVENTIVE_PRIORITY_LABELS: Record<PreventivePriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const PREVENTIVE_PRIORITY_WEIGHT: Record<PreventivePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PREVENTIVE_MAINTENANCE_LABELS: Record<PreventiveMaintenanceType, string> = {
  electronic: "Elétrica",
  mechanical: "Mecânica",
  metalwork: "Serralheria",
  parts_purchase: "Compra de Peças",
};

const WORK_CENTER_SUFFIX: Record<PreventiveMaintenanceType, string> = {
  electronic: "ELT",
  mechanical: "MEC",
  metalwork: "SER",
  parts_purchase: "CMP",
};

export function formatEstimatedMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "Não estipulado";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function parseHoursMinutesToMinutes(hoursInput: string, minutesInput: string): number | null {
  const hStr = hoursInput.trim();
  const mStr = minutesInput.trim();
  if (!hStr && !mStr) return null;
  const h = hStr ? Number(hStr) : 0;
  const m = mStr ? Number(mStr) : 0;
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0 || m >= 60) {
    return -1;
  }
  if (!Number.isInteger(h) || !Number.isInteger(m)) return -1;
  const total = h * 60 + m;
  return total > 0 ? total : -1;
}

/**
 * Stipulating an estimated time on an order awaiting planning automatically moves it to "planned".
 */
export function resolveStatusAfterEstimate(
  currentStatus: PreventiveOrderStatus,
  estimatedMinutes: number | null
): PreventiveOrderStatus {
  if (currentStatus === "pending_planning" && estimatedMinutes !== null && estimatedMinutes > 0) {
    return "planned";
  }
  return currentStatus;
}

/**
 * Preventive/backlog orders are only sent to SAP once completed.
 */
export function resolveSapSyncStatus(
  nextStatus: PreventiveOrderStatus,
  currentSapStatus: string | null | undefined,
  sapNotificationNumber: string | null | undefined
): string {
  if (nextStatus !== "completed") {
    return sapNotificationNumber ? currentSapStatus || "Synced" : "NotApplicable";
  }
  if (sapNotificationNumber) {
    return currentSapStatus || "Synced";
  }
  return "Pending";
}

export interface SectorWorkCenterConfig {
  name?: string | null;
  work_center_electronic?: string | null;
  work_center_mechanical?: string | null;
}

export function resolvePreventiveWorkCenter(
  maintenanceType: PreventiveMaintenanceType,
  sector?: SectorWorkCenterConfig | null,
  staffSpecialty?: string | null
): string {
  const effective =
    staffSpecialty === "electronic" || staffSpecialty === "mechanical"
      ? staffSpecialty
      : maintenanceType;

  if (effective === "electronic" && sector?.work_center_electronic?.trim()) {
    return sector.work_center_electronic.trim();
  }
  if (effective === "mechanical" && sector?.work_center_mechanical?.trim()) {
    return sector.work_center_mechanical.trim();
  }

  const suffix = WORK_CENTER_SUFFIX[maintenanceType];
  const abbrev = sector?.name?.trim().slice(0, 3).toUpperCase();
  return abbrev ? `${abbrev}-${suffix}` : suffix;
}

export interface PreventiveDelayInfo {
  isDateOverdue: boolean;
  daysOverdue: number;
  durationMinutes: number | null;
  isTimeExceeded: boolean;
  overtimeMinutes: number;
  percentOfEstimate: number | null;
}

export function getPreventiveOrderDelayInfo(
  order: Pick<PreventiveOrder, "status" | "scheduled_date" | "estimated_minutes" | "started_at" | "finished_at">,
  now: Date = new Date()
): PreventiveDelayInfo {
  if (order.status === "canceled") {
    return {
      isDateOverdue: false,
      daysOverdue: 0,
      durationMinutes: null,
      isTimeExceeded: false,
      overtimeMinutes: 0,
      percentOfEstimate: null,
    };
  }

  const todayKey = dateKey(now);
  const isDateOverdue = Boolean(
    order.scheduled_date && order.status !== "completed" && order.scheduled_date < todayKey
  );
  const daysOverdue =
    isDateOverdue && order.scheduled_date
      ? Math.max(1, differenceInCalendarDays(parseISO(todayKey), parseISO(order.scheduled_date)))
      : 0;

  let durationMinutes: number | null = null;
  if (order.status === "completed" && order.started_at && order.finished_at) {
    durationMinutes = Math.max(
      1,
      Math.round((new Date(order.finished_at).getTime() - new Date(order.started_at).getTime()) / 60000)
    );
  } else if (order.status === "in_progress" && order.started_at) {
    durationMinutes = Math.max(
      0,
      Math.floor((now.getTime() - new Date(order.started_at).getTime()) / 60000)
    );
  }

  const est = order.estimated_minutes && order.estimated_minutes > 0 ? order.estimated_minutes : null;
  const isTimeExceeded = Boolean(est !== null && durationMinutes !== null && durationMinutes > est);
  const overtimeMinutes = isTimeExceeded && est !== null && durationMinutes !== null ? durationMinutes - est : 0;
  const percentOfEstimate = est !== null && durationMinutes !== null ? Math.round((durationMinutes / est) * 100) : null;

  return {
    isDateOverdue,
    daysOverdue,
    durationMinutes,
    isTimeExceeded,
    overtimeMinutes,
    percentOfEstimate,
  };
}