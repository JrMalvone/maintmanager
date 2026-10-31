import type { ServiceOrder } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { operatingMinutes } from "@/lib/operatingTime";

export interface MachineMetrics {
  totalOrders: number;
  stops: number; // closed emergency corrective orders (machine stopped)
  mttr: number; // minutes
  mtta: number; // minutes
  mtbf: number | null; // minutes, null when < 2 stops
  availability: number; // %
  downtime: number; // minutes
  manHours: number; // hours
  mechanical: number;
  electronic: number;
  openNow: ServiceOrder | null;
  healthScore: number; // 0–100
  risk: "baixo" | "medio" | "critico";
}

/** Same rules as the main Dashboard: only closed + machine stopped orders count for stop KPIs. */
export function computeMachineMetrics(
  orders: ServiceOrder[],
  workLogs: WorkLog[],
  shifts = 3,
): MachineMetrics {
  const om = (a: string, b: string) => operatingMinutes(a, b, shifts);
  const q = orders
    .filter((o) => o.status === "closed" && o.is_machine_stopped && o.started_at && o.finished_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const repair = q.reduce((s, o) => s + om(o.started_at!, o.finished_at!), 0);
  const resp = q.reduce((s, o) => s + om(o.created_at, o.started_at!), 0);
  const downtime = q.reduce((s, o) => s + om(o.created_at, o.finished_at!), 0);
  const mttr = q.length ? Math.round(repair / q.length) : 0;
  const mtta = q.length ? Math.round(resp / q.length) : 0;

  let gap = 0;
  for (let i = 1; i < q.length; i++) gap += om(q[i - 1].finished_at!, q[i].created_at);
  const mtbf = q.length > 1 ? Math.round(gap / (q.length - 1)) : null;
  const availability =
    mtbf !== null && mtbf + mttr > 0 ? Math.round((mtbf / (mtbf + mttr)) * 1000) / 10 : 100;

  const orderIds = new Set(orders.map((o) => o.id));
  const manMin = workLogs
    .filter((l) => orderIds.has(l.order_id))
    .reduce((s, l) => s + (l.duration_minutes || 0), 0);

  const closed = orders.filter((o) => o.status === "closed");
  const openNow =
    orders.find((o) => o.status !== "closed" && o.is_machine_stopped) ||
    orders.find((o) => o.status !== "closed") ||
    null;

  // Health: availability weighted, penalized by stop count
  const healthScore = Math.max(0, Math.min(100, Math.round(availability - Math.max(0, q.length - 1) * 3)));
  const risk: MachineMetrics["risk"] =
    healthScore < 70 || q.length >= 6 ? "critico" : healthScore < 90 || q.length >= 3 ? "medio" : "baixo";

  return {
    totalOrders: orders.length,
    stops: q.length,
    mttr,
    mtta,
    mtbf,
    availability,
    downtime,
    manHours: Math.round((manMin / 60) * 10) / 10,
    mechanical: closed.filter((o) => o.maintenance_type === "mechanical").length,
    electronic: closed.filter((o) => o.maintenance_type === "electronic").length,
    openNow,
    healthScore,
    risk,
  };
}

export const fmtMin = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);
