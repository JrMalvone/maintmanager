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

interface KPICardsProps {
  orders: ServiceOrder[];
  workLogs: WorkLog[];
  totalPeriodHours: number;
}

export function KPICards({ orders, workLogs, totalPeriodHours }: KPICardsProps) {
  // MTTR
  const closedOrders = orders.filter(
    (o) => o.status === "closed" && o.started_at && o.finished_at
  );
  const totalRepairTime = closedOrders.reduce((acc, order) => {
    return acc + differenceInMinutes(new Date(order.finished_at!), new Date(order.started_at!));
  }, 0);
  const mttr = closedOrders.length > 0 ? Math.round(totalRepairTime / closedOrders.length) : 0;
  const mttrFormatted = mttr < 60 ? `${mttr} min` : `${Math.floor(mttr / 60)}h ${mttr % 60}m`;

  // Man-Hours
  const totalManMinutes = workLogs
    .filter((log) => log.duration_minutes !== null)
    .reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
  const totalManHours = Math.round(totalManMinutes / 60 * 10) / 10;

  // Counts
  const openCount = orders.filter((o) => o.status === "open").length;
  const inProgressCount = orders.filter((o) => o.status === "in_progress").length;
  const closedCount = closedOrders.length;
  const criticalCount = orders.filter(
    (o) => o.priority === "critical" && o.status !== "closed"
  ).length;

  // Total Downtime (hours) - all stopped machines not closed
  const totalDowntimeMinutes = orders
    .filter((o) => o.is_machine_stopped && o.status === "closed" && o.started_at && o.finished_at)
    .reduce((acc, o) => acc + differenceInMinutes(new Date(o.finished_at!), new Date(o.created_at)), 0);
  const totalDowntimeHours = Math.round(totalDowntimeMinutes / 60 * 10) / 10;

  // MTBF = (Total Expected Uptime - Total Downtime) / Number of Orders
  const orderCount = orders.length || 1;
  const mtbfHours = totalPeriodHours > 0
    ? Math.round(((totalPeriodHours - totalDowntimeHours) / orderCount) * 10) / 10
    : 0;

  // Availability %
  const availability = totalPeriodHours > 0
    ? Math.round(((totalPeriodHours - totalDowntimeHours) / totalPeriodHours) * 100)
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
          <p className="kpi-value text-status-closed">{mtbfHours}h</p>
          <p className="kpi-label">MTBF</p>
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

        {/* Open Orders */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-status-open" />
            <span className="text-xs text-muted-foreground">Pendentes</span>
          </div>
          <p className="kpi-value text-status-open">{openCount}</p>
          <p className="kpi-label">Abertas</p>
        </div>

        {/* In Progress */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <Wrench className="w-5 h-5 text-status-progress" />
            <span className="text-xs text-muted-foreground">Agora</span>
          </div>
          <p className="kpi-value text-status-progress">{inProgressCount}</p>
          <p className="kpi-label">Em Andamento</p>
        </div>

        {/* Critical */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-priority-critical" />
            <span className="text-xs text-muted-foreground">Urgente</span>
          </div>
          <p className="kpi-value text-priority-critical">{criticalCount}</p>
          <p className="kpi-label">Críticas</p>
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
              Downtime: {totalDowntimeHours}h / {Math.round(totalPeriodHours)}h
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
