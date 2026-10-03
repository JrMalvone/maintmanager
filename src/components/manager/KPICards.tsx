import type { ServiceOrder } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { differenceInMinutes, differenceInHours } from "date-fns";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Users,
  Zap,
  Settings,
  Activity,
  RefreshCw,
} from "lucide-react";
import { AvailabilityGauge } from "./AvailabilityGauge";
import { operatingMinutes } from "@/lib/operatingTime";

interface KPICardsProps {
  orders: ServiceOrder[];
  workLogs: WorkLog[];
  totalPeriodHours: number;
  shiftsByMachine?: Map<string, number>;
}

export function KPICards({ orders, workLogs, totalPeriodHours, shiftsByMachine }: KPICardsProps) {
  const shiftsOf = (o: ServiceOrder) => (o.machine_id && shiftsByMachine?.get(o.machine_id)) || 3;
  const om = (a: string, b: string, o: ServiceOrder) => operatingMinutes(a, b, shiftsOf(o));
  // Qualified orders: closed + machine stopped + valid timestamps (used by MTTR, MTBF, MTTA, Availability, Downtime)
  const qualified = orders.filter(
    (o) => o.status === "closed" && o.is_machine_stopped && o.started_at && o.finished_at
  );
  const closedOrders = orders.filter((o) => o.status === "closed");
  const fmtMin = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

  // MTTR = finished_at − started_at (productive minutes only)
  const totalRepairTime = qualified.reduce((acc, o) => acc + om(o.started_at!, o.finished_at!, o), 0);
  const mttr = qualified.length > 0 ? Math.round(totalRepairTime / qualified.length) : 0;
  const mttrFormatted = fmtMin(mttr);

  // MTTA = started_at − created_at
  const totalResponse = qualified.reduce((acc, o) => acc + om(o.created_at, o.started_at!, o), 0);
  const mtta = qualified.length > 0 ? Math.round(totalResponse / qualified.length) : 0;
  const mttaFormatted = fmtMin(mtta);

  // Man-Hours
  const totalManMinutes = workLogs
    .filter((log) => log.duration_minutes !== null)
    .reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
  const totalManHours = Math.round(totalManMinutes / 60 * 10) / 10;

  // Counts
  const openCount = orders.filter((o) => o.status === "open").length;
  const inProgressCount = orders.filter((o) => o.status === "in_progress").length;
  const closedCount = closedOrders.length;

  // Downtime = finished_at − created_at
  const totalDowntimeMinutes = qualified.reduce((acc, o) => acc + om(o.created_at, o.finished_at!, o), 0);
  const downtimeFormatted = fmtMin(totalDowntimeMinutes);

  // MTBF = average productive interval between end of a stop and creation of the next stop
  const sortedStops = [...qualified].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let intervalSum = 0;
  for (let i = 1; i < sortedStops.length; i++) {
    intervalSum += om(sortedStops[i - 1].finished_at!, sortedStops[i].created_at, sortedStops[i]);
  }
  const mtbfMinutes = sortedStops.length > 1 ? Math.round(intervalSum / (sortedStops.length - 1)) : 0;
  const mtbfFormatted = sortedStops.length > 1 ? fmtMin(mtbfMinutes) : "—";

  // Availability % = MTBF / (MTBF + MTTR) * 100
  void totalPeriodHours;
  const availability = sortedStops.length > 1 && mtbfMinutes + mttr > 0
    ? Math.round((mtbfMinutes / (mtbfMinutes + mttr)) * 1000) / 10
    : 100;

  // Maintenance type split
  const closedAll = orders.filter((o) => o.status === "closed");
  const electronicCount = closedAll.filter((o) => o.maintenance_type === "electronic").length;
  const mechanicalCount = closedAll.filter((o) => o.maintenance_type === "mechanical").length;

  // SAP sync counts
  const sapPendingCount = orders.filter((o) => !o.sap_sync_status || o.sap_sync_status === "Pending").length;
  const sapErrorCount = orders.filter((o) => o.sap_sync_status === "Error").length;

  return (
    <div className="space-y-4">
      {/* Row 1: Core KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* MTTR */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">Média</span>
          </div>
          <p className="kpi-value text-primary">{mttrFormatted}</p>
          <p className="kpi-label">MTTR</p>
        </div>

        {/* MTBF */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-status-closed" />
            <span className="text-xs text-muted-foreground">Média</span>
          </div>
          <p className="kpi-value text-status-closed">{mtbfFormatted}</p>
          <p className="kpi-label">MTBF</p>
        </div>

        {/* MTTA */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-status-progress" />
            <span className="text-xs text-muted-foreground">Média</span>
          </div>
          <p className="kpi-value text-status-progress">{mttaFormatted}</p>
          <p className="kpi-label">MTTA</p>
        </div>

        {/* Downtime */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="kpi-value text-destructive">{downtimeFormatted}</p>
          <p className="kpi-label">Downtime</p>
        </div>

        {/* Man-Hours */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="kpi-value text-primary">{totalManHours}h</p>
          <p className="kpi-label">Homem-Hora</p>
        </div>

        {/* Open + In Progress */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <Wrench className="w-5 h-5 text-status-progress" />
            <span className="text-xs text-muted-foreground">Agora</span>
          </div>
          <p className="kpi-value text-status-open">{openCount} <span className="text-status-progress">/ {inProgressCount}</span></p>
          <p className="kpi-label">Abertas / Em Andamento</p>
        </div>
      </div>

      {/* Row 2: Advanced KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Availability */}
        <div className="kpi-card flex items-center gap-4">
          <AvailabilityGauge percentage={availability} />
          <div>
            <p className="kpi-label">Disponibilidade</p>
            <p className="text-xs text-muted-foreground mt-1">
              MTBF: {mtbfFormatted} • MTTR: {mttrFormatted}
            </p>
          </div>
        </div>

        {/* Closed Count */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-status-closed" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="kpi-value text-status-closed">{closedCount}</p>
          <p className="kpi-label">Fechadas</p>
        </div>

        {/* Maintenance Type Split */}
        <div className="kpi-card">
          <p className="kpi-label mb-3">Tipo de Manutenção</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xl font-bold text-foreground">{electronicCount}</p>
                <p className="text-xs text-muted-foreground">Elétrico</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xl font-bold text-foreground">{mechanicalCount}</p>
                <p className="text-xs text-muted-foreground">Mecânico</p>
              </div>
            </div>
          </div>
        </div>

        {/* SAP Integration Status */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">SAP RPA</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold text-foreground">{sapPendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-xl font-bold text-destructive">{sapErrorCount}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
